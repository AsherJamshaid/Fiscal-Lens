# Fiscal-Lens: How the System Will Work

Assumes Module 1 and Module 2 are both finished as planned. Written in future tense on purpose; update to present tense once built.

## 1. Big picture

```
Brent daily prices (Module 1 data)
   |  Module 1: log -> difference once -> AR(p) via Levinson-Durbin -> forecast
   v
forecast_crude_price = mean of the next 10 trading days of forecasted Brent (USD/bbl)
   |  (only link between the modules)
   v
Module 2 builds ONE input row for a fortnight, then the regression tree
predicts a multiplier  ->  recommended levy = required_levy x multiplier
```

- Only Brent feeds Module 2. Module 1 will not track retail petrol price (not needed, no graph). USD/PKR is optional and unused by Module 2.
- No live data feeds, no database. Everything is read from CSV files.
- All labels in the levy dataset are synthetic (see section 5).

## 2. Module 1: Commodity Trend Tracker (owner: Module 1 team)

**What it will do**
- Forecast Brent crude and show it on the dashboard graph. USD/PKR is an optional extra graph.
- Provide one number to Module 2: `forecast_crude_price`.

**How**
1. Load Brent daily prices (`date,price`).
2. Take logs, difference once (the "I" in ARI) to remove the trend.
3. Fit AR(p) on the differenced series: `x[t] = c + phi1*x[t-1] + ... + phip*x[t-p] + e[t]`. Coefficients come from the Yule-Walker equations solved with the Levinson-Durbin recursion, O(p^2) per order (naive normal equations are O(p^3)).
4. Choose p by rolling-window validation on past data (current implementation). The blueprint planned AIC/BIC; the final choice must be stated in the report.
5. Forecast recursively, add the predicted differences back onto the last known log price, then take the antilog.
6. `forecast_crude_price` = mean of the forecast for the next 10 trading days, using only data before the cutoff date (no look-ahead).

**Outputs**
- `data/crude_forecasts.csv` (columns `period_start,forecast_crude_price,history_rows,best_p`): one out-of-sample forecast per levy row, used to regenerate the training column and labels.
- A callable `forecastMean(prices_up_to_cutoff, 10)` used by Module 2's live mode.
- The dashboard Brent graph.

**Benchmark (report)**: Levinson-Durbin vs naive solver across p and n; the coefficients must match before timings are compared.

## 3. Module 2: Petroleum Levy Advisor (owner: Module 2 team)

**Data file**: `data/levy_training.csv`, 70 fortnightly rows, ISO dates. Columns: `period_start, period_end, forecast_crude_price, affordability_index, levy_revenue_target_pkr_bn, fiscal_gap_pkr_bn, current_levy, retail_petrol_price, levied_volume_bn_litres, levy_value, levy_band` (`usd_pkr` is removed).

**Tree**: a regression tree written in C++ (`RegressionTree`). It learns the multiplier, not the levy directly:
- Features (8): `forecast_crude_price, affordability_index, levy_revenue_target_pkr_bn, fiscal_gap_pkr_bn, current_levy, retail_petrol_price, levied_volume_bn_litres, required_levy`.
- Split: for each feature, sort the rows, sweep the cut point with running sums, and pick the split with the lowest SSE (`SSE = sum(y^2) - (sum y)^2 / n`). Greedy, recursive, no backtracking. Leaves predict the mean. Cost is O(n log n) per feature per node because of the sort.
- Final levy: `required_levy x predicted multiplier`.

**Testing (default report, no arguments)**
- Chronological split: oldest 80% train, newest 20% test. Never shuffled.
- Depth and leaf size are chosen by walk-forward validation on training rows only.
- Baselines on the same test rows: training mean, previous levy, current levy.
- A shuffled-split run as a diagnostic that the tree recovers the rule; it is not a forecast.
- Error metrics are reported as RMSE/MAE in PKR per litre, not as "accuracy".

## 4. Formulas

```
required_levy       = levy_revenue_target_pkr_bn / levied_volume_bn_litres
affordability_index = min_wage_pkr_month / (40 L x retail_petrol_price) x (100 / cpi_index) x 10
stress              = affordability_index < 27.907      (40th percentile of the 70 rows)
high_crude          = forecast_crude_price > 80
multiplier          = 0.80 (stress and high_crude) | 0.92 (stress only) | 0.95 (high_crude only) | 1.00
levy_value          = clip(round(required_levy x multiplier, 1), 30, 85)     PKR/litre
levy_band           = LOW if levy_value < 55; MEDIUM if < 70; else HIGH
```

