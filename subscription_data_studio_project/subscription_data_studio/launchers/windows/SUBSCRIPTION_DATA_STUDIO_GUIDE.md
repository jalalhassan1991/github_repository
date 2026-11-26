# Subscription Data Studio: Tab Mechanics

For detailed calculation, filtering, chart, and refresh behavior, see [Subscription Data Studio Mechanics](SUBSCRIPTION_DATA_STUDIO_MECHANICS.md).

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

**Apply** on a definition card validates and publishes that card independently. A changed label, name or type re-sorts the card into its correct group. Invalid edits remain in the card with an inline error, leaving the last valid definition in Reporting. Reports that depend on the changed definition are marked for refresh. **Save definitions** validates and publishes the entire combined draft and offers the portable dictionary sidecar save. On success, it updates the available dictionary fields, records definition history, and marks existing reports for refresh because their definitions may have changed. The editor draft and definitions are retained in browser storage. The save action also offers to write a portable `data_dictionary_definitions.js` sidecar file (or downloads it when direct file writing is unavailable). That file can travel with the project and be loaded in another environment.

**Evaluate Sample** runs inside an opened card without publishing its draft. Dimension/date previews list sorted distinct evaluated values from all available preview records, without user-level rows. The preview says how many records were evaluated; it is not a full-dataset scan. Measures retain a small repeatable row sample and sample aggregate. **Close Evaluator** at the top of the card hides its results without changing its formula.

The dictionary needs generated data to sample actual table values. Its definitions can be saved before generation, but previews and source-value suggestions may be limited until data exists.

## 3. Reporting

### Purpose and data flow

Reporting turns saved Data Dictionary definitions into reusable report modules arranged on named sheets. The sidebar provides dictionary fields; each module holds its own axes, dimension filters, date range, chart type, display settings, threshold, and title.

A module refresh analyzes the generated journeys and builds the module output using the current dictionary definitions, that module’s date range, and its applied dimension filters. Module results are refreshed on demand, not after every configuration change. **Refresh** recalculates one module; **Refresh All** recalculates all modules on the active sheet, each with its own settings.

### Module filters and dates

There are no global date or dimension filters. Select a module and open its **Dimension Filters** setup section. Drag a dimension from the Data Dictionary into that module's filter area, then choose values to include or exclude. Filter selections are drafts until **Apply** is clicked; **Clear All** removes the module's applied filters. Multiple filters are combined so a record must satisfy each filter.

The module's **Date Filter** appears below its dimension filters. Select a preset period or a custom date range and click **Apply Date Filter**. Applying either filter type marks only that module stale; refresh it to calculate results with the new settings. **Refresh All** applies each module's independent filter and date range.

A module's date range filters which events contribute to its results, whether or not Date is in the axis pills. A date range does not automatically add dates to a report: dates are displayed or grouped only when a Date dimension is placed in an X or Y axis pill. Without a Date dimension in the axes, the report aggregates the filtered records by the dimensions and measures that were selected.
### Module axes and visualizations

Drag Data Dictionary dimensions and measures into a module's X or Y axis pills. The order of fields in an axis determines their hierarchy. Dimensions can group or split measure values according to their axis position; multiple measures can be displayed together or as individual graphs where supported. Flip Axis swaps the X and Y field lists.

Modules support bar, line, Pie, Donut, dot/cluster, box, spreadsheet and multi-measure Metric Card views, among other charts. Chart configuration includes bold palettes, measure layout, legend visibility, tick interval where applicable and optional statistical overlays. Threshold settings are available for Metric Cards and spreadsheets.

Module title and subtitle are editable in the module. Modules can be added, duplicated, removed, resized, and independently hidden or shown. Add Placeholder inserts a transparent grid item for reserving space; it can be moved and resized and has no calculation. Spreadsheet modules can export their displayed table as CSV; other visualization types do not offer module CSV export.

### Persistence and presentation

Sheet names, module configurations, per-module filters and date ranges, and dictionary definitions are stored in browser-local project state. **Save Studio** packages the workspace and generator settings in a portable instance JSON file. If a generated run is included, the instance stores the run inputs and seed so the app can regenerate that dataset when the instance is loaded; it does not need to embed every generated row.

Presentation Mode shows the report modules for the active sheet without their configuration controls and provides navigation between sheets. It is for presenting the saved report layout; return to the regular view to edit axes, module filters, or module settings.

## How the tabs work together

