# Subscription Data Studio: Tab Mechanics

This guide explains what each tab does, where its data comes from, and how actions in one tab affect the others.

## 1. Generator

### Purpose

The Generator creates a linked synthetic subscription dataset. It simulates user journeys and the subscription, marketing, payment, and status records associated with those journeys. It does not contact a payment processor or use real customer data.

### Configure and generate

The Generator accepts a user count from 1 to 500,000, a journey-history window from 90 days to 10 years, and an optional random seed. The launch defaults are 50,000 users and five years of history. The app also starts a default generation run when it launches.

Generation is split into batches of 250 users so the interface can update progress and respond to cancellation while a large run is being created. A numeric seed makes the generated journeys repeatable for the same settings. With weighted distribution selected, plans, campaign sources, user demographics, and other dimensions are sampled with intentionally uneven probabilities rather than divided into equal-sized groups.

Settings for user count, history, seed, distribution, and feature toggles are saved in the current browser profile. The feature toggles control whether the run includes discounts, declined payments, upgrades/downgrades, cancellations, one-time purchases, and chargebacks.

### Tables produced

Each generated run contains these linked tables:

| Table | Role |
|---|---|
| `user_records` | One row per synthetic user, including signup time, campaign attribution, demographic fields, and email |
| `marketing_records` | Daily marketing measurements by source and campaign, including spend and the applicable actual or estimated activity measures |
| `subscription_records` | Subscription lifecycle and current plan/status fields with financial aggregates |
| `subscription_change_records` | Status changes, upgrades, and downgrades over a subscription's lifecycle |
| `scheduled_subscription_payment_records` | Initial and recurring payment schedule rows, their amounts, outcomes, and successful transaction links |
| `transaction_records` | Captured subscription charges, renewals, plan-change charges/refunds, one-time purchases, refunds, and chargebacks |
| `failed_transactions` | Individual failed payment attempts and their failure reasons |

IDs connect users to subscriptions, subscriptions to changes and schedules, and successful transactions to schedule rows. Failed attempts are stored separately from captured transactions. A one-time purchase is attached to the user's active subscription as a transaction; it does not create another subscription record.

The configured plans are 1 month ($24.99), 3 months ($69.99), and 12 months ($274.99). The generator applies the trial, renewal, discount, upgrade/downgrade, cancellation, failed-payment, tax, and refund rules described in [subscription_data_studio_logic.md](subscription_data_studio_logic.md). Refunds in generated data follow the defined unused-full-month rules; unrelated random refunds are not generated.

### Inspect and export

After generation, the summary cards show record counts and journey totals such as upgrades, downgrades, failed payments, refunds, one-time purchases, and chargebacks. The table selector displays a sample of rows; it is not a full-table spreadsheet editor. Integrity checks run on generated batches and the summary reports any detected relationship or revenue-reconciliation warnings.

The export selector controls which tables are exported as CSV. The app uses a folder picker where the browser environment supports it, with browser downloads as a fallback. Large CSVs are streamed or regenerated table-by-table from the run inputs instead of retaining every row in memory. JSON export is limited to smaller runs (up to 1,000 users).

## 2. Data Dictionary

### Purpose

The Data Dictionary defines the dimensions, dates, and measures that Reporting can use. It is the reporting vocabulary layer: it gives fields stable names, types, labels, and calculation rules without changing the generated source tables.

### Definition syntax and field behavior

Definitions are written in a LookML-style code editor. A dimension or date describes a value that can group or filter report records. A measure describes a numeric value and how that value is aggregated.

For example:

```lookml
dimension: plan_length {
  label: "Subscription"
  type: string
  sql: ${subscription_records.subscription_length} ;;
}

dimension: transaction_date {
  label: "Transaction"
  type: date
  sql: ${transaction_records.transaction_ts} ;;
}

measure: net_revenue {
  label: "Revenue"
  type: sum
  sql: ${transaction_records.net_amount} ;;
  value_format: currency
}
```

- The definition name (such as `net_revenue`) is the technical name used in reports and other calculations.
- The label groups related definitions in the sidebar; it behaves like a folder and does not replace the technical name shown on report pills.
- Dimensions are treated as string values. Dates are parsed and displayed as date values.
- Measures use numeric source fields with aggregation types such as sum, count, count distinct, average, minimum, and maximum.
- Custom SQL-style expressions can use supported CASE logic, predicates (including `IN` and `NOT IN`), arithmetic, aggregations, and date/string functions. A saved definition can be referenced by later definitions, so derived fields can be composed from earlier ones.
- Source fields and sample dimension values are suggested while typing. The suggestions assist authoring; the saved expression still must parse successfully.

