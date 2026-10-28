package com.haltcharge.backend.repository;

import com.haltcharge.backend.entity.PaymentSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentSessionRepository extends JpaRepository<PaymentSession, Long> {

    Optional<PaymentSession> findByToken(String token);

    Optional<PaymentSession> findByRazorpayOrderId(String orderId);

    @Query("SELECT ps FROM PaymentSession ps ORDER BY ps.createdAt DESC LIMIT 50")
    List<PaymentSession> findRecentSessions();

    boolean existsByRazorpayPaymentId(String paymentId);
}
