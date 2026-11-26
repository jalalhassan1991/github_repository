# Subscription Data Studio

A browser-based workspace for generating synthetic subscription journeys, defining business metrics, and building interactive reports.

Built by **Jalal Hassan**, this project brings together subscription billing simulation, linked data modeling, a configurable calculation layer, and business intelligence reporting. It includes a portfolio landing page and runs locally without a backend database.

## What you can do

- Generate randomized user journeys with linked subscription, marketing, payment, and lifecycle records.
- Explore acquisition, retention, renewals, failed payments, upgrades, downgrades, refunds, and revenue.
- Define reusable dimensions, dates, and measures using LookML-style definitions and supported SQL-style expressions.
- Build report sheets with draggable, resizable modules, independent filters, charts, spreadsheets, and metric cards.
- Save and load a Studio workspace, share its encoded Instance ID, and export selected tables as CSV.

All generated customer and billing records are synthetic. The generator simulates transactions; it does not process real payments.

## Quick start

1. Download or clone the project.
2. Open [`subscription_data_studio/subscription_data_studio.html`](subscription_data_studio/subscription_data_studio.html) in a modern browser.
3. Use **Generator**, **Data Dictionary**, and **Reporting** to move through the workflow.

The default launch generates **50,000 users with five years of journey history**. The configurable ceiling is **500,000 users**; practical generation and export times depend on your device, browser, and enabled journey features.

Open [`subscription_data_studio/index.html`](subscription_data_studio/index.html) for the portfolio landing page, which links to the Studio.

### Optional local server

If your browser restricts features when opening local HTML files, run this command from the `subscription_data_studio_project` folder with Python 3 installed:

```bash
python3 -m http.server 8000 --bind 127.0.0.1 --directory subscription_data_studio
```

