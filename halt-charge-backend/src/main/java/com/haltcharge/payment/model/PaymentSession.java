package com.haltcharge.payment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * A standalone payment session created by an admin.
 * Contains all billing info and generates a QR-ready payment URL.
 */
@Entity
@Table(name = "payment_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PaymentSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_id", nullable = false, unique = true)
    private String sessionId;

    @Column(nullable = false, unique = true)
    private String token;

    // ─── Station info ──────────────────────────────────────────────────────
    @Column(name = "station_name")
    private String stationName;

    @Column(name = "location")
    private String location;

    @Column(name = "charger_id")
    private String chargerId;

    @Column(name = "connector_type")
    private String connectorType;

    // ─── Billing ───────────────────────────────────────────────────────────
    @Column(name = "base_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal baseAmount;

    @Column(name = "tax_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal taxRate;

    @Column(name = "tax_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal taxAmount;

    @Column(name = "service_fee", precision = 10, scale = 2)
    private BigDecimal serviceFee = BigDecimal.ZERO;

    @Column(name = "discount", precision = 10, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal totalAmount;

    @Column(name = "currency", length = 3)
    private String currency = "INR";

    // ─── Status ────────────────────────────────────────────────────────────
    @Column(nullable = false, length = 20)
    private String status = "PENDING"; // PENDING | PAID | EXPIRED | FAILED

    // ─── Optional metadata ────────────────────────────────────────────────
    @Column(name = "description")
    private String description;

    @Column(name = "customer_name")
    private String customerName;

    @Column(name = "customer_phone", length = 20)
    private String customerPhone;

    @Column(name = "payment_url")
    private String paymentUrl;

    // ─── Gateway references ───────────────────────────────────────────────
    @Column(name = "razorpay_order_id")
    private String razorpayOrderId;

    @Column(name = "razorpay_payment_id")
    private String razorpayPaymentId;

    @Column(name = "payment_method")
    private String paymentMethod;

    @Column(name = "paid_at")
    private Instant paidAt;

    // ─── Timestamps ────────────────────────────────────────────────────────
    @Column(name = "expires_at")
    private Instant expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }
}
