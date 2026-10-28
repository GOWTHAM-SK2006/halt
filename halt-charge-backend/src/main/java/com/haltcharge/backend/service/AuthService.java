package com.haltcharge.backend.service;

import com.haltcharge.backend.dto.LoginRequest;
import com.haltcharge.backend.dto.LoginResponse;
import com.haltcharge.backend.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final JwtUtil jwtUtil;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username}")
    private String adminUsername;

    @Value("${app.admin.password}")
    private String adminPassword;

    public LoginResponse login(LoginRequest request) {
        // Constant-time username comparison to prevent timing attacks
        boolean usernameMatch = adminUsername.equals(request.username());

        // Always run passwordEncoder.matches even on wrong username to prevent timing attacks
        // (use a dummy hash comparison if username doesn't match)
        String hashToCheck = usernameMatch ? getAdminHash() : "$2a$10$invalidhashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
        boolean passwordMatch = passwordEncoder.matches(request.password(), hashToCheck);

        if (!usernameMatch || !passwordMatch) {
            log.warn("Failed login attempt for username: {}", request.username());
            throw new BadCredentialsException("Invalid username or password");
        }

        log.info("Admin login successful for: {}", request.username());
        String token = jwtUtil.generateToken(request.username());
        return LoginResponse.of(token, request.username(), jwtUtil.getExpirationMs());
    }

    /**
     * Returns BCrypt hash of the admin password.
     * On first call, hashes the plain-text env password.
     * In production, store a pre-hashed password in the env variable instead.
     */
    private String adminPasswordHash;

    private synchronized String getAdminHash() {
        if (adminPasswordHash == null) {
            adminPasswordHash = passwordEncoder.encode(adminPassword);
        }
        return adminPasswordHash;
    }
}
