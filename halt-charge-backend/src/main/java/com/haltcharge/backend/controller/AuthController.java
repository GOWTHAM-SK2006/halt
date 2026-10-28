package com.haltcharge.backend.controller;

import com.haltcharge.backend.dto.ApiResponse;
import com.haltcharge.backend.dto.LoginRequest;
import com.haltcharge.backend.dto.LoginResponse;
import com.haltcharge.backend.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(
        @Valid @RequestBody LoginRequest request
    ) {
        try {
            LoginResponse response = authService.login(request);
            return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
        } catch (BadCredentialsException e) {
            return ResponseEntity.status(401)
                .body(ApiResponse.error("Invalid username or password"));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        // Stateless JWT — client discards the token
        return ResponseEntity.ok(ApiResponse.ok("Logged out successfully", null));
    }
}
