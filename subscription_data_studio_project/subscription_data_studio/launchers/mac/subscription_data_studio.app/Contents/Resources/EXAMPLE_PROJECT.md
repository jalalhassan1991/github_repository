# Subscription Analytics Example Project

Use this compact project to learn the synthetic generator and reporting workflow.

## Generate a repeatable sample

1. Set **Number of users** to `100`.
2. Set **Journey history** to `Past 12 months`.
3. Set **Random seed** to `20261119` and keep **Weighted realistic mix** selected.
4. Keep upgrades, downgrades, one-time payments, declined payments, cancellations, and chargebacks enabled.
5. Generate the dataset, then export the tables you want to explore.

The seed makes the same configuration reproducible. Change it to create a different repeatable sample.

## Suggested Data Dictionary fields

Create these definitions using the app's field picker so the source columns match your schema:

- `state_name`: dimension from `user_records.state`
- `campaign_source_name`: dimension from `user_records.campaign_source`
- `plan_length`: dimension from `subscription_records.subscription_length`
- `net_revenue`: sum measure from `transaction_records.net_amount`
- `transaction_count`: count measure from `transaction_records.transaction_id`
- `new_user_count`: count measure from `user_records.user_id`

## Suggested report modules

- **Revenue trend:** date of `transaction_records.transaction_ts` on X, `net_revenue` on Y, line chart.
- **Revenue by campaign source:** `campaign_source_name` on X, `net_revenue` on Y, bar chart.
- **Plan mix:** `plan_length` on X, `transaction_count` on Y, bar chart.
- **State detail:** `state_name` on X with `new_user_count` and `net_revenue` on Y, spreadsheet.

Refresh modules after setting their axes and filters. The project includes synthetic data only; email addresses use the reserved `example.test` domain and no payment processor is contacted.