1. **Generator** creates the synthetic source tables and their relationships.
2. **Data Dictionary** defines named dimensions, dates, and measures over those source tables.
3. **Reporting** uses those definitions to filter, group, aggregate, visualize, and export selected results.

Changing generated data affects the source records used by reports. Changing a saved dictionary definition can change the meaning or availability of a report field. Changing a module's applied filters changes which records contribute to that module. Modules recalculate when refreshed.

## Report and generator performance

Generation runs in a background worker where supported. Large runs return counts and previews to the page while preserving seeded exports and integrity checks. Report refreshes share generated batches during Refresh All and reuse bounded in-memory aggregate caches when the dataset, definitions, axes, and applied filters agree. Use Recalculate to bypass a module’s cached calculations. Generation duration appears in its status text; module timings are available in Calculation Inspector. Changes to definitions or data invalidate cached results. See performance_benchmarks.json for measured timings and methodology.

## Calculation reliability update

The Data Dictionary now includes lineage, explicit fact-grain validation, definition version comparisons, and a glossary. Module date fields have independent applied ranges, and Calculation Inspector explains sequential exclusions, groups, cache use, and phase timings. New table-window calculations specify visible/filtered scope and series/category/all partitioning; legacy source statistics and percentage scales remain explicit until migrated. Generation, filtering, formulas, and aggregation use workers where supported. See the detailed mechanics guide for syntax, migration behavior, and limitations.

## Reporting interactions

Metric Cards accept multiple measures and fit them into a responsive grid. Pie Chart and Donut Chart support category dimensions and dimension-split measures. Single-dimension legends list the dimension and its values; multi-dimension graphs rely on named hover details. Graphs offer 38 bold Color Palette presets with color previews inside the dropdown. Palette Start is removed, and palettes are not offered for Metric Cards or Spreadsheets. Palette changes redraw the displayed chart without a source scan.

Sort changes redraw displayed results immediately without scanning source data. Other pending changes still require Refresh. A full date axis defaults to Individual Dates. Right arrow groups Dates → Week → Month → Year; left arrow expands in the opposite direction. These are the only date-grouping controls. Weeks start Monday and are clipped to the current month/date window. Calendar Heatmap retains daily cells. Dimension-filter search offers text completion; selecting a suggestion completes the search without applying a filter.

## Compact report layout

The Data Dictionary sidebar defaults to 360px and can be resized between 300px and 480px. Names wrap without nested scrollbars, and the report canvas uses the remaining width. Add Placeholder and Add Report Module are equal-sized buttons next to each other. Transparent placeholders retain their space in Presentation Mode while their editing outline and controls are hidden. Refresh All processes report modules only.

## Free canvas and module controls

The report canvas scrolls downward without displaying scrollbars. Resolution, orientation and fit-to-window controls are removed. Module positions and sizes remain on the 12-column grid.

Click a module to reveal Module Setup to the right of the Data Dictionary card on desktop. Dimension Filters, Calculation Inspector, Configuration and X / Y Axes start collapsed. Open the section you need; its controls apply only to the selected module. Selecting another module switches the controls and collapses all four sections. Data Dictionary and setup interactions keep the module selected so fields can be dragged into its controls. Clicking outside that sidebar and the module hides Module Setup. The floating report action bar remains available. Analysis & Parameters is removed from report modules.

Reports resize from 4–12 columns and 16–80 rows; placeholders from 1–12 columns and 2–80 rows. Align Selected is removed. Layout locking remains available; Undo and Redo buttons are removed.

## Definition cards

The Dictionary groups cards by Dimensions, Dates and Measures, then by label. Each card starts collapsed to its definition name. Open it to edit its formula, Apply the definition, duplicate it, or evaluate and close a sample within the card. Autocomplete suggestions use the same readable font and flat charcoal styling as the Studio. Definitions with the same label share a folder. Parameter definitions remain available in their own group.

Use + Dimension / + Date / + Measure / + Parameter to add a draft. Apply publishes one card; Save definitions publishes all valid cards. Draft and applied source are saved separately in the browser and Studio instances, so unfinished edits remain unapplied after reload or import. SQL autocomplete and dimension-value suggestions work in the card editors. The separate evaluator and Syntax & Auto Complete sidebar are removed.

## Parameters and analysis

Define `parameter: name { ... }` blocks in the Dictionary with `type`, `default`, optional `label`, `min`, `max` and `allowed_values`. Use `PARAMETER('name')` in SQL, including derived measures. Types are number, string and boolean; allowed values use a JSON array. The Mechanics guide contains a complete example.

