# Data Provenance

Updated 14 Nov 2026.

**Scope of this file:** where every dataset comes from, how it was cleaned or calculated, and how it may be described. It covers all CSVs the backend reads.

## 1. Summary

| File | Module | Rows / coverage | Classification |
|---|---|---|---|
| `data/raw/brent_daily.csv` | 1 | 1,784 rows, 2020-01-02 to 2026-11-03 (53 missing or non-numeric) | Real, observed (uncleaned source) |
| `data/processed/brent_daily.csv` | 1 | 1,731 rows, 2020-01-02 to 2026-11-03 | Real, observed, cleaned |
| `data/processed/forecast_col.csv` | 1 -> 2 | 71 rows, 2023-11-16 to 2026-10-16 | Model output computed from real data (reproducible) |
| `data/processed/levy_training.csv` | 2 | 71 fortnights, 2023-11-16 to 2026-10-31 | Mixed provenance; synthetic label |

## 2. Module 1 data

### 2.1 `brent_daily.csv` (raw and processed)

**Source**
- Daily Brent crude spot price in USD per barrel. The raw column `DCOILBRENTEU` is the FRED series identifier for it.
- Raw file `data/raw/brent_daily.csv`: columns `observation_date, DCOILBRENTEU`.

**Cleaning** (`scripts/clean_brent.py`)
- Entries that are missing or non-numeric (53 rows) are removed. The removed rows account for the whole size difference (1,784 - 53 = 1,731); no values are interpolated.
- Columns are renamed to `date, price`.
- The loader additionally skips any row with `price <= 0`, because the model takes logs.

**Processed file**
- Columns: `date` (ISO), `price` (USD/bbl). 1,731 rows, sorted oldest to newest, no duplicate dates.
- Price range 9.12 to 138.21 USD/bbl.
- Gaps are non-trading days and removed entries. "Trading days" in the model means rows present in this file.

**Classification:** real, observed market data. This is the data behind Module 1's forecasts and the dashboard Brent graph.

### 2.2 `forecast_col.csv`

**What it is:** one crude forecast per levy period. Columns: `period_start, forecast_crude_price`.

**How it is produced**
- `src/gen_forecast_col.cpp` reads the `period_start` dates from `levy_training.csv`.
- For each date it keeps only Brent rows strictly before that date (no look-ahead), calls `forecastMean(..., 10)`, and writes the mean of the next 10 forecasted trading days (USD/bbl, 2 decimals).
- Method details are in `docs/working.md`, section 2.

**Contents:** 71 rows, 2023-11-16 to 2026-10-16, no missing or invalid values. Range 61.36 to 130.84 USD/bbl; 31 rows are above 80 (the `high_crude` threshold).

**Classification:** a forecast, not a market observation. It is deterministic and reproducible from `brent_daily.csv` and the Module 1 code, but it depends on the model version and settings at the time of the run. Regenerate it whenever Brent data or the forecasting code changes.

**Merge into the levy file:** `scripts/regenerate_labels.py` matches `period_start` one-to-one and stops on any mismatch or any forecast that is missing, -1, or not positive.

## 3. Module 2 data: `levy_training.csv`

### 3.1 Bottom line

`levy_training.csv` is a **mixed-provenance training dataset**. It contains direct observations from the supplied CPI and petrol-price files, calculated measures built on them, and several carried-forward or estimated inputs required by the project schema. It is not a fully audited administrative dataset, and `levy_value` is a rule-generated training label, not an observed policy outcome.

Columns: `period_start, period_end, forecast_crude_price, affordability_index, levy_revenue_target_pkr_bn, fiscal_gap_pkr_bn, current_levy, retail_petrol_price, levied_volume_bn_litres, levy_value`. Fortnightly rows, ISO dates, sorted oldest to newest.

### 3.2 Column classification

