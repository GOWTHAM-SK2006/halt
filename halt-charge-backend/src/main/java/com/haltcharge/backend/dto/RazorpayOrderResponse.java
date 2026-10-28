package com.haltcharge.backend.dto;

import java.math.BigDecimal;

public record RazorpayOrderResponse(
    String orderId,
    String keyId,
    BigDecimal amount,
    String currency,
    String stationName,
    String chargerId,
    String token
) {}
