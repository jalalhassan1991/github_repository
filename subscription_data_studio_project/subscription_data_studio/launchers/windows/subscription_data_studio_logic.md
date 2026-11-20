# Subscription Billing Logic

## 1. Purpose and scope

This document defines the sample billing rules for 1-, 3-, and 12-month subscriptions, including trial billing, discounts, renewals, plan changes, cancellation, declined payments, and creation of user records.

All prices are in USD. The 15% discount is calculated against the plan price and rounded to the nearest cent.

## 2. Plan configuration

| Plan | Term | Price | Price with `15OFF` | Upgrade options | Downgrade options |
|---|---:|---:|---:|---|---|
| 1-month | 1 month | $24.99 | $21.24 | 3-month, 12-month | None |
| 3-month | 3 months | $69.99 | $59.49 | 12-month | 1-month |
| 12-month | 12 months | $274.99 | $233.74 | None | 1-month, 3-month |

Discount formula: `round(plan_price * (1 - 0.15), 2)`. The discount code is `15OFF`.

Discounts apply only to the first paid subscription period (the initial payment billed after the 7-day trial). They do not apply to subsequent recurring renewals. For example, a 1-month subscription using `15OFF` is charged $21.24 for its first paid month, then $24.99 for each later month, before tax.

## 3. Starting a subscription and trial billing

1. When a user starts a subscription, set `trial_start_ts` and begin a 7-day trial.
2. Set `subscription_start_ts` to the timestamp when the 7-day trial ends, and schedule the initial payment for that timestamp.
3. Apply the plan price and, when the code `15OFF` is valid and applied, charge the discounted price.
4. On successful initial payment, set `first_payment_timestamp` to the actual payment timestamp, mark the subscription `ACTIVE`, and create the user record if this is the user's first successful subscription payment.
5. If the initial payment is declined, follow the declined-payment process in section 7.

## 4. Recurring billing

After the first successful payment, charge the selected plan price at fixed-day intervals measured from the initial `first_payment_timestamp` billing anchor:

- 1-month plan: every 30 days.
- 3-month plan: every 90 days.
- 12-month plan: every 365 days.

Keep the renewal anchor unchanged after payment recovery. An upgrade or downgrade resets the renewal cadence: subsequent renewals use the new plan's fixed-day interval (30, 90, or 365 days) from the plan-change timestamp.

Apply any eligible discount to the first successful post-trial payment only. Schedule subsequent renewals at the undiscounted plan price unless another discount rule is explicitly added.

## 5. Upgrades and downgrades

### Upgrades

- A 1-month plan can upgrade to 3 or 12 months.
- A 3-month plan can upgrade to 12 months.
- A 12-month plan has no upgrade option.
- Charge for an upgrade when the user confirms payment.
- Charge the full gross price difference immediately when the user confirms the upgrade: `max(0, round(new_plan_gross_amount - current_plan_gross_amount, 2))`. For example, upgrading from the $24.99 1-month plan to the $69.99 3-month plan costs $45.00; upgrading from the $24.99 1-month plan to the $274.99 12-month plan costs $250.00; and upgrading from the $69.99 3-month plan to the $274.99 12-month plan costs $205.00. Discounts and tax remain separate transaction amounts and do not change this gross-price difference. Store the positive charge in `gross_amount`; this is a tier-price adjustment, not a time-based proration. Do not add prorate fields.
- Start a new renewal cadence using the upgraded plan length from the upgrade timestamp.

### Downgrades

- A 3-month plan can downgrade to 1 month.
- A 12-month plan can downgrade to 1 or 3 months.
- A 1-month plan has no downgrade option.
- Apply the downgrade immediately when initiated.
- Downgrade refunds cover the unused full months in the current paid term, excluding the current month and retaining the months included in the downgraded plan. Calculate `refund_months = max(0, remaining_full_months - (new_plan_length - 1))`, then `refund_amount = -round(current_term_amount_paid / current_plan_length × refund_months, 2)`. `current_term_amount_paid` is the amount actually paid for the current term after discounts and recovery proration. For a full-price 12-month plan started January 17, 2026 and downgraded May 1, 8 full months remain after the current month; a 3-month plan retains 2 of those months, so refund the other 6 at the 12-month monthly rate: `$274.99 ÷ 12 × 6 = $137.50`. Record a negative amount in `refund_amount` on a `downgrade_refund` transaction, linked to the original charge. Tax is recorded separately. Do not add prorate fields.
- Start a new renewal cadence using the downgraded plan length from the downgrade timestamp.
- The current paid month is never refunded. Count full calendar months from the current billing-term anchor, clamp month ends to the last calendar day, and round the final refund to cents.

