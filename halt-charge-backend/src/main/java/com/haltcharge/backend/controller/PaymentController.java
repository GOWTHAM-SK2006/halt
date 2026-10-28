package com.haltcharge.backend.controller;

import com.haltcharge.backend.dto.*;
import com.haltcharge.backend.entity.PaymentSession;
import com.haltcharge.backend.service.InvoiceService;
import com.haltcharge.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private final PaymentService paymentService;
    private final InvoiceService invoiceService;

    // ── GET session info by token (customer) ──
    @GetMapping("/session/{token}")
    public ResponseEntity<ApiResponse<PaymentSessionResponse>> getSession(
        @PathVariable String token
    ) {
        PaymentSessionResponse session = paymentService.getSessionByToken(token);
        return ResponseEntity.ok(ApiResponse.ok(session));
    }

    // ── POST create Razorpay order (customer) ──
    @PostMapping("/order")
    public ResponseEntity<ApiResponse<RazorpayOrderResponse>> createOrder(
        @RequestBody @Valid RazorpayOrderRequest request
    ) {
        RazorpayOrderResponse order = paymentService.createRazorpayOrder(request.token());
        return ResponseEntity.ok(ApiResponse.ok("Order created", order));
    }

    // ── POST verify payment (customer, after Razorpay checkout) ──
    @PostMapping("/verify")
    public ResponseEntity<ApiResponse<PaymentResultResponse>> verifyPayment(
        @RequestBody @Valid PaymentVerifyRequest request
    ) {
        PaymentResultResponse result = paymentService.verifyPayment(request);
        return ResponseEntity.ok(ApiResponse.ok("Payment verified", result));
    }

    // ── POST Razorpay webhook ──
    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
        @RequestBody String payload,
        @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature
    ) {
        if (signature == null || signature.isBlank()) {
            log.warn("Webhook received without signature header");
            return ResponseEntity.badRequest().body("Missing signature");
        }
        paymentService.handleWebhook(payload, signature);
        return ResponseEntity.ok("OK");
    }

    // ── GET payment result by token (customer) ──
    @GetMapping("/result/{token}")
    public ResponseEntity<ApiResponse<PaymentResultResponse>> getResult(
        @PathVariable String token
    ) {
        PaymentSessionResponse session = paymentService.getSessionByToken(token);

        PaymentResultResponse result = new PaymentResultResponse(
            "PAID".equals(session.status()),
            session.status(),
            session.token(),
            null,
            session.finalAmount(),
            session.stationName(),
            session.chargerId(),
            "PAID".equals(session.status()) ? "/api/payment/invoice/" + token : null,
            session.paidAt()
        );
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    // ── GET download PDF invoice (for paid sessions) ──
    @GetMapping("/invoice/{token}")
    public ResponseEntity<byte[]> downloadInvoice(@PathVariable String token) {
        PaymentSession session = paymentService.getSessionForInvoice(token);
        byte[] pdf = invoiceService.generateInvoice(session);

        String filename = "HC-Invoice-" + token.substring(0, 8).toUpperCase() + ".pdf";

        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }
}
