package com.haltcharge.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record RazorpayOrderRequest(
    @NotBlank(message = "Session token is required")
    String token
) {}