## 6. User-requested cancellation

When the user requests cancellation:

1. Set `subscription_status` to `pending_cancellation` and `cancel_status` to `user`.
2. For 3-month and 12-month plans, refund the unused full months after the current month: `refund_amount = -round(current_term_amount_paid / plan_length × remaining_full_months, 2)`. Link the `general_refund` transaction or transactions to the original charge(s). Use the actual amount paid for the current term, after discounts or payment recovery proration. A 1-month cancellation has no refundable full month.
3. Keep access through the end of the current paid subscription period and remove unpaid future renewal schedules.
4. At the end of that period, set `subscription_status` to `cancelled` and retain `cancel_status = 'user'`.

## 7. Declined payments and retries

When a subscription payment is declined, freeze the subscription immediately: suspend subscription access/benefits and do not advance or reset the renewal anchor while the payment is unresolved.

1. Set `subscription_status` to `pending_cancellation` and `cancel_status` to `failed_payment`.
3. Schedule retries for day 1, day 3, and day 7 after the initial declined transaction.
4. If payment remains declined after 7 days, set `subscription_status` to `cancelled`, set `cancel_status` to `failed_payment`, and record the end timestamp.
5. If a retry captures payment, unfreeze the subscription and charge a prorated amount based on the time elapsed since the failed payment was due. Keep the original renewal anchor and existing renewal periods; the recovery charge does not start a new billing cycle.

For example, if a renewal payment fails and is successfully captured 3 days later, charge the prorated amount for the elapsed 3 days, then retain the original renewal date as the next renewal anchor.

The precise day-count convention and rounding rule for recovery proration are not specified; use one consistent documented convention.

## 8. User record creation

Create one row in `user_records` when a user's first subscription payment succeeds. Set `signup_ts` to the timestamp of that first successful payment.

| Field | Type | Rule |
|---|---|---|
| `user_id` | Number | Unique numeric identifier |
| `signup_ts` | Timestamp | First successful subscription payment timestamp |
| `campaign_source` | Varchar | Campaign source looked up from the attributed row in `marketing_records` |
| `campaign_name` | Varchar | Campaign name looked up from the same attributed row in `marketing_records` |
| `first_name` | Varchar | Generated first name |
| `last_name` | Varchar | Generated last name |
| `state` | Varchar | U.S. state |
| `city` | Varchar | City in the assigned state |
| `zipcode` | Varchar | ZIP code consistent with the city and state |
| `dob` | Date | Random date for an adult aged 18 through 80 at record creation |
| `email` | Varchar | `{first_name}.{last_name}.{DOB}@{random_domain_name}.com` |
| `update_ts` | Timestamp | Timestamp when this user record was last updated |

Use a stable date format in generated email addresses, such as `YYYY-MM-DD`, and normalize names consistently for the email local part. Populate `campaign_source` and `campaign_name` from the same applicable `marketing_records` campaign row; do not randomize these user fields independently. The attribution date and selection rule (for example, last touch before subscription start) still need to be defined so the correct campaign row is selected.

## 9. `marketing_records` table

Maintain daily marketing-spend records for every marketing campaign and for `Directload`, covering a rolling 10-year history.

| Field | Type | Rule |
|---|---|---|
| `marketing_record_id` | Number | Unique identifier for each daily marketing record |
| `date` | Date | Calendar day the marketing activity and spend apply to |
| `campaign_source` | Varchar / enum | One of `SEM`, `SEO`, `Affiliate`, `Directload`, `TV`, or `Radio` |
| `campaign_name` | Varchar | Randomly generated campaign name for `SEM`, `SEO`, `Affiliate`, `TV`, and `Radio`; for `Directload`, set the value to exactly `Directload` |
| `views` | Number, nullable | Measured views/impressions for `SEM`, `SEO`, and `Affiliate`; null for other sources |
| `views_est` | Number, nullable | Estimated views/impressions for `TV` and `Radio`; null for other sources |
| `clicks` | Number, nullable | Clicks for `SEM`, `SEO`, and `Affiliate`; null for other sources |
| `visits` | Number, nullable | Directly measured visits for `SEM`, `SEO`, `Affiliate`, and `Directload`; null for `TV` and `Radio` |
| `cost` | Currency / decimal | Total marketing spend for that campaign/source on that date, stored as a fixed-precision amount in USD under the current model |
| `visits_est` | Number / decimal, nullable | Estimated visits for `TV` and `Radio`; null for other sources |
| `update_ts` | Timestamp | Timestamp when the marketing record was last updated |