The Reporting sidebar has no Parameters selection, and Analysis & Parameters is removed from Reporting. Dictionary parameter definitions and calculations remain supported. Existing saved calculation settings remain compatible when loading an instance.

### Date charts, canvas and scrolling

Dates do not populate legends or assign a different color to each point. Date-based line charts connect available values with a continuous line and use one consistent color per measure. Missing dates do not invent zero-valued observations. Multiple measures receive distinct colors and a legend naming those measures; a single measure has no date legend.

The canvas has 12 horizontal cells and extends downward as modules are moved or resized near its bottom. Saved 16- and 24-column layouts migrate proportionally once; placements that overlap after migration move to free cells. The left sidebar stays pinned on desktop layouts when scrolling down. Expanded sidebar content can scroll within the viewport without widening or shrinking the report canvas.


## Function reference and consistent page layout

Generator, Dictionary and Reporting share the Generator page frame, spacing and minimum view height. Longer content can still scroll naturally; the reporting canvas retains its own grid.

The Dictionary starts in definition-editing mode. **Show Functions**, immediately before **Dimension**, opens a searchable reference in place of the definition components; **Hide Functions** restores them. Definition drafts, expanded cards and each view’s scroll position are preserved. The reference does not publish edits or change reports. Search by function or purpose, or filter by category.

Each reference card identifies the calculation stage (row, aggregate or report table), syntax, description and example result. Row examples execute through the expression engine. Aggregate and table examples use small illustrative inputs rather than the current generated dataset. Referenced fields and parameters in complete definition examples must be replaced with definitions from your dictionary. **Copy Example** copies the syntax; when clipboard access is unavailable, selectable text is provided. The reference lists the supported engine functions and predicates, including NULL handling and safe division; it does not claim support for every SQL dialect.

Eligible charts now offer **38 palettes**, including 20 additional presets. Color swatches appear inside the palette dropdown beside each palette name, including the selected choice; there is no separate Configuration preview. Metric Cards and spreadsheets continue to use their existing formatting and threshold controls.

Dates appear on the assigned chart axis. The duplicate date strip beneath charts and Reset Zoom controls are removed, including from cached saved reports. Date grouping arrows remain available.


## Compact sheet controls and moving modules

The Reporting sheet toolbar places Add Sheet, Duplicate Sheet and Delete Sheet at the upper-left, with editable sheet-name tabs directly below. Refresh All and Presentation occupy a single row at the upper-right. It grows in height while retaining the available report width; narrower screens wrap controls. Buttons retain descriptive hover titles. Sidebar instructional paragraphs and the browser-save badge are removed; saving behavior and useful report status remain unchanged.

Drag a module from its surface to move it. A six-pixel movement threshold keeps ordinary chart clicks working. Buttons, editable fields, axis pills and other controls retain their existing interactions. A placement outline previews the snapped grid position, preserving the point where the module was grabbed. Overlapping placements are rejected; cancelling a drag retains the previous position. Each module checkbox locks only that module against movement and resizing.

Transparent placeholders have a faint charcoal outline, strengthened on hover or selection. Presentation mode hides that outline.


### Twelve-column reporting area

The Reporting tab uses its centered layout as a base and expands toward the left to accommodate the wider sidebar, reserving room for the fixed twelve-column canvas, its border and grid gaps. The maximum page width adjusts with the sidebar width so column twelve stays visible on sufficiently wide screens. The twelve-column canvas preserves the former cell width and spacing instead of stretching to fill the page. Vertical scrolling continues downward; smaller windows can pan horizontally without visible scrollbars. Saved layouts are migrated proportionally once, with overlapping modules moved to free cells. Sheet management buttons sit above the left-aligned sheet names; the remaining actions occupy a single top-right row. Undo and Redo buttons are removed.


## Chart scales and sidebar readability

Each date-filter name appears above its own date-window selector. The Calculation Inspector stacks labels and values on separate lines so long labels remain legible in the narrow sidebar.

Line and dot/scatter charts fit their value axis to the actual finite values with a small margin, rather than forcing zero into every range. With Smart Axis Zoom off, standard bars and area charts retain a zero baseline; stacked bars include cumulative totals in their axis range. Bar+Line keeps an independently fitted line scale. The value-axis line remains visible.

Supported charts (bar, line, dot/scatter and Bar+Line) have **Value Axis Scale** under Configuration: **Linear** or **Logarithmic (base 10)**. Logarithmic charts position powers of ten at equal distances and use logarithmic ticks. They require positive finite values. If any plotted value is zero or negative, the chart displays an explanation and asks the user to choose Linear; those values are not silently removed. Logarithmic ticks use powers of ten rather than the linear Tick Interval. Metric Cards, spreadsheets and charts without a supported numeric value axis do not show this option.

