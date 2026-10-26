package com.haltcharge.payment.service;

import com.haltcharge.payment.model.AdminUser;
import com.haltcharge.payment.model.PaymentSession;
import com.haltcharge.payment.repository.AdminUserRepository;
import com.haltcharge.payment.repository.PaymentSessionRepository;
import com.haltcharge.payment.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final AdminUserRepository adminUserRepository;
    private final PaymentSessionRepository paymentSessionRepository;
    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;
    private final TokenGeneratorService tokenGeneratorService;

    @Value("${haltcharge.frontend-base-url:http://localhost:3000}")
    private String frontendBaseUrl;

    // ─── Auth ─────────────────────────────────────────────────────────────────

    public record LoginResult(String token, String username, Instant expiresAt) {}

    public LoginResult login(String username, String password) {
        AdminUser user = adminUserRepository.findByUsernameAndActiveTrue(username)
            .orElseThrow(() -> new IllegalArgumentException("Invalid credentials"));

        if (!passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(username);
        Instant expiresAt = jwtUtil.getExpiration(token);
        log.info("Admin login: {}", username);
        return new LoginResult(token, username, expiresAt);
    }

    // ─── Session creation ─────────────────────────────────────────────────────

    public record CreateSessionRequest(
        String stationName,
        String location,
        String chargerId,
        String connectorType,
        BigDecimal baseAmount,
        BigDecimal taxRate,
        BigDecimal serviceFee,
        BigDecimal discount,
        String description,
        String customerName,
        String customerPhone,
        String currency
    ) {}

    @Transactional
    public PaymentSession createPaymentSession(CreateSessionRequest req) {
        BigDecimal base = req.baseAmount().setScale(2, RoundingMode.HALF_UP);
        BigDecimal taxRate = req.taxRate() != null ? req.taxRate() : new BigDecimal("0.05");
        BigDecimal taxAmount = base.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal fee = req.serviceFee() != null ? req.serviceFee().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal disc = req.discount() != null ? req.discount().setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO;
        BigDecimal total = base.add(taxAmount).add(fee).subtract(disc).setScale(2, RoundingMode.HALF_UP);

        String token = tokenGeneratorService.generateToken();
        String sessionId = "HC-" + Instant.now().toEpochMilli() + "-" + req.chargerId().replaceAll("[^A-Z0-9]", "");

        PaymentSession session = new PaymentSession();
        session.setSessionId(sessionId);
        session.setToken(token);
        session.setStationName(req.stationName());
        session.setLocation(req.location());
        session.setChargerId(req.chargerId());
        session.setConnectorType(req.connectorType());
        session.setBaseAmount(base);
        session.setTaxRate(taxRate);
        session.setTaxAmount(taxAmount);
        session.setServiceFee(fee);
        session.setDiscount(disc);
        session.setTotalAmount(total);
        session.setCurrency(req.currency() != null ? req.currency() : "INR");
        session.setStatus("PENDING");
        session.setDescription(req.description());
        session.setCustomerName(req.customerName());
        session.setCustomerPhone(req.customerPhone());
        session.setPaymentUrl(frontendBaseUrl + "/pay/" + token);

        return paymentSessionRepository.save(session);
    }

    // ─── Session listing ──────────────────────────────────────────────────────

    public record SessionListResult(List<PaymentSession> sessions, long total) {}

    public SessionListResult listSessions(int page, int size, String search) {
        // Basic listing — replace with Specification for production
        List<PaymentSession> all = paymentSessionRepository.findAll(
            org.springframework.data.domain.Sort.by(
                org.springframework.data.domain.Sort.Direction.DESC, "createdAt"
            )
        );

        List<PaymentSession> filtered = all.stream()
            .filter(s -> search == null || search.isBlank() ||
                s.getSessionId().toLowerCase().contains(search.toLowerCase()) ||
                s.getChargerId().toLowerCase().contains(search.toLowerCase()) ||
                (s.getStationName() != null && s.getStationName().toLowerCase().contains(search.toLowerCase()))
            )
            .toList();

        long total = filtered.size();
        int fromIdx = Math.min(page * size, (int) total);
        int toIdx = Math.min(fromIdx + size, (int) total);

        return new SessionListResult(filtered.subList(fromIdx, toIdx), total);
    }

    // ─── Stats ────────────────────────────────────────────────────────────────

    public record StatsResult(
        long total, long pending, long paid, long failed, BigDecimal totalRevenue
    ) {}

    public StatsResult getStats() {
        List<PaymentSession> all = paymentSessionRepository.findAll();
        long paid = all.stream().filter(s -> "PAID".equals(s.getStatus())).count();
        long pending = all.stream().filter(s -> "PENDING".equals(s.getStatus())).count();
        long failed = all.stream().filter(s -> "FAILED".equals(s.getStatus())).count();
        BigDecimal revenue = all.stream()
            .filter(s -> "PAID".equals(s.getStatus()))
            .map(PaymentSession::getTotalAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new StatsResult(all.size(), pending, paid, failed, revenue);
    }
}