Create one row per campaign per day, and one `Directload` row per day. Randomly assign campaign names to campaigns in `SEM`, `SEO`, `Affiliate`, `TV`, and `Radio`, keeping each campaign name consistent across its daily records. For `Directload`, always use the campaign name `Directload`. A unique constraint on (`date`, `campaign_source`, `campaign_name`) prevents duplicate daily records while allowing multiple campaigns for a source on the same day. Keep records for the most recent 10 years and remove or archive older records according to the retention policy. Store counts as nonnegative values. Leave metrics outside each source's defined set null: `Directload` has only `visits` and `cost`; `TV`/`Radio` have only `views_est`, `visits_est`, and `cost`; `SEM`/`SEO`/`Affiliate` have only `views`, `clicks`, `visits`, and `cost`.

## 10. Suggested subscription fields

At minimum, a subscription record should retain:

- `subscription_id`, `user_id`, and plan term.
- `trial_start_ts`, `subscription_start_ts` (trial end), and `first_payment_timestamp`.
- List price, currency, discount code/rate, and amount charged.
- `next_payment_timestamp` and billing interval.
- Current status and cancellation reason.
- Upgrade/downgrade history, effective timestamps, and refund details when applicable.
- Payment attempts, outcomes, and retry schedule.

## 11. `subscription_records` table

Users may have multiple subscription records over time. Create one row for each subscription lifecycle. A reactivation after a subscription has been cancelled creates a new row with a new `subscription_id` and `subscription_type` set to `reactivation`; retain the same `user_id` for the returning user. A user must not have more than one subscription with `subscription_status = 'active'` at the same time. Cancelled subscription records remain as history.

| Field | Type | Rule |
|---|---|---|
| `user_id` | Number | References `user_records.user_id` |
| `subscription_id` | Number | Unique identifier for each subscription record/lifecycle |
| `subscription_length` | Number | Term length in months of the latest plan tied to this subscription; update when the user upgrades or downgrades |
| `trial_start_ts` | Timestamp | Timestamp when the subscription trial starts |
| `subscription_start_ts` | Timestamp | Timestamp when the 7-day trial ends and the paid subscription period starts |
| `subscription_end_ts` | Timestamp, nullable | Timestamp when the subscription was cancelled; null while not cancelled |
| `subscription_type` | Varchar / enum | `new_subscription` for the user's first subscription; `reactivation` for a subscription created after the user's earlier subscription was cancelled |
| `subscription_status` | Varchar / enum | One of `trial`, `active`, `pending_cancellation`, `cancelled` |
| `cancel_status` | Varchar / enum, nullable | `user` or `failed_payment` when cancellation is pending or completed; null for trial/active subscriptions |
| `gross_revenue` | Number / decimal | Sum of `gross_amount` for captured new subscription, renewal, upgrade charge, and one-time purchase transactions, before discounts and tax |
| `total_discount` | Number / decimal | Positive sum of the absolute `discount_amount` values across captured transactions |
| `net_revenue` | Number / decimal | Sum of signed `net_amount` values for this subscription; includes discounts, refunds, and chargebacks, and excludes tax |
| `total_tax` | Number / decimal | Net tax balance; charge tax is negative and tax reversed on refunds offsets it |
| `total_transactions` | Number | Count of captured transaction records tied to this subscription; declined attempts are excluded |
| `failed_transactions` | Number | Count of related rows in `failed_transactions` |
| `refunds` | Number / decimal | Sum of signed refund amounts; refunds are negative |
| `chargebacks` | Number / decimal | Sum of chargeback revenue attributed to this subscription, stored as a fixed-precision monetary amount |
| `last_update_ts` | Timestamp | Timestamp when this subscription record was most recently updated |

### Subscription record rules