Palette and axis-scale changes redraw the captured report aggregates without a source scan. Refresh is still required if the underlying data or definitions have changed. Palette names and saved palette IDs remain compatible; their colors are now deeper and more saturated.


## Wider sidebar and stable scrolling

The Reporting sidebar is 50% wider by default (360px instead of 240px). Its resize range is 300–480px. Existing saved widths migrate once by multiplying by 1.5; newly saved widths retain their size on reload. The layout expands toward the left, preserving the report canvas and toolbar positions where the viewport has sufficient room. Narrower windows keep the page inside the viewport and retain the fixed cell geometry.

When the sidebar pins during page scrolling, an in-flow placeholder preserves its natural height. This prevents the page from shrinking and the browser from pulling the scroll position upward. The pin threshold uses the stable report-grid position. Geometry updates no longer briefly unpin the sidebar, and its reserved height remains stable while pinned. Expanded sidebar contents can scroll independently.


## Numeric value-axis fitting and minimum

Applicable Cartesian charts have **Smart Axis Zoom** and **Value Axis Minimum** in Configuration. Smart Axis Zoom tightens the numeric axis around finite plotted values. Turning it off restores a zero-inclusive linear range; logarithmic scales use broader powers-of-ten bounds. Smart Axis Zoom is enabled by default. Existing modules migrate once to that default; a later on/off choice is retained. Disabling it restores the zero-inclusive linear range.

An explicit minimum takes precedence over Smart Axis Zoom. Entering `30` starts the numeric axis and its first tick at 30 and clips plotted geometry below that boundary. Date and category labels remain outside the clipped plot. Below-minimum points are not moved onto the boundary. The same control applies to the horizontal value axis on flipped bar charts. Bar+Line retains independent numeric scales, applying the entered minimum to both.

Leave the minimum blank to restore automatic bounds. A logarithmic minimum must be positive. If every plotted value is below the minimum, a clear empty-view message prompts the user to lower it. These controls change the presentation only: filters, dates, aggregates and exported source values remain unchanged. Settings persist with the module and redraw compatible captured aggregates without rescanning source records.


## Roomier sidebar setup and date Apply position

**Apply Date Filter** appears below all date-filter fields in both visual and keyboard order. The Module Setup card measures its original collapsed height once and uses 1.5 times that height (three-quarters of the previous doubled height), distributing the added height evenly across its main expandable sections. Open configuration and axis sections have more spacing; date and configuration selectors are taller. The sidebar’s Date, Dimension and Measure folder headers are also twice their former height. Font sizes remain unchanged.


Data Dictionary label folders and definition cards start collapsed. Expand a folder or card to inspect it. Creating, duplicating or applying a definition opens its containing folder when needed so the edited definition remains accessible.


## Renamed date-filter references

Saved filters using `attr_subscription_start_dt` reconnect to the defined `subscription_start_date` daily date when it reads the same `subscription_records.subscription_start_ts` field. The reverse compatibility rename is also supported. Applied and draft filters keep their existing ranges. A grouped month/year, shifted date or arbitrary field is not substituted.

Unresolved date and dimension filters now identify the missing Dictionary field and ask the user to replace or remove it in Module Setup, rather than silently excluding every record. If records match but all selected measures are NULL or otherwise nonnumeric, the report distinguishes that calculation issue from an empty filtered dataset.


## Setup beside Dictionary and floating actions

On desktop, selecting a report opens Module Setup to the right of the Data Dictionary card. Both cards retain their configured width and share a twelve-pixel gap. The workspace expands to accommodate the extra card while the twelve-column canvas keeps its existing cell geometry. When the available window is narrower than the expanded workspace, horizontal page scrolling provides access to the remaining report area. Narrow mobile layouts continue to stack the cards. Clicking outside the selected report and sidebar cards hides Setup and returns to the compact workspace.

The floating action bar measures the report canvas and the complete sidebar area. Its left edge stays over the canvas, its visible width fits the available viewport, and it follows horizontal and vertical scrolling without covering the sidebar cards. When the canvas is entirely offscreen, the action bar is temporarily out of view until the report area is brought back onscreen.


The floating report action bar is constrained to the visible inner canvas bounds. Its contents wrap and are clipped to that area, so they cannot extend into the sidebar. A layout observer realigns the bar when the canvas or sidebar changes size, in addition to scrolling and window resizing.


