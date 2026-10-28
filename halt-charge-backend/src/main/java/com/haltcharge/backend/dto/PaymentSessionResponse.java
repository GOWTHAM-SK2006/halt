package com.haltcharge.backend.dto;

import com.haltcharge.backend.entity.PaymentSession;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentSessionResponse(
    Long id,
    String token,
    String stationName,
    String chargerId,
    BigDecimal baseAmount,
    BigDecimal taxAmount,
    BigDecimal additionalFees,
    BigDecimal discount,
    BigDecimal finalAmount,
    String status,
    String paymentUrl,
    String qrCodeUrl,
    LocalDateTime createdAt,
    LocalDateTime expiresAt,
    LocalDateTime paidAt
) {
    public static PaymentSessionResponse from(PaymentSession s) {
        return new PaymentSessionResponse(
            s.getId(),
            s.getToken(),
            s.getStationName(),
            s.getChargerId(),
            s.getBaseAmount(),
            s.getTaxAmount(),
            s.getAdditionalFees(),
            s.getDiscount(),
            s.getFinalAmount(),
            s.getStatus().name(),
            s.getPaymentUrl(),
            s.getQrCodeUrl(),
            s.getCreatedAt(),
            s.getExpiresAt(),
            s.getPaidAt()
        );
    }
}