- `subscription_id` is unique for each lifecycle. `user_id` links to the user who owns it.
- A `user_id` may appear in multiple subscription records, but may have at most one record with `subscription_status = 'active'`. Enforce this with a partial unique index. A cancelled subscription can be followed by a reactivation record for the same user.
- Set `trial_start_ts` when the user enters the trial. Set `subscription_start_ts` to `trial_start_ts + 7 days`, when the trial ends and the paid subscription period starts. Set `subscription_end_ts` when the subscription reaches `cancelled`; leave it null in other statuses.
- `subscription_status` begins as `trial` during the 7-day trial, changes to `active` after the first successful payment, becomes `pending_cancellation` when cancellation is scheduled, and becomes `cancelled` when cancellation takes effect.
- Set `cancel_status` to `user` when the user requests cancellation and `failed_payment` when failed payment retries cause cancellation. Keep it null for subscriptions with no pending or completed cancellation.
- Set `subscription_type` to `new_subscription` for the user's first subscription. After a prior subscription is cancelled, a subsequent subscription for that user is `reactivation`.
- Set `subscription_length` to the current plan term (1, 3, or 12 months) and update it whenever a plan change takes effect. Preserve prior plan terms and effective dates in plan-change history.
- Recalculate `gross_revenue`, `net_revenue`, `total_discount`, and `total_tax` from captured `transaction_records` tied to the subscription. `gross_revenue` sums charge-type `gross_amount` before discounts and tax. `net_revenue` is the sum of `net_amount` and excludes tax. `total_discount` stores the positive magnitude of discounts. `total_tax` is the net tax balance: negative charge tax offset by tax reversed on refunds. Keep amounts and currency consistent; the current model assumes USD.
- Set `total_transactions` to the count of captured transaction records and `failed_transactions` to the count of matching `failed_transactions` rows. Failed attempts do not count as transactions in this aggregate.
- Set `refunds` to the signed sum of refund transaction amounts (negative); set `chargebacks` to the positive total value of chargeback transactions.
- Preserve each plan change and resulting plan length in `subscription_change_records`; retain the upgrade charge or full-month downgrade refund in `transaction_records`.
- Update `last_update_ts` whenever any subscription field or derived aggregate changes.
- Record each upgrade or downgrade event, resulting plan length, and change timestamp in `subscription_change_records`; retain the upgrade charge or full-month downgrade refund in `transaction_records`. The change timestamp starts the new renewal cadence. A single `upgrade_or_downgrade` field alone cannot represent multiple changes over one subscription lifecycle.

The `user_records` and `transaction_records` relationships should be enforced as foreign keys when implemented. `scheduled_payment_records` remains undefined.

## 12. `subscription_change_records` table

Store a history row whenever a subscription is modified, including status changes and plan upgrades/downgrades. Each row records the status and plan length after the modification.

| Field | Type | Rule |
|---|---|---|
| `user_id` | Number | References `user_records.user_id` |
| `subscription_id` | Number | References `subscription_records.subscription_id` |
| `subscription_change_id` | Number | Unique identifier for each subscription-change record |
| `subscription_status` | Varchar / enum | Status after the modification: `trial`, `active`, `pending_cancellation`, or `cancelled` |
| `cancel_reason` | Varchar / enum, nullable | Cancellation reason from `subscription_records.cancel_status`: `user` or `failed_payment`; null when not applicable |
| `subscription_length` | Number | Plan length in months after the modification: `1`, `3`, or `12` |
| `change_reason` | Varchar / enum | `upgrade`, `downgrade`, or `status_change` |
| `change_ts` | Timestamp | Timestamp when this change record was created |
| `update_ts` | Timestamp | Timestamp when this subscription-change record was last updated |

Insert a new row for every subscription modification; do not overwrite prior history. Use `status_change` when the status changes and `upgrade` or `downgrade` when the plan length changes. Record the resulting status and length on each row. Enforce foreign keys to the user and subscription records.

## 13. `scheduled_subscription_payment_records` table

Populate this table when a subscription is created with its scheduled future payment records, and retain those records after each renewal period has passed. Generate a three-year schedule horizon using the plan active at subscription creation:

- 1-month plan: 36 scheduled payment records.
- 3-month plan: 12 scheduled payment records.
- 12-month plan: 3 scheduled payment records.