### Save, evaluate, and persistence

**Save definitions** parses and validates the editor. On success, it updates the available dictionary fields, records definition history, and marks existing reports for refresh because their definitions may have changed. The editor draft and definitions are retained in browser storage. The save action also offers to write a portable `data_dictionary_definitions.js` sidecar file (or downloads it when direct file writing is unavailable). That file can travel with the project and be loaded in another environment.

The separate **Dimension / Measure / Date Evaluation** box evaluates pasted definitions against a repeatable sample from the currently generated data. Its result panel shows sample values and, for measures, aggregate calculations. Evaluation previews are separate from saved dictionary definitions; evaluating a draft does not by itself publish it to Reporting.

The dictionary needs generated data to sample actual table values. Its definitions can be saved before generation, but previews and source-value suggestions may be limited until data exists.

## 3. Reporting

### Purpose and data flow

Reporting turns saved Data Dictionary definitions into reusable report modules arranged on named sheets. The sidebar provides dictionary fields; each module holds its own axes, dimension filters, date range, chart type, display settings, threshold, and title.

A module refresh analyzes the generated journeys and builds the module output using the current dictionary definitions, that module’s date range, and its applied dimension filters. Module results are refreshed on demand, not after every configuration change. **Refresh** recalculates one module; **Refresh All** recalculates all modules on the active sheet, each with its own settings.

### Module filters and dates

There are no global date or dimension filters. Each module has a collapsible **Dimension Filters** section in its setup. Drag a dimension from the Data Dictionary into that module's filter area, then choose values to include or exclude. Filter selections are drafts until **Apply** is clicked; **Clear All** removes the module's applied filters. Multiple filters are combined so a record must satisfy each filter.

The module's **Date Filter** appears below its dimension filters. Select a preset period or a custom date range and click **Apply Date Filter**. Applying either filter type marks only that module stale; refresh it to calculate results with the new settings. **Refresh All** applies each module's independent filter and date range.

A module's date range filters which events contribute to its results, whether or not Date is in the axis pills. A date range does not automatically add dates to a report: dates are displayed or grouped only when a Date dimension is placed in an X or Y axis pill. Without a Date dimension in the axes, the report aggregates the filtered records by the dimensions and measures that were selected.
### Module axes and visualizations

Drag Data Dictionary dimensions and measures into a module's X or Y axis pills. The order of fields in an axis determines their hierarchy. Dimensions can group or split measure values according to their axis position; multiple measures can be displayed together or as individual graphs where supported. Flip Axis swaps the X and Y field lists.

Modules support bar, line, circular, dot/cluster, box, spreadsheet, and single-metric-card views. Chart configuration includes measure layout, legend visibility, date ordering, tick interval where applicable, and optional statistical overlays. Threshold settings are available for eligible single metric cards and spreadsheets; a matching metric value or spreadsheet row is highlighted according to the threshold direction.

Module title and subtitle are editable in the module. Modules can be added, duplicated, removed, resized, and independently hidden or shown. Spreadsheet modules can export their displayed table as CSV; other visualization types do not offer module CSV export.

### Persistence and presentation

Sheet names, module configurations, per-module filters and date ranges, and dictionary definitions are stored in browser-local project state. **Save Studio** packages the workspace and generator settings in a portable instance JSON file. If a generated run is included, the instance stores the run inputs and seed so the app can regenerate that dataset when the instance is loaded; it does not need to embed every generated row.

Presentation Mode shows the report modules for the active sheet without their configuration controls and provides navigation between sheets. It is for presenting the saved report layout; return to the regular view to edit axes, module filters, or module settings.

## How the tabs work together

1. **Generator** creates the synthetic source tables and their relationships.
2. **Data Dictionary** defines named dimensions, dates, and measures over those source tables.
3. **Reporting** uses those definitions to filter, group, aggregate, visualize, and export selected results.

Changing generated data affects the source records used by reports. Changing a saved dictionary definition can change the meaning or availability of a report field. Changing a sheet's date range or applied filters changes which records contribute to modules on that sheet. Modules recalculate when refreshed.
