-- PostgreSQL starter schema for the documented subscription billing logic.
-- This defines storage and relationships; payment processing, proration, tax
-- calculation, retries, and schedule generation require application logic.

CREATE TABLE user_records (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signup_ts TIMESTAMPTZ NOT NULL,
    campaign_source VARCHAR(255) NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    state VARCHAR(2) NOT NULL,
    city VARCHAR(120) NOT NULL,
    zipcode VARCHAR(10) NOT NULL,
    dob DATE NOT NULL,
    email VARCHAR(320) NOT NULL,
    update_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_records_email_uk UNIQUE (email),
    CONSTRAINT user_records_dob_adult_ck CHECK (dob <= CURRENT_DATE - INTERVAL '18 years')
);

CREATE TABLE marketing_records (
    marketing_record_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    date DATE NOT NULL,
    campaign_source VARCHAR(32) NOT NULL
        CHECK (campaign_source IN ('SEM', 'SEO', 'Affiliate', 'Directload', 'TV', 'Radio')),
    campaign_name VARCHAR(255) NOT NULL,
    views BIGINT CHECK (views >= 0),
    views_est NUMERIC(14, 2) CHECK (views_est >= 0),
    clicks BIGINT CHECK (clicks >= 0),
    visits BIGINT CHECK (visits >= 0),
    cost NUMERIC(14, 2) NOT NULL CHECK (cost >= 0),
    visits_est NUMERIC(14, 2) CHECK (visits_est >= 0),
    update_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT marketing_records_daily_campaign_uk
        UNIQUE (date, campaign_source, campaign_name),
    CONSTRAINT marketing_records_directload_ck CHECK (
        (campaign_source = 'Directload' AND campaign_name = 'Directload')
        OR (campaign_source <> 'Directload' AND campaign_name <> 'Directload')
    ),
    CONSTRAINT marketing_records_source_metrics_ck CHECK (
        (campaign_source IN ('SEM', 'SEO', 'Affiliate')
            AND views IS NOT NULL AND clicks IS NOT NULL AND visits IS NOT NULL
            AND views_est IS NULL AND visits_est IS NULL)
        OR (campaign_source = 'Directload'
            AND views IS NULL AND views_est IS NULL AND clicks IS NULL
            AND visits IS NOT NULL AND visits_est IS NULL)
        OR (campaign_source IN ('TV', 'Radio')
            AND views IS NULL AND views_est IS NOT NULL AND clicks IS NULL
            AND visits IS NULL AND visits_est IS NOT NULL)
    )
);

CREATE INDEX marketing_records_date_idx ON marketing_records(date);

COMMENT ON COLUMN user_records.campaign_source IS
    'Looked up from the attributed marketing_records row; do not randomize independently.';
COMMENT ON COLUMN user_records.campaign_name IS
    'Looked up from the same attributed marketing_records row as campaign_source.';

CREATE TABLE subscription_records (
    subscription_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_records(user_id),
    subscription_length INTEGER NOT NULL CHECK (subscription_length IN (1, 3, 12)),
    trial_start_ts TIMESTAMPTZ NOT NULL,
    subscription_start_ts TIMESTAMPTZ NOT NULL,
    subscription_end_ts TIMESTAMPTZ,
    subscription_type VARCHAR(32) NOT NULL
        CHECK (subscription_type IN ('new_subscription', 'reactivation')),
    subscription_status VARCHAR(32) NOT NULL
        CHECK (subscription_status IN ('trial', 'active', 'pending_cancellation', 'cancelled')),
    cancel_status VARCHAR(32)
        CHECK (cancel_status IN ('user', 'failed_payment')),
    gross_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gross_revenue >= 0),
    net_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_discount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_discount >= 0),
    total_tax NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_tax <= 0),
    total_transactions INTEGER NOT NULL DEFAULT 0 CHECK (total_transactions >= 0),
    failed_transactions INTEGER NOT NULL DEFAULT 0 CHECK (failed_transactions >= 0),
    refunds NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refunds <= 0),
    chargebacks NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (chargebacks >= 0),
    last_update_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT subscription_trial_period_ck CHECK (
        subscription_start_ts = trial_start_ts + INTERVAL '7 days'
    ),
    CONSTRAINT subscription_end_status_ck CHECK (
        (subscription_status = 'cancelled' AND subscription_end_ts IS NOT NULL)
        OR (subscription_status <> 'cancelled' AND subscription_end_ts IS NULL)
    ),
    CONSTRAINT subscription_cancel_status_ck CHECK (
        (subscription_status IN ('pending_cancellation', 'cancelled') AND cancel_status IS NOT NULL)
        OR (subscription_status IN ('trial', 'active') AND cancel_status IS NULL)
    )
);