| Column | Classification | How it was obtained | Observed real-world data? |
|---|---|---|---|
| `period_start`, `period_end` | Carried forward / appended | Copied from the earlier 70-row file and extended with one fortnight (2026-10-16 to 2026-10-31), 71 in total. | Calendar dates are real; not observations from a report. |
| `forecast_crude_price` | Model output | Matched by `period_start` from `forecast_col.csv` (section 2.2). | No. A forecast from real Brent data. |
| `affordability_index` | Calculated | From the supplied CPI file, wage-history image and petrol prices (section 3.4). | No. A constructed indicator with explicit inputs and formula. |
| `levy_revenue_target_pkr_bn` | Carried forward / unverified | Fiscal-year constants copied from the existing file. | No. No source document supplied or verified. |
| `fiscal_gap_pkr_bn` | Calculated estimate | Target minus current levy times estimated volume. | No. Not a reported government balance. |
| `current_levy` | Carried forward / unverified / notified | Existing rate schedule (60.0, 70.0, 77.5, 83.0 PKR/litre); 85.0 for 2026-10-16 (notified petroleum levy 80.0 + climate levy 5.0). | No. Earlier rates not checked against notified price build-ups. |
| `retail_petrol_price` | Direct observation, aligned to fortnight | Pakistan national value from the supplied weekly petrol-price file. | Yes, subject to the source file's own methodology. |
| `levied_volume_bn_litres` | Estimated from reported sales | Annual or quarterly sales converted to litres and spread evenly across days. | Reported tonnes are source data; conversion, allocation and 2026 annualisation are estimates. |
| `levy_value` | Synthetic label | Rule in `docs/working.md`, section 4, applied by `scripts/regenerate_labels.py`. | No. Not an observed petroleum levy. |

### 3.3 Sources

**Direct data sources** (all under `data/raw/`)
- `Consumer Price Index (CPI).csv`: monthly national CPI year-on-year and month-on-month changes.
- `Petrol Price.csv`: weekly city-level prices plus a `Pakistan` national value.
- Fuel-sales reports (internal sales of motor spirit, MS, and high-speed diesel, HSD):
  - `Jul-2023-Jun-2024-ENE-Pak.pdf`: FY2023-24, MS 7,145,004 t; HSD 6,234,221 t.
  - `Jul-Jun-2024-25-ENE-Pak-1.pdf-1.pdf`: FY2024-25, MS 7,603,246 t; HSD 6,858,461 t.
  - `Jul-Jun-2025-26-ENE-Pak-2.pdf`: FY2025-26, MS 7,840,129 t; HSD 7,056,746 t.
  - `Jul-Sep-2026-27-ENE-Pak.pdf`: Jul-Sep 2026, MS 2,043,354 t; HSD 1,569,890 t.
- `MinWageHistory.png`: minimum wage schedule, transcribed: 32,000 PKR/month (FY2023-24), 37,000 (FY2024-25), 40,000 (FY2025-26), 40,700 (FY2026-27). The image separates federal and provincial rates in later years. The 40,000 for FY2025-26 is a provincial reference rate, and 40,700 for FY2026-27 is the federal figure. This is a modelling choice, not one national statutory series.

**Project files used as definitions or carry-forward sources:** `levy_training.csv` itself (schema, period dates, target constants, levy schedule), `forecast_col.csv`, `docs/working.md` (formula definitions) and `scripts/regenerate_labels.py` (label logic and stress threshold).

**Reviewed but not used as inputs:** the import/export reports (`Import-Export-2023-24-Jul-Jun.pdf`, `Import-Export-2024-25-Jul-Jun-2.pdf`, `Import-Export-2025-26-Jul-Jun.pdf`, `Import-Export-2026-27-Jul-Sep.pdf`). They hold monthly import/export quantities, not a crude-price series, levy rate, fiscal target or fiscal gap.

### 3.4 Alignment and transformations

**Periods and petrol price.** 71 fortnightly periods from 2023-11-16 to 2026-10-31. Each row uses the latest Pakistan weekly price with period end on or before the row's `period_end`. This is an alignment convention: the price is a real weekly observation but is not necessarily the one known at the start of the fortnight.

**CPI index.** The CPI file gives monthly change rates, so an index was rebuilt in chronological order and normalised to 100.0 in October 2023. This is not an official base-year CPI.

```text
CPI_index[t] = CPI_index[t-1] x (1 + month_over_month[t])
```

**Affordability index.** The wage reference is chosen by fiscal year (July to June):

```text
affordability_index = min_wage_pkr_month / (40 x retail_petrol_price) x (100 / cpi_index) x 10
```

**Volume estimate.** Tonnes are converted to litres with assumed densities:

```text
MS litres  = MS tonnes  x 1,000 / 0.745
HSD litres = HSD tonnes x 1,000 / 0.832
```

