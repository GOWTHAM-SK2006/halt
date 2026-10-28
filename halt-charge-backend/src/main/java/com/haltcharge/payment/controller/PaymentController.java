package com.haltcharge.payment.controller;

import com.haltcharge.payment.dto.PaymentDtos.*;
import com.haltcharge.payment.service.PaymentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;

    // ─── GET /api/payment-sessions/{token} ──────────────────────────────────
    @GetMapping("/payment-sessions/{token}")
    public ResponseEntity<?> getPaymentSession(@PathVariable String token) {
        try {
            PaymentSessionDto dto = paymentService.getPaymentSession(token);
            return ResponseEntity.ok(dto);
        } catch (PaymentService.SessionExpiredException e) {
            return ResponseEntity.status(HttpStatus.GONE)
                .body(new ErrorResponse("SESSION_EXPIRED", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("SESSION_NOT_FOUND", "Payment session not found"));
        } catch (Exception e) {
            log.error("Error fetching payment session {}: {}", token, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "Could not load session"));
        }
    }

    // ─── POST /api/payments/create-order ────────────────────────────────────
    @PostMapping("/payments/create-order")
    public ResponseEntity<?> createOrder(@RequestBody CreateOrderRequest request) {
        try {
            CreateOrderResponse response = paymentService.createOrder(request.sessionToken());
            return ResponseEntity.ok(response);
        } catch (PaymentService.SessionExpiredException e) {
            return ResponseEntity.status(HttpStatus.GONE)
                .body(new ErrorResponse("SESSION_EXPIRED", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(new ErrorResponse("ALREADY_PAID", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", e.getMessage()));
        } catch (Exception e) {
            log.error("Error creating payment order: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("ORDER_CREATION_FAILED", "Could not create payment order"));
        }
    }

    // ─── POST /api/payments/verify ──────────────────────────────────────────
    @PostMapping("/payments/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody VerifyPaymentRequest request) {
        try {
            PaymentResultDto result = paymentService.verifyPayment(request);
            if (result.success()) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.PAYMENT_REQUIRED).body(result);
            }
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("NOT_FOUND", e.getMessage()));
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse("SIGNATURE_INVALID", "Payment signature verification failed"));
        } catch (Exception e) {
            log.error("Error verifying payment: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("VERIFICATION_ERROR", "Payment verification failed"));
        }
    }

    // ─── POST /api/payments/webhook ─────────────────────────────────────────
    @PostMapping("/payments/webhook")
    public ResponseEntity<Void> handleWebhook(
        @RequestBody String payload,
        @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature
    ) {
        try {
            paymentService.handleWebhook(payload, signature);
            return ResponseEntity.ok().build();
        } catch (SecurityException e) {
            log.warn("Webhook rejected — invalid signature");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        } catch (Exception e) {
            log.error("Webhook processing error: {}", e.getMessage());
            // Return 200 to avoid Razorpay retries for non-recoverable errors
            return ResponseEntity.ok().build();
        }
    }

    // ─── GET /api/invoices/{invoiceId} ──────────────────────────────────────
    @GetMapping("/invoices/{invoiceId}")
    public ResponseEntity<?> getInvoice(@PathVariable String invoiceId) {
        try {
            InvoiceDto dto = paymentService.getInvoice(invoiceId);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ErrorResponse("INVOICE_NOT_FOUND", "Invoice not found"));
        } catch (Exception e) {
            log.error("Error fetching invoice {}: {}", invoiceId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new ErrorResponse("INTERNAL_ERROR", "Could not retrieve invoice"));
        }
    }
}
