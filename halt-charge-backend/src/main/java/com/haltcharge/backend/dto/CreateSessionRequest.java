package com.haltcharge.backend.dto;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;

public record CreateSessionRequest(
    @NotBlank(message = "Station name is required")
    @Size(max = 255)
    String stationName,

    @NotBlank(message = "Charger ID is required")
    @Size(max = 100)
    String chargerId,

    @NotNull(message = "Base amount is required")
    @DecimalMin(value = "1.00", message = "Base amount must be at least ₹1")
    @DecimalMax(value = "100000.00", message = "Base amount must not exceed ₹1,00,000")
    BigDecimal baseAmount,

    @NotNull(message = "Tax amount is required")
    @DecimalMin(value = "0.00")
    BigDecimal taxAmount,

    @DecimalMin(value = "0.00")
    BigDecimal additionalFees,

    @DecimalMin(value = "0.00")
    BigDecimal discount
) {}
