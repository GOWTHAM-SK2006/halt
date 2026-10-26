package com.haltcharge.payment.service;

import com.haltcharge.payment.dto.PaymentDtos.*;
import com.haltcharge.payment.model.*;
import com.haltcharge.payment.repository.*;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicLong;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentSessionRepository paymentSessionRepository;
    private final PaymentRepository paymentRepository;
    private final InvoiceRepository invoiceRepository;
    private final RazorpayClient razorpayClient;

    @Value("${razorpay.key-id}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook-secret:}")
    private String razorpayWebhookSecret;

    @Value("${haltcharge.support-email}")
    private String supportEmail;

    @Value("${haltcharge.support-phone}")
    private String supportPhone;

    @Value("${haltcharge.invoice-prefix:HC-INV}")
    private String invoicePrefix;

    private final AtomicLong invoiceCounter = new AtomicLong(1000);

    // ─── GET /api/payment-sessions/{token} ──────────────────────────────────

    @Transactional(readOnly = true)
    public PaymentSessionDto getPaymentSession(String token) {
        PaymentSession ps = paymentSessionRepository.findByTokenWithDetails(token)
            .orElseThrow(() -> new IllegalArgumentException("Invalid or not found: " + token));

        if (ps.isExpired() && ps.getStatus() == PaymentSession.PaymentSessionStatus.PENDING) {
            // Mark expired (best-effort, not transactional here — use separate endpoint if needed)
            throw new SessionExpiredException("Payment session has expired");
        }

        ChargingSession cs = ps.getChargingSession();
        ChargingStation station = cs.getStation();

        StationInfoDto stationDto = new StationInfoDto(
            station.getStationName(),
            station.getLocation(),
            station.getChargerId(),
            cs.getSessionDate().toString(),
            formatTime(cs.getStartTime()),
            formatTime(cs.getEndTime()),
            station.getConnectorType()
        );

        BillingBreakdownDto billingDto = new BillingBreakdownDto(
            cs.getEnergyConsumedKwh(),
            cs.getTariffPerKwh(),
            cs.getEnergyCharge(),
            cs.getGstRate(),
            cs.getGstAmount(),
            cs.getServiceFee(),
            cs.getDiscount(),
            cs.getTotalAmount(),
            cs.getCurrency()
        );

        return new PaymentSessionDto(
            ps.getToken(),
            cs.getSessionId(),
            ps.getStatus().name(),
            stationDto,
            billingDto,
            cs.getCustomerName(),
            cs.getCustomerPhone()
        );
    }

    // ─── POST /api/payments/create-order ────────────────────────────────────

    @Transactional
    public CreateOrderResponse createOrder(String sessionToken) {
        PaymentSession ps = paymentSessionRepository.findByTokenWithDetails(sessionToken)
            .orElseThrow(() -> new IllegalArgumentException("Invalid session token"));

        if (ps.isExpired()) throw new SessionExpiredException("Session expired");
        if (ps.getStatus() == PaymentSession.PaymentSessionStatus.PAID) {
            throw new IllegalStateException("Session already paid");
        }

        ChargingSession cs = ps.getChargingSession();
        long amountPaise = cs.getTotalAmount()
            .multiply(BigDecimal.valueOf(100))
            .setScale(0, RoundingMode.HALF_UP)
            .longValue();

        // Idempotency: check if an order already exists for this session (CREATED state)
        // If so, reuse it — don't create duplicates
        // (In production, store the Razorpay order ID on PaymentSession)

        try {
            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", cs.getCurrency());
            orderRequest.put("receipt", cs.getSessionId());
            orderRequest.put("payment_capture", 1);

            com.razorpay.Order rzpOrder = razorpayClient.orders.create(orderRequest);
            String rzpOrderId = rzpOrder.get("id");

            // Persist the payment record (CREATED state)
            Payment payment = Payment.builder()
                .paymentSession(ps)
                .razorpayOrderId(rzpOrderId)
                .amountPaise(amountPaise)
                .currency(cs.getCurrency())
                .status(Payment.PaymentStatus.CREATED)
                .build();
            paymentRepository.save(payment);

            log.info("Created Razorpay order {} for session {}", rzpOrderId, cs.getSessionId());

            return new CreateOrderResponse(rzpOrderId, amountPaise, cs.getCurrency(), razorpayKeyId);
        } catch (Exception e) {
            log.error("Failed to create Razorpay order for session {}: {}", cs.getSessionId(), e.getMessage());
            throw new RuntimeException("Failed to create payment order: " + e.getMessage(), e);
        }
    }

    // ─── POST /api/payments/verify ──────────────────────────────────────────

    @Transactional
    public PaymentResultDto verifyPayment(VerifyPaymentRequest req) {
        // 1. Fetch session
        PaymentSession ps = paymentSessionRepository.findByToken(req.sessionToken())
            .orElseThrow(() -> new IllegalArgumentException("Invalid session token"));

        // 2. Idempotency: already paid?
        if (ps.getStatus() == PaymentSession.PaymentSessionStatus.PAID) {
            Invoice existingInvoice = invoiceRepository
                .findByChargingSessionId(ps.getChargingSession().getId())
                .orElse(null);

            ChargingSession cs = ps.getChargingSession();
            return new PaymentResultDto(
                true,
                existingInvoice != null ? existingInvoice.getId().toString() : null,
                req.orderId(),
                req.paymentId(),
                cs.getTotalAmount(),
                OffsetDateTime.now().toString(),
                null,
                "Already paid"
            );
        }

        // 3. Verify Razorpay signature
        try {
            String data = req.orderId() + "|" + req.paymentId();
            boolean isValid = Utils.verifySignature(data, req.signature(), razorpayKeySecret);
            if (!isValid) {
                log.warn("Invalid Razorpay signature for order {}", req.orderId());
                return new PaymentResultDto(false, null, null, null, null, null, null, "Payment verification failed");
            }
        } catch (Exception e) {
            log.error("Signature verification error: {}", e.getMessage());
            return new PaymentResultDto(false, null, null, null, null, null, null, "Signature verification error");
        }

        // 4. Update payment record
        Payment payment = paymentRepository.findByRazorpayOrderId(req.orderId())
            .orElseThrow(() -> new IllegalStateException("Payment record not found for order: " + req.orderId()));

        payment.setRazorpayPaymentId(req.paymentId());
        payment.setRazorpaySignature(req.signature());
        payment.setStatus(Payment.PaymentStatus.CAPTURED);
        payment.setPaidAt(OffsetDateTime.now());
        paymentRepository.save(payment);

        // 5. Mark sessions as paid
        ps.setStatus(PaymentSession.PaymentSessionStatus.PAID);
        paymentSessionRepository.save(ps);

        ps.getChargingSession().setStatus(ChargingSession.SessionStatus.PAID);

        // 6. Generate invoice
        Invoice invoice = generateInvoice(payment, ps.getChargingSession());

        log.info("Payment {} verified and invoice {} created for session {}",
            req.paymentId(), invoice.getInvoiceNumber(), ps.getChargingSession().getSessionId());

        ChargingSession cs = ps.getChargingSession();
        return new PaymentResultDto(
            true,
            invoice.getId().toString(),
            req.orderId(),
            req.paymentId(),
            cs.getTotalAmount(),
            payment.getPaidAt().toString(),
            payment.getPaymentMethod(),
            "Payment successful"
        );
    }

    // ─── POST /api/payments/webhook ─────────────────────────────────────────

    @Transactional
    public void handleWebhook(String payload, String signature) {
        // Verify webhook signature
        if (signature != null && !razorpayWebhookSecret.isBlank()) {
            try {
                boolean valid = Utils.verifyWebhookSignature(payload, signature, razorpayWebhookSecret);
                if (!valid) {
                    log.warn("Webhook rejected — invalid signature");
                    throw new SecurityException("Invalid webhook signature");
                }
            } catch (SecurityException e) {
                throw e;
            } catch (Exception e) {
                log.warn("Webhook signature verification error: {}", e.getMessage());
                throw new SecurityException("Webhook signature error");
            }
        }
        log.info("Webhook received: {}", payload.substring(0, Math.min(payload.length(), 200)));

        // Parse event and handle
        JSONObject event = new JSONObject(payload);
        String eventType = event.optString("event");
        
        if ("payment.captured".equals(eventType)) {
            JSONObject paymentEntity = event
                .optJSONObject("payload")
                .optJSONObject("payment")
                .optJSONObject("entity");

            if (paymentEntity != null) {
                String orderId = paymentEntity.optString("order_id");
                String paymentId = paymentEntity.optString("id");
                String method = paymentEntity.optString("method");

                paymentRepository.findByRazorpayOrderId(orderId).ifPresent(pmt -> {
                    if (pmt.getStatus() != Payment.PaymentStatus.CAPTURED) {
                        pmt.setRazorpayPaymentId(paymentId);
                        pmt.setStatus(Payment.PaymentStatus.CAPTURED);
                        pmt.setPaymentMethod(method);
                        pmt.setPaidAt(OffsetDateTime.now());
                        paymentRepository.save(pmt);

                        PaymentSession ps = pmt.getPaymentSession();
                        ps.setStatus(PaymentSession.PaymentSessionStatus.PAID);
                        paymentSessionRepository.save(ps);

                        if (!invoiceRepository.existsByChargingSessionId(ps.getChargingSession().getId())) {
                            generateInvoice(pmt, ps.getChargingSession());
                        }

                        log.info("Webhook: payment {} captured for order {}", paymentId, orderId);
                    }
                });
            }
        } else if ("payment.failed".equals(eventType)) {
            JSONObject paymentEntity = event
                .optJSONObject("payload")
                .optJSONObject("payment")
                .optJSONObject("entity");
            if (paymentEntity != null) {
                String orderId = paymentEntity.optString("order_id");
                paymentRepository.findByRazorpayOrderId(orderId).ifPresent(pmt -> {
                    pmt.setStatus(Payment.PaymentStatus.FAILED);
                    paymentRepository.save(pmt);
                    log.info("Webhook: payment failed for order {}", orderId);
                });
            }
        }
    }

    // ─── GET /api/invoices/{invoiceId} ──────────────────────────────────────

    @Transactional(readOnly = true)
    public InvoiceDto getInvoice(String invoiceId) {
        UUID id = UUID.fromString(invoiceId);
        Invoice invoice = invoiceRepository.findByIdWithDetails(id)
            .orElseThrow(() -> new IllegalArgumentException("Invoice not found: " + invoiceId));

        ChargingSession cs = invoice.getChargingSession();
        ChargingStation station = cs.getStation();
        Payment pmt = invoice.getPayment();

        StationInfoDto stationDto = new StationInfoDto(
            station.getStationName(),
            station.getLocation(),
            station.getChargerId(),
            cs.getSessionDate().toString(),
            formatTime(cs.getStartTime()),
            formatTime(cs.getEndTime()),
            station.getConnectorType()
        );

        BillingBreakdownDto billingDto = new BillingBreakdownDto(
            cs.getEnergyConsumedKwh(),
            cs.getTariffPerKwh(),
            cs.getEnergyCharge(),
            cs.getGstRate(),
            cs.getGstAmount(),
            cs.getServiceFee(),
            cs.getDiscount(),
            cs.getTotalAmount(),
            cs.getCurrency()
        );

        return new InvoiceDto(
            invoice.getId().toString(),
            invoice.getInvoiceNumber(),
            pmt.getRazorpayOrderId(),
            pmt.getRazorpayPaymentId(),
            cs.getSessionId(),
            stationDto,
            billingDto,
            pmt.getPaidAt() != null ? pmt.getPaidAt().toString() : null,
            pmt.getPaymentMethod(),
            cs.getCustomerName(),
            supportEmail,
            supportPhone
        );
    }

    // ─── Private helpers ─────────────────────────────────────────────────────

    private Invoice generateInvoice(Payment payment, ChargingSession cs) {
        String invoiceNumber = invoicePrefix + "-" + Year.now().getValue() + "-" +
            String.format("%05d", invoiceCounter.getAndIncrement());

        Invoice invoice = Invoice.builder()
            .invoiceNumber(invoiceNumber)
            .payment(payment)
            .chargingSession(cs)
            .build();
        return invoiceRepository.save(invoice);
    }

    private String formatTime(OffsetDateTime odt) {
        if (odt == null) return null;
        return odt.atZoneSameInstant(ZoneId.of("Asia/Kolkata"))
            .format(DateTimeFormatter.ofPattern("HH:mm"));
    }

    // ─── Custom exceptions ───────────────────────────────────────────────────

    public static class SessionExpiredException extends RuntimeException {
        public SessionExpiredException(String message) { super(message); }
    }
}
