package com.haltcharge.payment.repository;

import com.haltcharge.payment.model.ChargingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ChargingSessionRepository extends JpaRepository<ChargingSession, UUID> {
    Optional<ChargingSession> findBySessionId(String sessionId);
}