CREATE INDEX subscription_records_user_idx ON subscription_records(user_id);

COMMENT ON COLUMN subscription_records.net_revenue IS
    'Sum of transaction net_amount values for this subscription, after discounts/refunds/chargebacks and excluding tax.';
COMMENT ON COLUMN subscription_records.total_tax IS
    'Net tax balance: negative tax on charges offset by tax reversed on refunds.';

-- Users may retain multiple historical subscription records, but only one
-- record per user may be actively billed at a time.
CREATE UNIQUE INDEX subscription_records_one_active_per_user_uk
    ON subscription_records(user_id)
    WHERE subscription_status = 'active';

CREATE TABLE subscription_change_records (
    subscription_change_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_records(user_id),
    subscription_id BIGINT NOT NULL REFERENCES subscription_records(subscription_id),
    subscription_status VARCHAR(32) NOT NULL
        CHECK (subscription_status IN ('trial', 'active', 'pending_cancellation', 'cancelled')),
    cancel_reason VARCHAR(32)
        CHECK (cancel_reason IN ('user', 'failed_payment')),
    subscription_length INTEGER NOT NULL CHECK (subscription_length IN (1, 3, 12)),
    change_reason VARCHAR(32) NOT NULL
        CHECK (change_reason IN ('upgrade', 'downgrade', 'status_change')),
    change_ts TIMESTAMPTZ NOT NULL,
    update_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX subscription_change_history_idx
    ON subscription_change_records(subscription_id, change_ts);

CREATE TABLE scheduled_subscription_payment_records (
    scheduled_payment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_records(user_id),
    subscription_id BIGINT NOT NULL REFERENCES subscription_records(subscription_id),
    transaction_id BIGINT,
    renewal_number INTEGER NOT NULL CHECK (renewal_number > 0),
    scheduled_payment_ts TIMESTAMPTZ NOT NULL,
    transaction_ts TIMESTAMPTZ,
    gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    scheduled_amount NUMERIC(12, 2) NOT NULL CHECK (scheduled_amount >= 0),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount <= 0),
    declined_transactions INTEGER NOT NULL DEFAULT 0 CHECK (declined_transactions >= 0),
    payment_status VARCHAR(32) NOT NULL DEFAULT 'scheduled'
        CHECK (payment_status IN ('scheduled', 'paid', 'past_due', 'cancelled', 'superseded')),
    update_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT scheduled_amount_math_ck CHECK (
        scheduled_amount = gross_amount - discount_amount
    ),
    CONSTRAINT scheduled_payment_renewal_uk UNIQUE (subscription_id, renewal_number)
);

CREATE INDEX scheduled_payment_due_idx
    ON scheduled_subscription_payment_records(payment_status, scheduled_payment_ts);

COMMENT ON TABLE scheduled_subscription_payment_records IS
    'Application logic removes unpaid future renewal rows when cancellation takes effect and recalculates future due dates after a plan-length change.';

