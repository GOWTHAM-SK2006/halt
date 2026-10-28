package com.haltcharge.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResultResponse(
    boolean success,
    String status,
    String transactionId,
    String razorpayPaymentId,
    BigDecimal amount,
    String stationName,
    String chargerId,
    String invoiceUrl,
    LocalDateTime paidAt
) {}
