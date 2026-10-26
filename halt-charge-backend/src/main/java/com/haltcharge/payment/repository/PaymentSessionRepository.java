package com.haltcharge.payment.repository;

import com.haltcharge.payment.model.PaymentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface PaymentSessionRepository extends JpaRepository<PaymentSession, UUID> {

    @Query("SELECT ps FROM PaymentSession ps " +
           "JOIN FETCH ps.chargingSession cs " +
           "JOIN FETCH cs.station s " +
           "WHERE ps.token = :token")
    Optional<PaymentSession> findByTokenWithDetails(@Param("token") String token);

    Optional<PaymentSession> findByToken(String token);
}
