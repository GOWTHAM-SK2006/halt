package com.haltcharge.payment.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "charging_stations")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChargingStation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "charger_id", nullable = false, unique = true)
    private String chargerId;

    @Column(name = "station_name", nullable = false)
    private String stationName;

    @Column(nullable = false)
    private String location;

    @Column(name = "connector_type")
    private String connectorType;

    @Column(name = "tariff_per_kwh", nullable = false, precision = 10, scale = 4)
    private BigDecimal tariffPerKwh;

    @Column(name = "service_fee", precision = 10, scale = 2)
    private BigDecimal serviceFee;

    @Column(name = "is_active")
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
}