For FY2023-24 to FY2025-26, the annual total is spread evenly over the fiscal year's calendar days (366 for FY2023-24, 365 otherwise). For FY2026-27 only the Jul-Sep report exists, so its quarterly totals are multiplied by four first (an annualisation assumption, not an observed full-year volume).

```text
levied_volume_bn_litres = (annual MS litres + annual HSD litres)
                          x inclusive_period_days / fiscal_year_days / 1,000,000,000
```

The field is rounded to three decimals after calculation.

**Fiscal gap.** A constructed gap, not a reported balance:

```text
fiscal_gap_pkr_bn = levy_revenue_target_pkr_bn - (current_levy x levied_volume_bn_litres)
```

Recomputing it from the rounded CSV volume can differ by up to 0.03 PKR bn.

### 3.5 Training label

`levy_value` follows the rule in `docs/working.md`, section 4. It is not historical truth. The 40th-percentile affordability cut-off over all 71 rows is **28.7910** (29.2176 over the earlier 70 rows). It changes whenever rows are added, and the script recomputes it on every run.

### 3.6 Latest row (71st: 2026-10-16 to 2026-10-31)

| Column | Value | Basis |
|---|---|---|
| `forecast_crude_price` | 126.61 | Matched from `forecast_col.csv` |
| `retail_petrol_price` | 379.34 | Pakistan weekly observation of 29 Oct 2026 (earlier weeks: 395.3 on 15 Oct, 380.74 on 22 Oct) |
| `current_levy` | 85.0 | Notified petroleum levy 80.0 + climate levy 5.0 |
| `levy_revenue_target_pkr_bn` | 65.0 | Carried forward FY2026-27 constant |
| `levied_volume_bn_litres` | 0.812 | Annualised FY2026-27 sales method x 16 days / 365 (0.811773 before rounding) |
| `fiscal_gap_pkr_bn` | -4.0 | 65.0 - 85.0 x 0.811773 |
| `affordability_index` | 20.977 | Federal minimum wage 40,700; Oct 2026 chained CPI index 127.868 (Oct 2026 month-on-month change 0.011) |
| `levy_value` | 64.0 | Stress (20.977 < 28.791) and high crude (126.61 > 80), so multiplier 0.80; required levy 65.0 / 0.812 = 80.049; clipped product 64.0 |

### 3.7 Carried forward or assumed

Replace these before making real-world policy claims or presenting the model as operational:
1. `levy_revenue_target_pkr_bn`: fiscal-year constants inherited from the old file; no budget or IMF document supplied.
2. `current_levy`: inherited rate schedule, not verified against official fortnightly notifications.
3. Density constants, uniform daily volume allocation, and the FY2026-27 annualisation.
4. The single wage reference taken from an image that reports both federal and provincial values.
5. `fiscal_gap_pkr_bn` and `levy_value`: calculated model fields, not government-reported observations.

## 4. How to describe the data

**Module 1 data (Brent and forecast column):**
> Daily Brent crude spot prices (USD/bbl, FRED series DCOILBRENTEU), 2020-01-02 to 2026-11-03, with missing entries removed and no values altered. The forecast column is Module 1's out-of-sample, no-look-ahead 10-day forecast mean for each levy period, reproducible from the cleaned Brent series.

**Levy file:**
> A mixed-source, partially real, fortnightly training dataset. Retail petrol prices, CPI changes and reported fuel-sales totals come from supplied source files. Crude forecasts come from Module 1. Affordability, volume allocation, fiscal gap and the levy label are reproducible calculations. Revenue targets and levy rates are inherited project inputs that still require source verification.

Do **not** describe the levy file as fully real, fully official, or fully observed.

## 5. Making the levy file fully auditable

1. Official fortnightly OGRA / Finance Division price notifications for the levy and price build-up.
2. Budget documents or IMF programme tables for fiscal-year levy collection targets.
3. An archived forecast run (generator version and settings) kept with `forecast_col.csv`, plus a recorded Brent download date.
4. Monthly MS and HSD sales in litres, instead of annual tonnes spread uniformly.
5. A declared wage jurisdiction, or a national statutory wage series.
6. A reported fiscal balance, if `fiscal_gap_pkr_bn` is meant to describe the government budget rather than a modelled levy shortfall.