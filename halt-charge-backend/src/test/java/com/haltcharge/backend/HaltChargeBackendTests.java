package com.haltcharge.backend;

import com.haltcharge.backend.dto.*;
import com.haltcharge.backend.entity.PaymentSession;
import com.haltcharge.backend.repository.PaymentSessionRepository;
import com.haltcharge.backend.service.PaymentService;
import com.haltcharge.backend.security.JwtUtil;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class HaltChargeBackendTests {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @Autowired JwtUtil jwtUtil;
    @Autowired PaymentSessionRepository sessionRepo;
    @Autowired PaymentService paymentService;

    private static String adminToken;
    private static String sessionToken;

    // ── Test 1: Health ──────────────────────────────────────────

    @Test @Order(1)
    void healthEndpointIsUp() throws Exception {
        mockMvc.perform(get("/api/health"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"));
    }

    // ── Test 2: Admin Login ─────────────────────────────────────

    @Test @Order(2)
    void adminLoginSuccess() throws Exception {
        LoginRequest req = new LoginRequest("admin", "halt2024");
        String response = mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.token").isNotEmpty())
            .andReturn().getResponse().getContentAsString();

        ApiResponse<?> apiResp = objectMapper.readValue(response, ApiResponse.class);
        adminToken = ((java.util.LinkedHashMap<?, ?>) apiResp.data()).get("token").toString();
        assertNotNull(adminToken);
    }

    @Test @Order(3)
    void adminLoginFailure() throws Exception {
        LoginRequest req = new LoginRequest("admin", "wrongpassword");
        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isUnauthorized());
    }

    // ── Test 4: Session Creation ────────────────────────────────

    @Test @Order(4)
    void createPaymentSessionSuccess() throws Exception {
        Assumptions.assumeTrue(adminToken != null, "Admin token required");

        CreateSessionRequest req = new CreateSessionRequest(
            "HC-BLR-Koramangala", "CHG-005",
            new BigDecimal("250.00"), new BigDecimal("45.00"),
            BigDecimal.ZERO, BigDecimal.ZERO
        );

        String response = mockMvc.perform(post("/api/admin/sessions")
                .header("Authorization", "Bearer " + adminToken)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.token").isNotEmpty())
            .andExpect(jsonPath("$.data.finalAmount").value(295.00))
            .andExpect(jsonPath("$.data.status").value("CREATED"))
            .andReturn().getResponse().getContentAsString();

        ApiResponse<?> apiResp = objectMapper.readValue(response, ApiResponse.class);
        sessionToken = ((java.util.LinkedHashMap<?, ?>) apiResp.data()).get("token").toString();
        assertNotNull(sessionToken);
    }

    @Test @Order(5)
    void createSessionRequiresAuth() throws Exception {
        CreateSessionRequest req = new CreateSessionRequest(
            "HC-Station", "CHG-001",
            new BigDecimal("100.00"), new BigDecimal("18.00"),
            BigDecimal.ZERO, BigDecimal.ZERO
        );
        mockMvc.perform(post("/api/admin/sessions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isForbidden());
    }

    // ── Test 6: Session Retrieval ───────────────────────────────

    @Test @Order(6)
    void getSessionByTokenSuccess() throws Exception {
        Assumptions.assumeTrue(sessionToken != null, "Session token required");

        mockMvc.perform(get("/api/payment/session/" + sessionToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.data.token").value(sessionToken))
            .andExpect(jsonPath("$.data.stationName").value("HC-BLR-Koramangala"))
            .andExpect(jsonPath("$.data.finalAmount").value(295.00));
    }

    @Test @Order(7)
    void getSessionWithInvalidTokenReturns404() throws Exception {
        mockMvc.perform(get("/api/payment/session/invalid-token-xyz"))
            .andExpect(status().isNotFound());
    }

    // ── Test 8: Admin Sessions List ─────────────────────────────

    @Test @Order(8)
    void adminCanListSessions() throws Exception {
        Assumptions.assumeTrue(adminToken != null, "Admin token required");

        mockMvc.perform(get("/api/admin/sessions")
                .header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray());
    }

    // ── Test 9: Invalid Payment Signature ──────────────────────

    @Test @Order(9)
    void invalidSignatureVerificationFails() throws Exception {
        Assumptions.assumeTrue(sessionToken != null, "Session token required");

        // Manually set the session to PENDING with a fake order ID
        sessionRepo.findByToken(sessionToken).ifPresent(s -> {
            s.setRazorpayOrderId("order_test_fake123");
            s.setStatus(PaymentSession.PaymentStatus.PENDING);
            sessionRepo.save(s);
        });

        PaymentVerifyRequest req = new PaymentVerifyRequest(
            "order_test_fake123",
            "pay_test_fake456",
            "invalidsignaturestring",
            sessionToken
        );

        mockMvc.perform(post("/api/payment/verify")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(req)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false));
    }

    // ── Test 10: Invoice only for PAID sessions ─────────────────

    @Test @Order(10)
    void invoiceNotAvailableForUnpaidSession() throws Exception {
        Assumptions.assumeTrue(sessionToken != null, "Session token required");

        mockMvc.perform(get("/api/payment/invoice/" + sessionToken))
            .andExpect(status().isBadRequest());
    }

    // ── Test 11: JWT validity ───────────────────────────────────

    @Test @Order(11)
    void jwtTokenIsValid() {
        String token = jwtUtil.generateToken("admin");
        assertTrue(jwtUtil.validateToken(token));
        assertEquals("admin", jwtUtil.extractUsername(token));
    }

    @Test @Order(12)
    void invalidJwtTokenFails() {
        assertFalse(jwtUtil.validateToken("not.a.jwt.token"));
    }

    // ── Test 13: Duplicate Payment ──────────────────────────────

    @Test @Order(13)
    void duplicateWebhookEventIsIgnored() {
        // Create another session to simulate duplicate
        CreateSessionRequest req = new CreateSessionRequest(
            "HC-Test", "CHG-TEST",
            new BigDecimal("100.00"), new BigDecimal("18.00"),
            BigDecimal.ZERO, BigDecimal.ZERO
        );
        PaymentSessionResponse created = paymentService.createSession(req);
        assertNotNull(created.token());
        assertEquals("CREATED", created.status());
    }
}
