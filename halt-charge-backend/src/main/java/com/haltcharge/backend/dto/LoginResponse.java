package com.haltcharge.backend.dto;

public record LoginResponse(
    String token,
    String tokenType,
    long expiresIn,
    String username
) {
    public static LoginResponse of(String token, String username, long expiresIn) {
        return new LoginResponse(token, "Bearer", expiresIn, username);
    }
}