Then open [Subscription Data Studio](http://localhost:8000/subscription_data_studio.html) or the [portfolio landing page](http://localhost:8000/index.html).

Chrome or Edge is recommended for folder selection and large streamed CSV exports. Other browser environments may use downloads as a fallback.

## The three tabs

| Tab | Purpose | Key capabilities |
| --- | --- | --- |
| **Generator** | Create and inspect linked synthetic data | User count, history, seed, weighted distributions, journey options, progress, cancellation, table previews, and selective CSV exports |
| **Data Dictionary** | Define the vocabulary used in reports | Dimensions, dates, measures, CASE expressions, arithmetic, derived calculations, autocomplete, sample evaluation, dependencies, and definition history |
| **Reporting** | Turn definitions into reusable analyses | Named sheets, multiple modules, axis hierarchies, per-module filters, sorting, thresholds, palettes, totals, presentation mode, and canvas formats |

### Generator

The generator models 1-, 3-, and 12-month plans with a seven-day trial and renewal intervals of 30, 90, and 365 days. Journey options include discounts, declined payments and retries, plan changes, cancellations, one-time purchases, refunds, and chargebacks.

Users can have multiple subscriptions over time, but cannot have two active subscriptions simultaneously. Billing and refund behavior follows the project's defined simulation rules rather than a real payment provider's API.

A saved run records its seed, snapshot date, and generation settings. Those inputs allow the same synthetic journeys to be regenerated in batches without keeping every large table in memory.

See the [billing and generation rules](subscription_data_studio/subscription_data_studio_logic.md) for the detailed logic.

### Data Dictionary

Define source fields and reusable calculations in individual cards grouped by type and label. Labels act as folders; definition names identify fields in formulas and reporting.

```text
dimension: customer_state {
  label: "Customer Attributes"
  type: string
  sql: ${user_records.state} ;;
}

date: payment_date {
  label: "Payment Dates"
  type: date
  sql: date(${transaction_records.transaction_ts}) ;;
}

measure: renewal_count {
  label: "Subscription Activity"
  type: sum
  sql: case when ${transaction_records.transaction_type} = 'renewal' then 1 else 0 end ;;
  value_format: numeric
}
```

Supported calculations include CASE, `IN` / `NOT IN`, arithmetic, numeric aggregations, date/string functions, references to other definitions, table statistics, and ordered running/previous/next calculations. This is a supported SQL-style expression language, not a full SQL database or the Looker runtime.

Definition cards show their state with text and color: **red** for errors, **yellow** for unapplied changes, and **green** for valid saved definitions. Clicking outside an editor applies valid changes and closes it; invalid edits stay open with error underlines and a message. Sample evaluation previews values without publishing the draft.

For ordered calculations, `table_partition` groups by defined dimensions, while `table_order` controls sequence independently of report display sorting:

```text
measure: running_renewals {
  label: "Subscription Activity"
  type: running_sum
  sql: {{renewal_count}} ;;
  table_mode: window
  table_scope: visible
  table_partition: customer_state
  table_order: payment_date asc
  value_format: numeric
}
```

Partition/order fields must be present on report axes so each cell has a defined calculation context. Dates belong in `table_order`, not `table_partition`. `running_sum` sums preceding cells and excludes the current cell.

### Reporting

Drag saved Dictionary fields onto a module's X/Y axes. Field order controls nesting and measure splitting. Each module owns its date and dimension filters; there are no global sheet date/dimension filters.

Available visualizations include metric cards, spreadsheets, bar and line charts, Bar+Line, area charts, pie/donut charts, scatter plots, box plots, heatmaps, calendar heatmaps, histograms, funnels, waterfalls, treemaps, and bullet charts.

- **Refresh** calculates one module; **Refresh All** calculates modules on the active sheet.
- Sorting and supported appearance changes reuse cached results without regenerating the dataset.
- Spreadsheet Grand Totals and Subtotals can be toggled independently. Source totals use record IDs to avoid counting the same source record repeatedly across groups.
- Threshold bands support configurable bounds, background colors, and text colors.
- Modules can be duplicated, individually locked against movement/resizing, or supplemented with transparent placeholders.
- Presentation mode hides setup controls. Canvas format choices show page boundaries while preserving module sizes and positions.
- Spreadsheet modules export formatted CSV in their displayed orientation. CSV represents merged header continuations as blank cells.

## Generated tables

| Table | Record grain | Contents |
| --- | --- | --- |
| `user_records` | One user | Demographics, signup information, and campaign attribution |
| `marketing_records` | One campaign/source/day | Spend and applicable actual or estimated marketing activity |
| `subscription_records` | One subscription | Plan, lifecycle status, cancellation details, and financial totals |
| `subscription_change_records` | One subscription change | Status changes, upgrades, and downgrades |
| `scheduled_subscription_payment_records` | One scheduled payment | Renewal timing, amounts, outcomes, and successful transaction links |
| `transaction_records` | One captured financial transaction | Charges, renewals, plan changes, purchases, refunds, and chargebacks |
| `failed_transactions` | One failed attempt | Failure reason and related user, subscription, and transaction IDs |

The [`sample_csv/`](sample_csv/) folder contains example exports. [`sql_schema/`](sql_schema/) contains a SQL schema reference; consult the current application rules and mechanics for the latest behavior.

## Saving and sharing

- **Save Studio / Load Studio:** Export or restore the Dictionary, reports, filters, module settings, and generation recipe in a JSON instance file.
- **Instance ID:** Encode the workspace and generation recipe for another user to import. It is not a hosted account or a live collaborative session.
- **Browser persistence:** Definitions, drafts, reports, and settings are retained in the current browser profile. Use an exported instance when moving between browsers or devices.
- **Dictionary sidecar:** `data_dictionary_definitions.js` provides portable project definitions.

An instance stores the recipe used to recreate synthetic data rather than embedding every generated row. Clearing browser storage removes locally retained state, so export a Studio instance when you need a portable copy.

## Project structure

```text
subscription_data_studio_project/
├── readme.md
├── sample_csv/                         # Example table exports
├── sql_schema/                         # SQL schema reference
├── subscription_data_studio_logic.md   # Top-level logic reference
└── subscription_data_studio/
    ├── index.html                     # Portfolio landing page
    ├── subscription_data_studio.html   # Runnable Studio with embedded code
    ├── subscription_data_studio.js     # Main application source
    ├── studio_reporting_tools.js       # Calculation and reporting utilities
    ├── studio_theme.css               # Studio styling
    ├── data_dictionary_definitions.js  # Portable Dictionary definitions
    ├── subscription_data_studio_instance.json
    ├── build.py                       # HTML/launcher synchronization
    ├── launchers/                     # macOS and Windows browser launchers
    ├── tests/                         # Browser integration checks
    ├── website_upload/                # Website upload bundle
    └── subscription_data_studio_website.zip
```

## Development and validation

The application uses HTML, CSS, and JavaScript, with Web Workers for supported generation and reporting work. Python synchronizes the source into the runnable HTML and launcher copies. Platform-specific launcher builds use Swift on macOS and PowerShell on Windows.

After editing source, run from the project folder:

```bash
python3 subscription_data_studio/build.py --sync-only
```

To build a platform launcher on its corresponding operating system:

```bash
python3 subscription_data_studio/build.py --platform mac
python3 subscription_data_studio/build.py --platform windows
```

These launchers open the application in the default browser; they are not separate native reporting applications.

The reporting integration suite runs in macOS WebKit using Swift and a seeded synthetic dataset:

```bash
python3 subscription_data_studio/tests/run_reporting_workbench_checks.py --widths 1920 1440 1024 768
```

The latest recorded run passed **1,342 checks across four viewport widths**, covering calculations, filtering, refresh, totals, module behavior, and Dictionary editing. See the [saved check results](subscription_data_studio/reporting_workbench_checks.json). This is a browser integration result, not a claim of cross-browser or 500,000-user performance validation.

## Documentation

- [Tab-by-tab guide](subscription_data_studio/SUBSCRIPTION_DATA_STUDIO_GUIDE.md)
- [Calculations, filters, refresh, and application mechanics](subscription_data_studio/SUBSCRIPTION_DATA_STUDIO_MECHANICS.md)
- [Billing and synthetic journey rules](subscription_data_studio/subscription_data_studio_logic.md)
- [Example project](subscription_data_studio/EXAMPLE_PROJECT.md)
- [Sample CSV tables](sample_csv/)
- [Website upload bundle](subscription_data_studio/website_upload/)

## Author

**Designed by Jalal Hassan** — a portfolio project demonstrating synthetic data generation, subscription business modeling, reusable metric definitions, and business intelligence reporting.
