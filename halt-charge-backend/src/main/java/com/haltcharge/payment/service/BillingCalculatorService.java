package com.haltcharge.payment.service;

import com.haltcharge.payment.model.ChargingSession;
import com.haltcharge.payment.model.ChargingStation;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Calculates and validates the EV charging bill.
 *
 * <p>Billing formula:
 * <pre>
 *   energyCharge = energyConsumedKwh × tariffPerKwh
 *   gstAmount    = energyCharge × gstRate          (5% concessional)
 *   totalAmount  = energyCharge + gstAmount + serviceFee − discount
 * </pre>
 *
 * <p>The backend ALWAYS recalculates amounts from raw data.
 * It NEVER trusts amounts supplied by the client.
 */
@Service
@Slf4j
public class BillingCalculatorService {

    @Value("${haltcharge.gst-rate:0.05}")
    private BigDecimal gstRate;

    /**
     * Calculates all billing fields on a ChargingSession from first principles.
     * Mutates the session object in-place, then returns it.
     */
    public ChargingSession calculate(ChargingSession session) {
        BigDecimal kwh     = session.getEnergyConsumedKwh();
        BigDecimal tariff  = session.getTariffPerKwh();
        BigDecimal fee     = session.getServiceFee()  != null ? session.getServiceFee()  : BigDecimal.ZERO;
        BigDecimal disc    = session.getDiscount()     != null ? session.getDiscount()     : BigDecimal.ZERO;

        if (kwh == null || tariff == null) {
            throw new IllegalStateException("Cannot calculate bill: energy or tariff is null for session "
                + session.getSessionId());
        }

        BigDecimal energyCharge = kwh.multiply(tariff).setScale(2, RoundingMode.HALF_UP);
        BigDecimal gstAmount    = energyCharge.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total        = energyCharge.add(gstAmount).add(fee).subtract(disc)
                                              .setScale(2, RoundingMode.HALF_UP);

        session.setEnergyCharge(energyCharge);
        session.setGstRate(gstRate);
        session.setGstAmount(gstAmount);
        session.setTotalAmount(total);

        log.debug("Calculated bill for session {}: kWh={}, tariff={}, energyCharge={}, gst={}, fee={}, disc={}, total={}",
            session.getSessionId(), kwh, tariff, energyCharge, gstAmount, fee, disc, total);

        return session;
    }

    /**
     * Validates that the stored totalAmount matches a fresh calculation.
     * Used to guard against data tampering.
     *
     * @return true if stored amount matches calculated amount (within 1 paisa tolerance)
     */
    public boolean validate(ChargingSession session) {
        BigDecimal kwh    = session.getEnergyConsumedKwh();
        BigDecimal tariff = session.getTariffPerKwh();
        BigDecimal fee    = session.getServiceFee()  != null ? session.getServiceFee()  : BigDecimal.ZERO;
        BigDecimal disc   = session.getDiscount()     != null ? session.getDiscount()     : BigDecimal.ZERO;

        if (kwh == null || tariff == null || session.getTotalAmount() == null) return false;

        BigDecimal energyCharge = kwh.multiply(tariff).setScale(2, RoundingMode.HALF_UP);
        BigDecimal gstAmount    = energyCharge.multiply(gstRate).setScale(2, RoundingMode.HALF_UP);
        BigDecimal expected     = energyCharge.add(gstAmount).add(fee).subtract(disc)
                                              .setScale(2, RoundingMode.HALF_UP);

        BigDecimal diff = expected.subtract(session.getTotalAmount()).abs();
        return diff.compareTo(new BigDecimal("0.01")) <= 0;
    }
}