The first payment is scheduled at `subscription_start_ts`, which is 7 days after `trial_start_ts`. Subsequent scheduled payments follow the plan's fixed-day renewal interval from the first successful payment anchor: 30 days for the 1-month plan, 90 days for the 3-month plan, and 365 days for the 12-month plan. When a plan changes, use the new plan length to establish the subsequent renewal cadence and update applicable future schedule rows to the new due dates and plan price. Preserve completed schedule rows as history. Do not create duplicate schedule rows for a renewal.

| Field | Type | Rule |
|---|---|---|
| `user_id` | Number | References `user_records.user_id` |
| `subscription_id` | Number | References `subscription_records.subscription_id`; needed to associate each schedule with its subscription |
| `transaction_id` | Number, nullable | References the successful transaction in `transaction_records` that completed this scheduled payment; null until a payment is successfully captured |
| `renewal_number` | Number | Sequential schedule number within a subscription; use `1` for the initial post-trial payment, then increment for each renewal |
| `scheduled_payment_ts` | Timestamp | Timestamp when the scheduled payment is due |
| `transaction_ts` | Timestamp, nullable | Timestamp when the successful transaction was captured; null until successful capture |
| `gross_amount` | Number / decimal | Gross plan amount before discount, for this scheduled payment |
| `discount_amount` | Number / decimal | Discount amount applied to this scheduled payment; zero if none |
| `scheduled_amount` | Number / decimal | Amount scheduled after discount and before tax (`gross_amount - discount_amount`) |
| `tax_amount` | Number / decimal | Tax amount scheduled for this payment, stored as a negative amount |
| `declined_transactions` | Number | Count of declined attempts associated with this scheduled payment, including retries |
| `payment_status` | Varchar / enum | Recommended operational field: `scheduled`, `paid`, `past_due`, `cancelled`, or `superseded` |
| `update_ts` | Timestamp | Timestamp when this scheduled-payment record was last updated |

### Scheduled payment rules

- Use a unique constraint on (`subscription_id`, `renewal_number`) so each subscription has only one schedule row for each renewal number.
- `scheduled_amount` is before tax; with negative `tax_amount`, the total charge is `scheduled_amount - tax_amount`. Keep all amounts as fixed-precision decimals and use the subscription currency (USD under the current rules).
- Create the initial payment schedule at `subscription_start_ts` (7 days after `trial_start_ts`). After the first successful payment, set the recurring renewal anchor and schedule later payments at intervals of 30, 90, or 365 days according to the active plan.
- Populate `transaction_id` and `transaction_ts` only when a transaction successfully captures the scheduled payment. Link only the successful transaction that completed the schedule; declined attempts are recorded individually in `failed_transactions` and counted in `declined_transactions`.
- When a payment is declined, keep the schedule row and its original `scheduled_payment_ts`. Increment `declined_transactions` for each declined attempt and use the retry cadence in section 7. If payment succeeds on retry, attach that successful transaction without moving the renewal anchor.
- Keep past and completed schedule rows for history. When a plan change affects future charges, recalculate due dates using the new subscription length (30, 90, or 365 days) from the plan-change timestamp. Update only unpaid future rows and record the change in `subscription_change_records`.
- When a subscription is cancelled, remove all future unpaid renewal rows from `scheduled_subscription_payment_records`; retain completed and past-due payment rows as history. Do not leave cancelled future renewals in the schedule table.
- If a subscription is frozen after a failed payment, keep its scheduled row and due timestamp; recovery follows the declined-payment proration rules in section 7.

The user referred to the table as both `scheduled_subscription_payments` and `scheduled_subscription_payment_records`; this document uses `scheduled_subscription_payment_records` consistently. `payment_status` is added because amount and timestamp fields alone cannot distinguish pending, paid, cancelled, and superseded schedule rows.

## 14. `failed_transactions` table

Store one row for every declined payment attempt, including the initial decline and each failed retry. Successful captures belong in `transaction_records`, not here.

| Field | Type | Rule |
|---|---|---|
| `user_id` | Number | References `user_records.user_id` |
| `subscription_id` | Number | References `subscription_records.subscription_id` |
| `transaction_id` | Number | Identifier for the failed payment attempt; it is not a foreign key to captured transactions in `transaction_records` |
| `failed_transaction_id` | Number | Unique identifier for this failed-attempt record |
| `fail_error` | Varchar / enum | One of `insufficient_funds`, `wrong_zipcode`, `wrong_name`, `blocked_card`, `wrong_cvc`, or `invalid_number` |
| `update_ts` | Timestamp | Timestamp when this failed-attempt record was last updated; set to the attempt time when first recorded |

