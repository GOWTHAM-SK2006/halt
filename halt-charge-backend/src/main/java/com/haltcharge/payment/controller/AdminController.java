package com.haltcharge.payment.controller;

import com.haltcharge.payment.model.PaymentSession;
import com.haltcharge.payment.service.AdminService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
public class AdminController {

    private final AdminService adminService;

    // ─── POST /api/admin/login ───────────────────────────────────────────────
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        try {
            AdminService.LoginResult result = adminService.login(req.username(), req.password());
            return ResponseEntity.ok(Map.of(
                "token", result.token(),
                "username", result.username(),
                "expiresAt", result.expiresAt().toString()
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Map.of("message", "Invalid username or password"));
        }
    }

    // ─── POST /api/admin/logout ──────────────────────────────────────────────
    @PostMapping("/logout")
    public ResponseEntity<Void> logout() {
        // Stateless JWT — client drops the token
        return ResponseEntity.ok().build();
    }

    // ─── POST /api/admin/sessions ────────────────────────────────────────────
    @PostMapping("/sessions")
    public ResponseEntity<?> createSession(@RequestBody CreateSessionRequest req) {
        try {
            PaymentSession session = adminService.createPaymentSession(
                new AdminService.CreateSessionRequest(
                    req.stationName(), req.location(), req.chargerId(),
                    req.connectorType(),
                    toBD(req.baseAmount()), toBD(req.taxRate()),
                    toBD(req.serviceFee()), toBD(req.discount()),
                    req.description(), req.customerName(), req.customerPhone(),
                    req.currency()
                )
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(toDto(session));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            log.error("Error creating admin session: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("message", "Could not create payment session"));
        }
    }

    // ─── GET /api/admin/sessions ─────────────────────────────────────────────
    @GetMapping("/sessions")
    public ResponseEntity<?> listSessions(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size,
        @RequestParam(defaultValue = "") String search
    ) {
        AdminService.SessionListResult result = adminService.listSessions(page, size, search);
        return ResponseEntity.ok(Map.of(
            "sessions", result.sessions().stream().map(this::toDto).toList(),
            "total", result.total(),
            "page", page,
            "pageSize", size
        ));
    }

    // ─── GET /api/admin/stats ─────────────────────────────────────────────────
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        AdminService.StatsResult s = adminService.getStats();
        return ResponseEntity.ok(Map.of(
            "totalSessions", s.total(),
            "pendingSessions", s.pending(),
            "paidSessions", s.paid(),
            "failedSessions", s.failed(),
            "totalRevenue", s.totalRevenue()
        ));
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private BigDecimal toBD(Object val) {
        if (val == null) return null;
        if (val instanceof BigDecimal bd) return bd;
        if (val instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return new BigDecimal(val.toString());
    }

    private Map<String, Object> toDto(PaymentSession s) {
        return Map.ofEntries(
            Map.entry("id", s.getId() != null ? s.getId().toString() : ""),
            Map.entry("sessionId", s.getSessionId()),
            Map.entry("token", s.getToken()),
            Map.entry("stationName", nullSafe(s.getStationName())),
            Map.entry("location", nullSafe(s.getLocation())),
            Map.entry("chargerId", nullSafe(s.getChargerId())),
            Map.entry("connectorType", nullSafe(s.getConnectorType())),
            Map.entry("baseAmount", s.getBaseAmount()),
            Map.entry("taxRate", s.getTaxRate()),
            Map.entry("taxAmount", s.getTaxAmount()),
            Map.entry("serviceFee", s.getServiceFee()),
            Map.entry("discount", s.getDiscount()),
            Map.entry("totalAmount", s.getTotalAmount()),
            Map.entry("currency", nullSafe(s.getCurrency())),
            Map.entry("status", nullSafe(s.getStatus())),
            Map.entry("description", nullSafe(s.getDescription())),
            Map.entry("customerName", nullSafe(s.getCustomerName())),
            Map.entry("paymentUrl", nullSafe(s.getPaymentUrl())),
            Map.entry("createdAt", s.getCreatedAt() != null ? s.getCreatedAt().toString() : Instant.now().toString()),
            Map.entry("updatedAt", s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : Instant.now().toString())
        );
    }

    private String nullSafe(String s) { return s != null ? s : ""; }

    // ─── Request records ──────────────────────────────────────────────────────
    record LoginRequest(String username, String password) {}

    record CreateSessionRequest(
        String stationName, String location, String chargerId, String connectorType,
        Object baseAmount, Object taxRate, Object serviceFee, Object discount,
        String description, String customerName, String customerPhone, String currency
    ) {}
}
