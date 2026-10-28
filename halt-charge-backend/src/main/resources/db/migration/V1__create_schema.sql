-- V1__create_schema.sql
-- Initial schema for Halt & Charge backend

CREATE TABLE IF NOT EXISTS payment_sessions (
    id              BIGSERIAL PRIMARY KEY,
    token           VARCHAR(64) UNIQUE NOT NULL,
    station_name    VARCHAR(255) NOT NULL,
    charger_id      VARCHAR(100) NOT NULL,
    base_amount     NUMERIC(10,2) NOT NULL,
    tax_amount      NUMERIC(10,2) NOT NULL DEFAULT 0,
    additional_fees NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount        NUMERIC(10,2) NOT NULL DEFAULT 0,
    final_amount    NUMERIC(10,2) NOT NULL,
    status          VARCHAR(20) NOT NULL DEFAULT 'CREATED',
    razorpay_order_id   VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature  VARCHAR(255),
    qr_code_url     TEXT,
    payment_url     TEXT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    paid_at         TIMESTAMP,
    expires_at      TIMESTAMP NOT NULL,
    CONSTRAINT chk_status CHECK (status IN ('CREATED','PENDING','PAID','FAILED','EXPIRED'))
);

CREATE INDEX idx_payment_sessions_token ON payment_sessions(token);
CREATE INDEX idx_payment_sessions_status ON payment_sessions(status);
CREATE INDEX idx_payment_sessions_created_at ON payment_sessions(created_at DESC);

CREATE TABLE IF NOT EXISTS webhook_events (
    id           BIGSERIAL PRIMARY KEY,
    event_id     VARCHAR(100) UNIQUE NOT NULL,
    event_type   VARCHAR(100),
    payload      TEXT,
    processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