Insert a new row for each declined attempt and retain its error reason. Retry attempts on days 1, 3, and 7 are separate failed-attempt rows when they are declined. A successful retry is recorded in `transaction_records`; it is not another failed row. Link failed attempts to the applicable scheduled payment through the shared `subscription_id` and the schedule's `declined_transactions` count, since this table does not currently carry a schedule ID.

## 15. `transaction_records` table

Create one transaction record for each captured financial transaction associated with a subscription, including successful charges and processed refunds. Declined attempts are recorded in `failed_transactions`, not in this table.

| Field | Type | Rule |
|---|---|---|
| `user_id` | Number | References `user_records.user_id` |
| `subscription_id` | Number | References the subscription record in `subscription_records`; that table's schema is not yet defined |
| `transaction_id` | Number | Unique identifier for each transaction |
| `schedule_id` | Number, nullable | References the scheduled payment record this transaction is tied to; `scheduled_payment_records` is not yet defined. Use null when the transaction is not tied to a scheduled payment |
| `transaction_ts` | Timestamp | Timestamp when the transaction was made or processed |
| `transaction_type` | Varchar / enum | One of `new_subscription`, `renewal`, `upgrade_charge`, `downgrade_refund`, `one_time_purchase`, `general_refund`, `chargeback` |
| `payment_processor` | Varchar | Processor or payment method used, such as `stripe`, `apple_pay`, or `google_pay`; randomly assign for generated sample data |
| `credit_or_debit` | Varchar / enum | Payment source category: `credit_card`, `debit_card`, or `other` |
| `card_brand` | Varchar, nullable | Card brand such as `visa`, `american_express`, or `mastercard`; null if not a card payment |
| `gross_amount` | Currency / decimal | Nonnegative gross transaction charge before discount and tax |
| `discount_amount` | Currency / decimal | Discount as a negative amount; zero when none |
| `tax_rate` | Percentage / decimal | Tax rate selected from the user's `user_records.zipcode`; stored as a fraction, such as `0.0725` for 7.25% |
| `tax_amount` | Currency / decimal | Negative tax on the discounted gross amount for charges and on the refunded principal for refunds; zero when no taxable amount applies |
| `net_amount` | Currency / decimal | Signed transaction amount excluding tax: gross plus discount, refund, and chargeback amounts |
| `refund_amount` | Currency / decimal | Refund value as a negative amount; zero when no refund applies |
| `refund_id` | Number, nullable | Identifier linking an original transaction to its refund transaction in `transaction_records` |
| `chargeback_amount` | Currency / decimal | Chargeback value as a negative amount; zero when no chargeback applies |
| `chargeback_id` | Number, nullable | Identifier linking an original transaction to its chargeback transaction in `transaction_records` |
| `update_ts` | Timestamp | Timestamp when this transaction record was last updated |

### Transaction record rules

