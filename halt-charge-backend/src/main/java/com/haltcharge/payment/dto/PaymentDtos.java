package com.haltcharge.payment.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.UUID;

// ─── Response DTOs ────────────────────────────────────────────────────────────

public class PaymentDtos {

    public record StationInfoDto(
        String stationName,
        String location,
        String chargerId,
        String sessionDate,
        String startTime,
        String endTime,
        String connectorType
    ) {}

    public record BillingBreakdownDto(
        BigDecimal energyConsumedKwh,
        BigDecimal tariffPerKwh,
        BigDecimal energyCharge,
        BigDecimal gstRate,
        BigDecimal gstAmount,
        BigDecimal serviceFee,
        BigDecimal discount,
        BigDecimal totalAmount,
        String currency
    ) {}

    public record PaymentSessionDto(
        String token,
        String sessionId,
        String status,
        StationInfoDto station,
        BillingBreakdownDto billing,
        String customerName,
        String customerPhone
    ) {}

    public record CreateOrderRequest(String sessionToken) {}

    public record CreateOrderResponse(
        String orderId,
        long amount,
        String currency,
        String keyId
    ) {}

    public record VerifyPaymentRequest(
        String sessionToken,
        String orderId,
        String paymentId,
        String signature
    ) {}

    public record PaymentResultDto(
        boolean success,
        String invoiceId,
        String transactionId,
        String paymentId,
        BigDecimal amount,
        String paidAt,
        String paymentMethod,
        String message
    ) {}

    public record InvoiceDto(
        String invoiceId,
        String invoiceNumber,
        String transactionId,
        String paymentId,
        String sessionId,
        StationInfoDto station,
        BillingBreakdownDto billing,
        String paidAt,
        String paymentMethod,
        String customerName,
        String supportEmail,
        String supportPhone
    ) {}

    public record ErrorResponse(String error, String message) {}

    // Razorpay webhook event (partial)
    public record WebhookEvent(
        String event,
        @JsonProperty("account_id") String accountId,
        WebhookPayload payload
    ) {}

    public record WebhookPayload(WebhookPaymentEntity payment) {}

    public record WebhookPaymentEntity(WebhookPaymentItem entity) {}

    public record WebhookPaymentItem(
        String id,
        @JsonProperty("order_id") String orderId,
        String status,
        String method,
        Long amount
    ) {}
}
