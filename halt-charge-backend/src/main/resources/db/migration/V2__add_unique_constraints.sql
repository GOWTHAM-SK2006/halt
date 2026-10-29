-- V2__add_unique_constraints.sql
-- Add database-level constraints to prevent duplicate payment records.
-- razorpay_order_id: one Razorpay order per payment session (nullable — only set after order creation).
-- razorpay_payment_id: a Razorpay payment ID must never appear in two rows (true payment dedup).
-- These complement the application-level idempotency checks in PaymentService.

-- Partial unique index: enforce uniqueness only for non-null razorpay_order_id values.
-- This allows multiple CREATED sessions that haven't yet been ordered.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_sessions_razorpay_order_id
    ON payment_sessions (razorpay_order_id)
    WHERE razorpay_order_id IS NOT NULL;

-- Partial unique index: enforce uniqueness only for non-null razorpay_payment_id values.
-- This is the primary deduplication guard against double-payment recording.
CREATE UNIQUE INDEX IF NOT EXISTS uidx_payment_sessions_razorpay_payment_id
    ON payment_sessions (razorpay_payment_id)
    WHERE razorpay_payment_id IS NOT NULL;