- `transaction_id` must be unique and stable. `user_id` and `subscription_id` must identify the user and subscription related to the transaction.
- Calculate `net_amount = gross_amount + discount_amount + refund_amount + chargeback_amount`; exclude tax from `net_amount`. Keep tax separate from both `gross_amount` and `net_amount`.
- `net_amount` excludes tax. Because `tax_amount` is stored as negative, calculate cash movement by transaction direction: a charge collects `net_amount - tax_amount`, while a refund returns `net_amount + tax_amount` (both values are negative for the refund). For example, a $100 charge with $8 tax is `net_amount = 100`, `tax_amount = -8`, for $108 collected; its full refund is `net_amount = -100`, `tax_amount = -8`, for $108 returned.
- Assign `tax_rate` by looking up the user's zipcode. Calculate tax on discounted gross (`gross_amount + discount_amount`), round to cents, and store `tax_amount` as a negative amount. For a refund, store the refunded principal as a negative `refund_amount` and store the associated tax amount as negative as well. Synthetic tax rates are illustrative and must not be used for real tax collection.
- An upgrade charge uses `transaction_type = 'upgrade_charge'` and stores the positive price difference in `gross_amount`. A downgrade refund uses `transaction_type = 'downgrade_refund'` and stores the calculated negative refund for eligible unused full months in `refund_amount`; link its refund transaction from the original charge through `refund_id`. Do not duplicate these amounts in prorate columns.
- A standalone refund uses `general_refund`; chargebacks use `chargeback`. Link each original transaction to its refund or chargeback transaction ID. If one refund must be allocated across multiple original charges, create one linked refund transaction per original charge. Renewal and one-time purchase charges use the same zipcode-based tax lookup.
- Synthetic generation creates refunds only for eligible downgrades and 3-month/12-month cancellations, using the full-month policy above. It can also add a `chargeback` for about 1% of journeys. Each reversal is a separate transaction linked from an original eligible charge through `refund_id` or `chargeback_id`; chargebacks can be disabled in Generator settings. Small samples may contain zero chargebacks.
- Store these fixed-precision amounts in USD under the current model; add a currency column if multiple currencies are introduced.
- A transaction tied to a scheduled payment should carry that payment's `schedule_id`. Keep the schedule relationship nullable for unscheduled transactions, such as an immediate upgrade charge or refund, unless a schedule record is explicitly created for it.
- Record a standalone refund as its own transaction with `transaction_type` set to `general_refund`, and set the original transaction's `refund_id` to the refund transaction's `transaction_id`.
- Record a chargeback as its own transaction with `transaction_type` set to `chargeback`, and set the original transaction's `chargeback_id` to the corresponding chargeback record identifier.
- `payment_processor` and `card_brand` values may be randomized in synthetic data, but production values must reflect the actual processor/payment instrument. `card_brand` is null for non-card methods.
- Although the relationships are described as joins, enforce referential integrity as foreign keys when the related table schemas are available; use left joins when querying optional schedule, refund, or chargeback details.

The generator currently uses this illustrative zipcode-to-rate lookup:

| Zipcode | Rate | Zipcode | Rate | Zipcode | Rate |
|---|---:|---|---:|---|---:|
| `92101` | 7.25% | `12207` | 6.50% | `78701` | 8.25% |
| `98101` | 8.75% | `80202` | 7.80% | `60601` | 9.00% |
| `02108` | 6.00% | `30303` | 7.50% | `85004` | 8.50% |
| `97201` | 7.00% | `33602` | 6.50% | `28202` | 7.25% |

For a zipcode outside this sample map, the generator uses a 7.50% illustrative fallback. Replace this sample lookup with an authoritative tax calculation source before any real billing use. Refund and chargeback links refer to their corresponding transaction rows; separate refund/chargeback tables are not defined here.

## 16. One-time purchases

Offer one-time purchase amounts of $5.00, $10.00, and $15.00 USD. A one-time purchase must be associated with the user's current active subscription and recorded as a transaction. It does not create a row in `subscription_records` and does not change the subscription term, renewal anchor, or scheduled-payment records.

For each successful purchase, create a `transaction_records` row with `transaction_type` set to `one_time_purchase`, and populate its `user_id` and `subscription_id` from the current active subscription. Since it is not a scheduled recurring payment, leave `schedule_id` null. The transaction amount should be the selected one-time purchase amount, with applicable tax recorded according to the transaction amount/tax conventions.

Do not allow attachment to a cancelled, pending-cancellation, trial, or otherwise inactive subscription; the purchase requires a subscription with `subscription_status` equal to `active` at purchase time.

## 17. Status and cancellation reason values

Statuses used by these rules:

- `TRIALING`
- `ACTIVE`
- `PENDING_CANCELLATION`
- `CANCELLED`

Cancellation reasons:

- `USER`
- `DECLINED_PAYMENT`

## 18. Synthetic generator distributions

The generator samples subscription ages and categorical attributes independently for each user; it does not assign users to evenly sized buckets. Subscription start ages use `10 + floor(random^1.55 * (history_days - 10))`, which favors more recent journeys while retaining samples across the selected history. User ages are similarly weighted toward younger adults within the configured 18-to-80 range.

Major categorical weights are intentionally uneven: subscription plans are sampled at 50% 1-month, 33.3% 3-month, and 16.7% 12-month; campaign sources at 31% SEM, 22% SEO, 16% Affiliate, 12% Directload, 11% TV, and 8% Radio. Locations, names, campaign names, processors, and card brands also use weighted random selection. A fixed random seed makes a generated dataset reproducible.

