package com.haltcharge.payment.repository;

import com.haltcharge.payment.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    @Query("SELECT i FROM Invoice i " +
           "JOIN FETCH i.payment p " +
           "JOIN FETCH p.paymentSession ps " +
           "JOIN FETCH ps.chargingSession cs " +
           "JOIN FETCH cs.station s " +
           "WHERE i.id = :id")
    Optional<Invoice> findByIdWithDetails(@Param("id") UUID id);

    Optional<Invoice> findByInvoiceNumber(String invoiceNumber);

    boolean existsByChargingSessionId(UUID chargingSessionId);

    Optional<Invoice> findByChargingSessionId(UUID chargingSessionId);
}
