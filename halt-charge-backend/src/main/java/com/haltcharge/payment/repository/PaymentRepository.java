package com.haltcharge.payment.repository;

import com.haltcharge.payment.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByRazorpayOrderId(String razorpayOrderId);
    boolean existsByRazorpayOrderIdAndStatus(String razorpayOrderId, Payment.PaymentStatus status);
}