Where each piece is used:
- Crude forecast: only in `high_crude`.
- Retail price: only through `affordability_index`, which drives `stress`.
- USD/PKR: not used anywhere.
- `levy_value` is the training label only. It is never an input and is not computed for live rows.

## 5. How one input row is built (`LevyAdvisor`)

| Column | Live mode | Backtest mode | Type |
|---|---|---|---|
| `forecast_crude_price` | `--crude` value from Module 1 | Stored value in that row | Input from Module 1 |
| `retail_petrol_price` | Latest build-up period ending before the period start | Same rule, with data before the chosen date | Carried (retail price lags one fortnight) |
| `current_levy` | Previous period's petroleum levy + carbon levy | Same | Calculated |
| `min_wage`, `cpi_index` | Row of the period's month; latest month if missing | Same | Carried |
| `affordability_index` | Formula above | Same | Calculated |
| `levy_revenue_target`, `levied_volume`, `fiscal_gap` | From the last levy_training row | From the last row before the chosen date | Carried |
| `required_levy` | target / volume | Same | Calculated |

Carry rules:
- Target and min wage are fixed per fiscal year. They change on 1 July and must be updated by hand when the new IMF target and budget wage are known.
- Volume is carried from the latest row, which is a real uncertainty (see section 8).

## 6. Modes and commands

Build (from `src/`, never compile one file alone): `g++ -std=c++17 -O2 RegressionTree.cpp LevyAdvisor.cpp -o tree_test.exe`

- `tree_test.exe` runs the default experiment report.
- `tree_test.exe live --crude <value>` recommends the levy for the next fortnight (the day after the last build-up period). It will be the dashboard's main feature.
- `tree_test.exe backtest YYYY-MM-DD` pretends it is that past date, uses only earlier rows, and compares with the stored row. It verifies the pipeline and can also be shown in the report or frontend as a past-date view.
- Neither mode writes to any CSV. Appending live rows is deliberately not done: they have no real label.

**Debug checks that must always pass** (`backtest 2026-10-01`)
- retail = 326.18, current_levy = 83.0, affordability = 24.933, multiplier = 0.800.
- The levy will differ from the stored 63.4 by about 2.5 PKR/L because the carried volume (0.789) differs from that row's stored volume (0.82). This is expected.

## 7. Regenerating the training data (once Module 1 delivers)

1. Module 1 produces `data/crude_forecasts.csv` (out-of-sample forecasts, no look-ahead).
2. The `forecast_crude_price` column in `levy_training.csv` is replaced with those values.
3. The labels `levy_value` and `levy_band` are recomputed with the rule in section 4. Features and labels must always come from the same crude values.
4. The 27.907 cut-off is checked: it depends only on `affordability_index`, so it changes only if that column changes.
5. The default report is rerun and the before/after results recorded.
6. Live mode's `--crude` is replaced by a direct call to Module 1's `forecastMean`.

## 8. Limitations to state in the report

- The label is a rule we wrote, so a high score means the tree recovered our rule, not that it predicts real levies.
- All commodity and levy data is simulated or model-implied until replaced with real sources (EIA/FRED, SBP, PBS, OGRA, IMF staff reports).
- The recommendation hinges on the crude forecast crossing 80 USD/bbl; a forecast just below or above flips the multiplier and the band.
- Next fortnight's volume is unknown; carrying the latest value adds error.
- Only 70 rows and 14 test rows: small differences between models mean nothing.
- Retail price already contains the levy, so affordability is partly circular. The retail price is lagged one fortnight to reflect what was known.

## 9. File map and ownership

| Path | Owner |
|---|---|
| `src/arima.*`, Brent data, `data/crude_forecasts.csv`, generator tool | Module 1 |
| `src/RegressionTree.*`, `src/LevyAdvisor.*`, `data/levy_training.csv`, `data/raw/petrol_price_buildup_fortnightly.csv`, `data/raw/cpi_and_income_monthly.csv` | Module 2 |
| `frontend/` (remove retail price and USD/PKR from `FEATURES` if not shown) | Frontend pair |