CREATE TABLE transaction_records (
    transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_records(user_id),
    subscription_id BIGINT NOT NULL REFERENCES subscription_records(subscription_id),
    schedule_id BIGINT REFERENCES scheduled_subscription_payment_records(scheduled_payment_id),
    transaction_ts TIMESTAMPTZ NOT NULL,
    transaction_type VARCHAR(32) NOT NULL
        CHECK (transaction_type IN (
            'new_subscription', 'renewal', 'upgrade_charge', 'downgrade_refund',
            'one_time_purchase', 'general_refund', 'chargeback'
        )),
    payment_processor VARCHAR(80) NOT NULL,
    credit_or_debit VARCHAR(32) NOT NULL
        CHECK (credit_or_debit IN ('credit_card', 'debit_card', 'other')),
    card_brand VARCHAR(40),
    gross_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
    discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount <= 0),
    tax_rate NUMERIC(6, 5) NOT NULL DEFAULT 0 CHECK (tax_rate >= 0 AND tax_rate <= 1),
    tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount <= 0),
    net_amount NUMERIC(12, 2) NOT NULL,
    refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (refund_amount <= 0),
    refund_id BIGINT,
    chargeback_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (chargeback_amount <= 0),
    chargeback_id BIGINT,
    update_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT transaction_card_brand_ck CHECK (
        credit_or_debit <> 'other' OR card_brand IS NULL
    ),
    CONSTRAINT transaction_net_amount_ck CHECK (
        net_amount = gross_amount + discount_amount + refund_amount + chargeback_amount
    ),
    CONSTRAINT transaction_tax_calculation_ck CHECK (
        (transaction_type IN ('downgrade_refund', 'general_refund')
            AND tax_amount = -ROUND(ABS(refund_amount) * tax_rate, 2))
        OR (transaction_type NOT IN ('downgrade_refund', 'general_refund')
            AND tax_amount = -ROUND(GREATEST(0, gross_amount + discount_amount) * tax_rate, 2))
    ),
    CONSTRAINT transaction_refund_type_ck CHECK (
        (transaction_type IN ('downgrade_refund', 'general_refund') AND refund_amount < 0)
        OR (transaction_type NOT IN ('downgrade_refund', 'general_refund') AND refund_amount = 0)
    ),
    CONSTRAINT transaction_chargeback_type_ck CHECK (
        (transaction_type = 'chargeback' AND chargeback_amount < 0)
        OR (transaction_type <> 'chargeback' AND chargeback_amount = 0)
    )
);

COMMENT ON COLUMN transaction_records.tax_rate IS
    'Illustrative tax rate assigned from user_records.zipcode; generated rates are sample data, not a production tax source.';
COMMENT ON COLUMN transaction_records.tax_amount IS
    'Tax on discounted gross, recorded as a negative amount on charges and refunds; kept separate from net_amount.';

CREATE INDEX transaction_records_subscription_idx ON transaction_records(subscription_id);
CREATE INDEX transaction_records_schedule_idx ON transaction_records(schedule_id);

CREATE TABLE failed_transactions (
    failed_transaction_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES user_records(user_id),
    subscription_id BIGINT NOT NULL REFERENCES subscription_records(subscription_id),
    transaction_id BIGINT NOT NULL,
    fail_error VARCHAR(40) NOT NULL
        CHECK (fail_error IN (
            'insufficient_funds', 'wrong_zipcode', 'wrong_name',
            'blocked_card', 'wrong_cvc', 'invalid_number'
        )),
    update_ts TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX failed_transactions_subscription_idx
    ON failed_transactions(subscription_id, update_ts);

-- A schedule may be linked to only one successful transaction. These links
-- are added after both tables exist to avoid a creation-order dependency.
ALTER TABLE scheduled_subscription_payment_records
    ADD CONSTRAINT scheduled_payment_transaction_fk
    FOREIGN KEY (transaction_id) REFERENCES transaction_records(transaction_id);

-- Refund and chargeback identifiers refer to transaction_records rows because
-- separate refund_records and chargeback_records schemas have not been defined.
ALTER TABLE transaction_records
    ADD CONSTRAINT transaction_refund_fk
    FOREIGN KEY (refund_id) REFERENCES transaction_records(transaction_id);

ALTER TABLE transaction_records
    ADD CONSTRAINT transaction_chargeback_fk
    FOREIGN KEY (chargeback_id) REFERENCES transaction_records(transaction_id);

-- Price reference (USD):
-- 1 month: $24.99; 3 months: $69.99; 12 months: $274.99.
-- 15OFF applies to the first paid period only (15% discount).
-- Renewal intervals are fixed: 30, 90, and 365 days respectively.
-- One-time purchase amounts: $5.00, $10.00, or $15.00; they require an
-- active subscription and are recorded as transaction_type='one_time_purchase'.
-- marketing_records should retain daily campaign and Directload spend rows
-- across a rolling 10-year history. Randomly generate campaign_name values for
-- SEM, SEO, Affiliate, TV, and Radio, keeping names stable across dates.
-- Use campaign_name='Directload' for its daily row; use zero spend only when
-- confirmed by the source.