The selected-report action bar has a dedicated layout row above the canvas. Its measured height, plus a gap, moves all report modules downward; wrapped button rows automatically reserve more room. Hiding the bar removes that space. During page scrolling, chart content is clipped from the area occupied by the pinned action bar so it cannot show underneath the controls. Presentation removes both the action bar and its reserved row.


## Line appearance and assigned date axes

Line charts and the line series in Bar+Line have two display controls in Setup → Configuration:

- **Line-Point Markers:** None (default), Dots, Circles, Donuts or Squares. None hides visible glyphs while retaining transparent hover targets for each actual data point.
- **Line Shape:** Straight Lines (default), Box / Step Lines or Smooth Curved Lines. Step lines move at right angles. Smooth paths use bounded cubic control points so the curve does not overshoot either endpoint of a segment.

Line charts respect the assigned date/category axis: when dates are on Y and measures on X, date labels appear along Y. There is no duplicate date panel below the graph. Line shape and markers work in both orientations. Missing values retain the existing gap/connection rules, and tooltip values remain the underlying values.

Smart Axis Zoom fits the numeric value range rather than changing the date range. It starts enabled and can be switched off. An explicit Value Axis Minimum still overrides the lower bound. Legacy date-focus zoom metadata is cleared once during migration; actual applied date filters and date granularity remain intact. Marker, line-shape and smart-zoom choices are saved with each module and redraw captured results without rescanning source records. Refresh is required when restoring a saved module that has no captured results in the current session.


Enter a Tick Interval in Configuration and press **Enter** to redraw the current chart immediately using captured aggregates. No module refresh or source scan is required. Leaving the field blank and pressing Enter restores automatic ticks. Negative or invalid intervals are rejected. The setting persists across other chart display changes.


## Scheduled-payment calculations and cohort dimensions

Scheduled-payment reporting now uses each payment’s complete final subscription record, including its start date, instead of the partial record captured while generating the journey. Date and custom-dimension filters therefore see the same subscription fields as the exported data.

A scheduled payment can access its successful `transaction_records` row through its `transaction_id`. This is a left join to zero or one captured transaction; it does not join every transaction belonging to the subscription. Reports retain source tables needed only by custom dimensions, including during Refresh All. For example, `DATEDIFF('month', ${subscription_records.subscription_start_ts}, ${transaction_records.transaction_ts})` can group scheduled-payment measures into capture cohorts. Unpaid schedules have no captured transaction and remain in `(Unknown)` unless a filter excludes them. NULL or blank SQL dates stay NULL rather than becoming dates in 1970.

Table-window measures use their aggregated base measures and are not checked as if they require a separate source row. Empty date ranges report no matching records rather than a false missing-fields formula error. Row-formula diagnostics distinguish unusable values from missing data. Source totals, window totals, cohort groups, worker calculations, page fallback and Refresh All are checked against generated rows.

Subscription identifiers now reserve a separate range for each generation batch, preventing reactivations in one batch from colliding with subscriptions in another. Reopen the Studio to regenerate the linked dataset, then refresh reports. Regenerate previously exported CSVs when using the corrected subscription relationships. Dictionary definitions and saved report configurations do not need to be recreated.


## Ordered calculations and report presentation

### Dimension partitions and calculation order

`table_partition` accepts comma-separated **defined dimension names**, excluding dates. Each distinct dimension combination starts an independent calculation window. `table_order` accepts defined dimensions/dates with an optional `asc` or `desc` on each field (default `asc`). Dates belong in `table_order`, not `table_partition`.

```text
measure: prior_renewals {
  label: "renewal_measures"
  type: previous_value
  sql: {{renewals_period_0}} ;;
  value_format: numeric
  table_mode: window
  table_scope: visible
  table_partition: state, subscription_plan
  table_order: payment_date asc, renewal_number desc
}
```

Explicit calculation order takes priority over axis sorting, while the report can display the resulting cells in a different order. Without `table_order`, report sorting controls the calculation sequence. Partition/order fields must be present on report axes: otherwise a cell could contain several different ordering or partition values, and the report shows a validation message rather than choosing an arbitrary source row. Multiple sort keys resolve ties in order; remaining ties use a stable cell key. Date values sort chronologically, numeric values numerically, and text alphabetically.

