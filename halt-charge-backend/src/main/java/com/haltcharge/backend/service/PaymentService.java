package com.haltcharge.backend.service;

import com.haltcharge.backend.dto.*;
import com.haltcharge.backend.entity.PaymentSession;
import com.haltcharge.backend.entity.WebhookEvent;
import com.haltcharge.backend.exception.PaymentException;
import com.haltcharge.backend.exception.SessionNotFoundException;
import com.haltcharge.backend.repository.PaymentSessionRepository;
import com.haltcharge.backend.repository.WebhookEventRepository;
import com.razorpay.Order;
import com.razorpay.Payment;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentSessionRepository sessionRepo;
    private final WebhookEventRepository webhookRepo;
    private final RazorpayClient razorpayClient;
    private final QrCodeService qrCodeService;

    // Not injected by constructor — initialized directly
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.razorpay.key-id}")
    private String razorpayKeyId;

    @Value("${app.razorpay.key-secret}")
    private String razorpayKeySecret;

    @Value("${app.razorpay.webhook-secret}")
    private String webhookSecret;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    // ── Admin: Create Session ──────────────────────────────────────

    @Transactional
    public PaymentSessionResponse createSession(CreateSessionRequest req) {
        BigDecimal additionalFees = req.additionalFees() != null ? req.additionalFees() : BigDecimal.ZERO;
        BigDecimal discount       = req.discount() != null ? req.discount() : BigDecimal.ZERO;

        BigDecimal finalAmount = req.baseAmount()
            .add(req.taxAmount())
            .add(additionalFees)
            .subtract(discount)
            .setScale(2, RoundingMode.HALF_UP);

        if (finalAmount.compareTo(BigDecimal.ONE) < 0) {
            throw new PaymentException("Final amount must be at least ₹1.00");
        }

        String token = generateSecureToken();

        // Build customer payment URL
        String paymentUrl = frontendBaseUrl + "/pages/payment.html?token=" + token;

        // Generate QR code
        String qrCodeDataUri = qrCodeService.generateQrCodeDataUri(paymentUrl);

        PaymentSession session = PaymentSession.builder()
            .token(token)
            .stationName(req.stationName())
            .chargerId(req.chargerId())
            .baseAmount(req.baseAmount())
            .taxAmount(req.taxAmount())
            .additionalFees(additionalFees)
            .discount(discount)
            .finalAmount(finalAmount)
            .status(PaymentSession.PaymentStatus.CREATED)
            .paymentUrl(paymentUrl)
            .qrCodeUrl(qrCodeDataUri)
            .createdAt(LocalDateTime.now())
            .expiresAt(LocalDateTime.now().plusMinutes(30))
            .build();

        session = sessionRepo.save(session);
        log.info("Created payment session: token={}, amount={}", token, finalAmount);
        return PaymentSessionResponse.from(session);
    }

    // ── Customer: Get Session Info (by token) ─────────────────────

    @Transactional(readOnly = true)
    public PaymentSessionResponse getSessionByToken(String token) {
        PaymentSession session = findActiveSession(token);
        return PaymentSessionResponse.from(session);
    }

    // ── Customer: Create Razorpay Order ───────────────────────────

    @Transactional
    public RazorpayOrderResponse createRazorpayOrder(String token) {
        PaymentSession session = findActiveSession(token);

        if (session.getStatus() == PaymentSession.PaymentStatus.PAID) {
            throw new PaymentException("This session has already been paid.");
        }

        try {
            // Convert INR to paise (multiply by 100)
            long amountPaise = session.getFinalAmount()
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .longValue();

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put("receipt", "HC-" + session.getToken().substring(0, 8));
            orderRequest.put("notes", new JSONObject()
                .put("station", session.getStationName())
                .put("charger", session.getChargerId())
                .put("token", session.getToken())
            );

            Order order = razorpayClient.orders.create(orderRequest);
            String orderId = order.get("id");

            // Update session with Razorpay order ID and mark PENDING
            session.setRazorpayOrderId(orderId);
            session.setStatus(PaymentSession.PaymentStatus.PENDING);
            sessionRepo.save(session);

            log.info("Created Razorpay order: {} for session token: {}", orderId, token);

            return new RazorpayOrderResponse(
                orderId,
                razorpayKeyId,          // Only public key returned, never secret
                session.getFinalAmount(),
                "INR",
                session.getStationName(),
                session.getChargerId(),
                session.getToken()
            );

        } catch (RazorpayException e) {
            log.error("Razorpay order creation failed for token: {}", token, e);
            throw new PaymentException("Could not create payment order. Please try again.");
        }
    }

    // ── Customer: Verify Payment ──────────────────────────────────

    @Transactional
    public PaymentResultResponse verifyPayment(PaymentVerifyRequest req) {
        PaymentSession session = sessionRepo.findByToken(req.token())
            .orElseThrow(() -> new SessionNotFoundException("Session not found"));

        // Prevent duplicate processing
        if (session.getStatus() == PaymentSession.PaymentStatus.PAID) {
            log.info("Duplicate payment verification attempt for token: {}", req.token());
            return buildSuccessResult(session);
        }

        // Verify the Razorpay order ID matches
        if (!req.razorpayOrderId().equals(session.getRazorpayOrderId())) {
            log.warn("Order ID mismatch for token: {}", req.token());
            throw new PaymentException("Invalid payment order reference.");
        }

        // Verify signature on the backend
        boolean signatureValid = verifyRazorpaySignature(
            req.razorpayOrderId(),
            req.razorpayPaymentId(),
            req.razorpaySignature()
        );

        if (!signatureValid) {
            session.setStatus(PaymentSession.PaymentStatus.FAILED);
            sessionRepo.save(session);
            log.warn("Invalid Razorpay signature for token: {}", req.token());
            throw new PaymentException("Payment signature verification failed. Payment not confirmed.");
        }

        // Optionally fetch and verify actual payment status from Razorpay
        try {
            Payment payment = razorpayClient.payments.fetch(req.razorpayPaymentId());
            String paymentStatus = payment.get("status");
            if (!"captured".equals(paymentStatus) && !"authorized".equals(paymentStatus)) {
                session.setStatus(PaymentSession.PaymentStatus.FAILED);
                sessionRepo.save(session);
                throw new PaymentException("Payment not captured. Status: " + paymentStatus);
            }
        } catch (RazorpayException e) {
            log.warn("Could not fetch payment status from Razorpay: {}", e.getMessage());
            // Proceed based on signature verification if API call fails
        }

        // Mark as PAID
        session.setStatus(PaymentSession.PaymentStatus.PAID);
        session.setRazorpayPaymentId(req.razorpayPaymentId());
        session.setRazorpaySignature(req.razorpaySignature());
        session.setPaidAt(LocalDateTime.now());
        sessionRepo.save(session);

        log.info("Payment successful for token: {}, paymentId: {}", req.token(), req.razorpayPaymentId());
        return buildSuccessResult(session);
    }

    // ── Razorpay Webhook ──────────────────────────────────────────

    @Transactional
    public void handleWebhook(String payload, String signature) {
        // Verify webhook signature
        try {
            boolean valid = Utils.verifyWebhookSignature(payload, signature, webhookSecret);
            if (!valid) {
                log.warn("Invalid webhook signature received");
                throw new PaymentException("Invalid webhook signature");
            }
        } catch (RazorpayException e) {
            log.error("Webhook signature verification error", e);
            throw new PaymentException("Webhook verification failed");
        }

        JSONObject event = new JSONObject(payload);
        String eventId   = event.optString("id");
        String eventType = event.optString("event");

        // Idempotency — skip already-processed events
        if (webhookRepo.existsByEventId(eventId)) {
            log.info("Duplicate webhook event skipped: {}", eventId);
            return;
        }

        // Save event for deduplication
        webhookRepo.save(WebhookEvent.builder()
            .eventId(eventId)
            .eventType(eventType)
            .payload(payload)
            .build());

        log.info("Processing webhook event: {} ({})", eventType, eventId);

        switch (eventType) {
            case "payment.captured" -> handlePaymentCaptured(event);
            case "payment.failed"   -> handlePaymentFailed(event);
            default -> log.debug("Unhandled webhook event type: {}", eventType);
        }
    }

    // ── Admin: List Recent Sessions ───────────────────────────────

    @Transactional(readOnly = true)
    public List<PaymentSessionResponse> getRecentSessions() {
        return sessionRepo.findRecentSessions()
            .stream()
            .map(PaymentSessionResponse::from)
            .collect(Collectors.toList());
    }

    // ── Invoice Access ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PaymentSession getSessionForInvoice(String token) {
        PaymentSession session = sessionRepo.findByToken(token)
            .orElseThrow(() -> new SessionNotFoundException("Session not found"));

        if (session.getStatus() != PaymentSession.PaymentStatus.PAID) {
            throw new PaymentException("Invoice is only available for completed payments.");
        }
        return session;
    }

    // ── Private Helpers ───────────────────────────────────────────

    private PaymentSession findActiveSession(String token) {
        PaymentSession session = sessionRepo.findByToken(token)
            .orElseThrow(() -> new SessionNotFoundException("Payment session not found for token: " + token));

        if (session.isExpired() && session.getStatus() != PaymentSession.PaymentStatus.PAID) {
            session.setStatus(PaymentSession.PaymentStatus.EXPIRED);
            sessionRepo.save(session);
            throw new PaymentException("This payment session has expired.");
        }
        return session;
    }

    private boolean verifyRazorpaySignature(String orderId, String paymentId, String signature) {
        try {
            return Utils.verifyPaymentSignature(
                new JSONObject()
                    .put("razorpay_order_id", orderId)
                    .put("razorpay_payment_id", paymentId)
                    .put("razorpay_signature", signature),
                razorpayKeySecret
            );
        } catch (RazorpayException e) {
            log.error("Signature verification error", e);
            return false;
        }
    }

    private void handlePaymentCaptured(JSONObject event) {
        try {
            JSONObject paymentEntity = event.getJSONObject("payload")
                .getJSONObject("payment").getJSONObject("entity");

            String paymentId = paymentEntity.optString("id");
            String orderId   = paymentEntity.optString("order_id");

            sessionRepo.findByRazorpayOrderId(orderId).ifPresent(session -> {
                if (session.getStatus() != PaymentSession.PaymentStatus.PAID) {
                    session.setStatus(PaymentSession.PaymentStatus.PAID);
                    session.setRazorpayPaymentId(paymentId);
                    session.setPaidAt(LocalDateTime.now());
                    sessionRepo.save(session);
                    log.info("Webhook: marked session PAID via payment.captured. orderId={}", orderId);
                }
            });
        } catch (Exception e) {
            log.error("Error processing payment.captured webhook", e);
        }
    }

    private void handlePaymentFailed(JSONObject event) {
        try {
            JSONObject paymentEntity = event.getJSONObject("payload")
                .getJSONObject("payment").getJSONObject("entity");
            String orderId = paymentEntity.optString("order_id");

            sessionRepo.findByRazorpayOrderId(orderId).ifPresent(session -> {
                if (session.getStatus() == PaymentSession.PaymentStatus.PENDING) {
                    session.setStatus(PaymentSession.PaymentStatus.FAILED);
                    sessionRepo.save(session);
                    log.info("Webhook: marked session FAILED via payment.failed. orderId={}", orderId);
                }
            });
        } catch (Exception e) {
            log.error("Error processing payment.failed webhook", e);
        }
    }

    private PaymentResultResponse buildSuccessResult(PaymentSession session) {
        String invoiceUrl = frontendBaseUrl.isBlank()
            ? "/api/payment/invoice/" + session.getToken()
            : frontendBaseUrl + "/api/payment/invoice/" + session.getToken();
        return new PaymentResultResponse(
            true,
            "PAID",
            session.getToken(),
            session.getRazorpayPaymentId(),
            session.getFinalAmount(),
            session.getStationName(),
            session.getChargerId(),
            "/api/payment/invoice/" + session.getToken(),
            session.getPaidAt()
        );
    }

    private String generateSecureToken() {
        byte[] tokenBytes = new byte[24];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }
}
