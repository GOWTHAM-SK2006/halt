package com.haltcharge.backend.controller;

import com.haltcharge.backend.dto.ApiResponse;
import com.haltcharge.backend.dto.CreateSessionRequest;
import com.haltcharge.backend.dto.PaymentSessionResponse;
import com.haltcharge.backend.service.PaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final PaymentService paymentService;

    // ── POST create payment session ──
    @PostMapping("/sessions")
    public ResponseEntity<ApiResponse<PaymentSessionResponse>> createSession(
        @Valid @RequestBody CreateSessionRequest request
    ) {
        PaymentSessionResponse session = paymentService.createSession(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ApiResponse.ok("Payment session created", session));
    }

    // ── GET recent sessions ──
    @GetMapping("/sessions")
    public ResponseEntity<ApiResponse<List<PaymentSessionResponse>>> getSessions() {
        List<PaymentSessionResponse> sessions = paymentService.getRecentSessions();
        return ResponseEntity.ok(ApiResponse.ok(sessions));
    }

    // ── GET single session ──
    @GetMapping("/sessions/{token}")
    public ResponseEntity<ApiResponse<PaymentSessionResponse>> getSession(
        @PathVariable String token
    ) {
        PaymentSessionResponse session = paymentService.getSessionByToken(token);
        return ResponseEntity.ok(ApiResponse.ok(session));
    }
}