| Function type | Behavior within each partition |
| --- | --- |
| `running_sum` | Sum of preceding cells, excluding the current cell; starts at 0 |
| `running_difference_value` | Current cell minus previous cell |
| `running_difference_percent` | (Current cell minus previous cell) / previous cell; fraction format, e.g. 0.5 = 50% |
| `previous_value` | Previous cell value; blank at the start |
| `next_value` | Next cell value; blank at the end |

Differences with missing neighbors and percentage differences with a zero denominator return NULL (displayed as a dash). Running sums skip NULL inputs. Running/neighbor measures do not have an additive Grand Total; those total cells are blank. `table_sum` retains the unique-source-record total rather than adding repeated group totals. Other table statistics operate on aggregate cells. Legacy `series`, `category`, and `all` partition keywords remain supported for existing definitions.

### Spreadsheet headers and totals

Single-measure reports omit the visible measure name; the definition remains identifiable in setup, axis pills, hover tooltips, and accessible chart descriptions. Multiple measures retain names. Spreadsheets merge consecutive identical header values within their parent hierarchy, while numeric result cells remain separate. Flip Axis transposes the same merged layout.

Spreadsheet Configuration has independent **Show Grand Total** (on by default) and **Show Subtotals** (off by default) switches. Subtotals close each parent group in a multi-dimension hierarchy. Their calculations use record-ID unions, including recomputed averages and ratios. Colors distinguish total rows/columns. CSV uses displayed formatted values and the same orientation, totals settings, and blank continuations for merged headers; CSV cannot encode cell merging itself. Display-only changes use the cached report results.

### Canvas formats and module locks

A Reporting-only format dropdown before Save Studio offers Current Canvas, A4/Letter/Legal/A3 portrait and landscape, Magazine portrait and landscape, Widescreen 16:9, Standard 4:3, and Square. Each sheet remembers its format. Physical page dimensions use 96 CSS pixels per inch. A faint boundary marks the chosen page; module sizes and positions remain unchanged, and out-of-page modules receive a dashed outline. Wider formats extend horizontal scrolling without stretching the twelve-column grid. This is a layout boundary, not a PDF or image export.

Each module checkbox locks only that module's movement and resizing. Its reporting controls remain available. The old whole-sheet lock is hidden and no longer controls placement. Locked modules show a lock marker and hide drag/resize handles.

### Dictionary card focus

Dates, Dimensions, and Measures remain grouped by label folders. Definition headings match folder typography. Search matches names, labels, physical columns, and SQL text; Expand All / Collapse All affect folders. One definition opens at a time in a larger floating editor, with a Close button and Escape support. Valid changes are applied when switching definitions; invalid drafts are retained until corrected or closed explicitly. Apply validates and publishes the selected definition; metadata shows source/grain/dependencies and edits show a draft indicator. Running functions, partition syntax, and ordering are included in autocomplete and the Function Dictionary.


### Dictionary card closing, deletion, and status

Clicking outside an open definition editor validates and applies valid changes before closing. The definition turns green, changes persist, and dependent reports are marked for refresh. If invalid, the editor stays open and shows its error; the last applied definition remains intact. Clicking inside keeps it open. Escape and the explicit Close button retain their draft-preserving behavior.

Each collapsed definition has a small × delete button. Deletion asks for confirmation, removes both its draft and applied definition, and marks affected reports for refresh. If another definition depends on it, deletion is blocked with the dependent definition names so those references can be updated first. Saved workspaces retain their own dictionary rather than silently restoring deleted bundled defaults.

Cards display both a background color and a text status:

- **Light red — Error:** the definition fails validation; errors take priority over pending changes.
- **Light yellow — Needs saving:** a new or changed definition is not yet applied.
- **Light green — Saved · Valid:** the definition is valid and matches the applied version.

Validation runs shortly after typing, without scanning the generated dataset. It checks the individual draft against applied definitions, so an unrelated unfinished sibling card does not mark a valid card red. Apply validates and saves the selected card. Correcting an error returns the card to yellow until Apply succeeds.


#### Inline editor diagnostics

Open Dictionary editors underline invalid references, unsupported function/type names, or the relevant SQL line in red. The underline uses a transparent, scroll-synchronized mirror, preserving native textarea editing, selection, autocomplete, and resizing. The editor also exposes `aria-invalid` and a readable error message. Corrections remove the underline after validation. Where the parser cannot identify an exact token, the relevant property line is underlined rather than guessing a character position.

Clicking another definition while editing automatically saves valid changes and then opens the intended card, even if the save re-sorts its label folder. Outside navigation is stopped while a definition is invalid; correct it or use Close/Escape to preserve its draft and leave.
