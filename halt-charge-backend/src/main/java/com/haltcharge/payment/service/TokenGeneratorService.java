package com.haltcharge.payment.service;

import com.haltcharge.payment.model.*;
import com.haltcharge.payment.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;

/**
 * Generates secure payment session tokens for embedding in QR codes.
 *
 * <p>Usage: After a charging session ends, the charger management system
 * calls this service to create a one-time payment token. That token is
 * embedded in the QR code URL: https://pay.haltandcharge.in/pay/{token}
 *
 * <p>The token is a 32-byte cryptographically random value — it does NOT
 * contain any session data, customer info, or payment amounts.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class TokenGeneratorService {

    private final PaymentSessionRepository paymentSessionRepository;
    private final ChargingSessionRepository chargingSessionRepository;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Value("${haltcharge.token-expiry-hours:48}")
    private int tokenExpiryHours;

    /**
     * Creates a new payment session token for a completed charging session.
     *
     * @param chargingSessionId UUID of the ChargingSession
     * @return the generated URL-safe token string
     */
    @Transactional
    public String createPaymentToken(java.util.UUID chargingSessionId) {
        ChargingSession session = chargingSessionRepository.findById(chargingSessionId)
            .orElseThrow(() -> new IllegalArgumentException("Charging session not found: " + chargingSessionId));

        // Generate 32 bytes of secure random → URL-safe Base64
        byte[] tokenBytes = new byte[32];
        SECURE_RANDOM.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);

        PaymentSession paymentSession = PaymentSession.builder()
            .token(token)
            .chargingSession(session)
            .status(PaymentSession.PaymentSessionStatus.PENDING)
            .expiresAt(OffsetDateTime.now().plusHours(tokenExpiryHours))
            .build();

        paymentSessionRepository.save(paymentSession);
        log.info("Created payment token for session {} (expires in {} hours)", session.getSessionId(), tokenExpiryHours);

        return token;
    }
}
