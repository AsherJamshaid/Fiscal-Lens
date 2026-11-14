# Model Metrics and Benchmarks

Updated 14 Nov 2026.

**Scope of this file:** what the two models score, what each score means in plain language, and which scores the dashboard shows.

Numbers below come from the current 71-row `levy_training.csv` and 71-row `forecast_col.csv`. Rerun and update this file after any data or code change (section 6).

## 1. How to read the scores

Every score here compares a **prediction** with what **actually** happened. The difference is the **error**.

**Tiny example.** Actual levies are 60, 62, 70 and the model predicts 61, 62, 64. The errors are 1, 0 and 6.

| Score | What it is | Example | How to read it |
|---|---|---|---|
| **MAE** (mean absolute error) | Average size of the errors, ignoring direction. | (1 + 0 + 6) / 3 = **2.33** | "On average we are off by 2.33." Same unit as the thing predicted. |
| **RMSE** (root mean squared error) | Like MAE, but big misses count more. | sqrt((1 + 0 + 36) / 3) = **3.51** | Bigger than MAE when one miss is large. A large gap between RMSE and MAE means a few big misses. |
| **MAPE** (mean absolute percentage error) | Each error as a % of the actual value, averaged. | (1.7% + 0% + 8.6%) / 3 = **3.4%** | "Off by about 3.4% on average." Size of error only. It is **not** accuracy, and "100% minus MAPE" means nothing. |
| **R-squared** (R^2) | How much of the ups and downs in the actual values the model explains. | not shown | 1 = perfect. 0 = no better than always guessing the average. Below 0 = worse than that. |
| **Baseline** | A deliberately simple guess the model must beat. | | If the model does not beat it, the model has learned nothing useful. |

**Train vs test.** The model learns from the older rows (train) and is scored on newer rows it never saw (test). The split is by time, never shuffled, because real life only moves forward. Test scores are the honest ones; train scores only show how well the model fits what it studied.

**Percentages in this file** are the PKR or USD error divided by the average actual value, so "3.94%" means "about 3.94% of a typical levy".

## 2. Module 2: Petroleum Levy Advisor

**Important:** the levy labels come from a rule we wrote (`docs/working.md`, section 3.2). A good score therefore means the tree **rediscovered our rule**, not that it can predict real government levies.

**Setup:** 56 oldest rows train, 15 newest rows test (2026-03-16 onward). The 15 test levies average **64.98 PKR/litre** and range from 58.7 to 78.6. Errors are measured on the final levy in PKR per litre (multiplier times required levy), not on the multiplier.

### 2.1 Test scores (15 unseen rows)

| Metric | Value | As % of average test levy | Plain meaning |
|---|---|---|---|
| RMSE | **2.560 PKR/litre** | 3.94% | Typical error, with big misses weighted more. |
| MAE | **1.473 PKR/litre** | 2.27% | On average the recommendation is about 1.5 rupees per litre away from the rule's levy. |
| MAPE | **2.122%** | 2.12% | Same idea as MAE, averaged per row. |
| R-squared | **0.709** | n/a | The tree explains about 71% of the ups and downs in test levies. Harsh here, because test levies vary little (58.7 to 78.6). |

### 2.2 Against simple guesses (RMSE on the same 15 rows, lower is better)

| Predictor | RMSE (PKR/litre) | As % of average test levy | Tree's error is lower by |
|---|---|---|---|
| **Levy Advisor tree** | **2.560** | 3.94% | n/a |
| Training average ("always say the average") | 4.771 | 7.34% | 46.3% |
| Previous recommended levy ("same as last time") | 7.153 | 11.01% | 64.2% |
| Current levy ("status quo") | 15.981 | 24.59% | 84.0% |

The status-quo gap is the point of an advisor: the levy in force is far from the levy the rule recommends.

### 2.3 Other checks

| Check | Result | Meaning |
|---|---|---|
| Walk-forward RMSE (training rows only) | **1.027 PKR/litre** vs 5.363 for "same as last time" (80.8% lower) | Used to pick tree depth and leaf size fairly, without looking at the test rows. |
| Train RMSE / R-squared | 1.418 PKR/litre / 0.989 | Fit on rows it studied. Test RMSE is higher, as expected. |
| Shuffled-split diagnostic | RMSE 0.677, R-squared 0.995 | When rows are shuffled, the tree recovers the rule almost perfectly. This is a diagnostic only, not a forecast. |

### 2.4 Read the results with these cautions

- **One row causes most of the error.** Row 8 (actual 78.6, predicted 69.3, error 9.3 PKR/litre, 11.8%) is about 88% of the total squared error. Without it, test RMSE would be about 0.92. This is why RMSE (2.560) is well above MAE (1.473).
- **Predictions are coarse.** The tree has 4 leaves, so the 15 test rows get only 4 distinct predicted values.
- **Small test set.** With 15 rows, small differences between models mean nothing.
- **The 80 USD/bbl crude cut-off is a cliff.** A crude forecast just above or below 80 flips the multiplier, and with it the recommended levy (`docs/working.md`, section 5).

### 2.5 What the tree learned

```text
if affordability_index <= 28.260:            multiplier 0.811  (11 rows)
else if forecast_crude_price <= 77.495:
    if fiscal_gap_pkr_bn <= 0.475:           multiplier 1.000  (23 rows)
    else:                                    multiplier 0.995  (12 rows)
else:                                        multiplier 0.949  (10 rows)
```

In words: when fuel is hard to afford, the levy is cut to about 81% of the required levy; when crude is also high, it is cut to about 95%; otherwise the full required levy applies. This matches the label rule, except the `fiscal_gap_pkr_bn` split, which is not part of the rule.

## 3. Module 1: Commodity Trend Tracker

**What is scored:** the crude forecast that feeds Module 2. For each of the 71 levy periods, the forecast (`forecast_crude_price`, made using only data before the period) is compared with the **actual** average Brent price over the next 10 trading days.

**Baseline ("flat price"):** predict that the average over the next 10 trading days equals the last known price before the period. This is the simplest guess there is.

### 3.1 Forecast accuracy (71 periods, average actual price 80.94 USD/bbl)

| Metric | Module 1 forecast | Flat-price baseline | Plain meaning |
|---|---|---|---|
| RMSE | **5.39 USD/bbl** (6.7%) | 5.38 USD/bbl (6.6%) | Typical error, big misses weighted more. |
| MAE | **3.53 USD/bbl** (4.4%) | 3.51 USD/bbl (4.3%) | On average the forecast is about 3.5 dollars per barrel off. |
| MAPE | **4.02%** | 4.01% | Average percentage miss. |
| Bias | **+0.14 USD/bbl** | +0.07 USD/bbl | The forecast is not systematically too high or too low. |
| Within 5% of actual | 51 of 71 (71.8%) | not computed | |
| Within 10% of actual | 65 of 71 (91.5%) | not computed | |
| Direction right (up or down vs last price) | 37 of 71 (52.1%) | n/a | About a coin flip. |

**Honest reading:** the forecast **does not beat** the flat-price baseline; the two are effectively tied (the baseline is a hair better). This is normal for oil prices over short horizons: they behave close to a random walk, so a model that mostly extends the last price cannot do much better. The report should say this plainly rather than present Module 1 as a predictor that beats a naive guess.

**Recent periods are harder.** On the latest 15 periods (Brent swinging between roughly 70 and 138 USD/bbl), the forecast's MAE is 7.88 USD/bbl and MAPE 7.57% (flat-price: 7.84 and 7.53%).

### 3.2 What matters for Module 2: the 80 USD/bbl threshold

Module 2 only cares whether the forecast is above or below 80.

| Check | Module 1 forecast | Flat-price baseline |
|---|---|---|
| Same side of 80 as the actual 10-day average | **65 of 71 (91.5%)** | 64 of 71 (90.1%) |

The 6 misses are the periods starting 2023-12-01, 2024-01-16, 2024-09-01, 2025-01-16, 2026-03-01 and 2026-06-16. In five of the six the forecast was within about 5 USD/bbl of 80; 2026-03-01 is the big one (forecast 71.35, actual 90.72).

### 3.3 Complexity benchmark (Levinson-Durbin vs naive solver)

Not yet measured. No benchmark code was among the files reviewed, so there are no timings to report. Method and the required coefficient-match check are in `docs/working.md` (sections 2.5 and 6.2). Add the results here when the benchmark exists.

## 4. Metrics for the dashboard

The agreed set. Percentages are the error divided by the average actual value (section 1).

### 4.1 Module 2: Levy Advisor

| Show | Value | Note |
|---|---|---|
| MAE | **1.47 PKR/litre** (2.1%) | The PKR value is the MAE; the 2.1% is the program's own MAPE output (section 2.1). |
| RMSE | **2.56 PKR/litre** (3.9%) | |
| Previous-levy baseline | 7.15 PKR/litre (11.0%) | "Same as last time." |
| Training-average baseline | 4.77 PKR/litre (7.3%) | "Always say the average." |
| Current-levy baseline | 15.98 PKR/litre (24.6%) | "Status quo." |
| Walk-forward | **1.03 vs 5.36 PKR/litre** | The tree's error is about one-fifth of the previous-levy baseline's (section 2.3). |

The live recommendation card shows the recommended levy, multiplier and required levy (PKR/litre, ratio, PKR/litre).

### 4.2 Module 1: Commodity Trend Tracker

The frontend shows MAE, MAPE and RMSE of the crude forecast (section 3.1): MAE 3.53 USD/bbl (4.4%), MAPE 4.02%, RMSE 5.39 USD/bbl (6.7%). The Levinson-Durbin vs naive solver timings are pending (section 3.3).

### 4.3 Not shown on the dashboard

- **Levy band (LOW / MEDIUM / HIGH):** the model does not calculate it. It comes from fixed cut-offs applied to the recommended levy, so it adds nothing the levy number does not already say.
- R-squared, train scores, the shuffled-split diagnostic, and the 80 USD/bbl threshold check. They stay in this file for the report.

### 4.4 Display rules

- Never label MAPE or any error as "accuracy".
- Always show a note on the levy panel: labels are rule-based, so scores measure rule recovery, not real-world levy prediction.
- Show units on every number (PKR/litre, USD/bbl).

## 5. Reference runs (for the checks in `docs/working.md`, section 3.5)

| Command | Result |
|---|---|
| `backtest 2026-10-16` | 70 training rows; multiplier 0.800; recommended levy 68.340 (MEDIUM) vs stored 64.0; absolute error 4.340. Carried target/volume gave required levy 85.414 vs stored 80.049. |
| `live --crude 120.22` | Period start 2026-11-01; 71 training rows; multiplier 0.800; required levy 80.049; recommended levy 64.046 PKR/litre (MEDIUM). |

## 6. Updating this file

1. After a data or code change, rerun `tree_test.exe` and replace the Module 2 numbers (sections 2 and 5). Recompute the "% of average test levy" values from the new test average.
2. Regenerate the forecast column if Brent data or the model changed (`.\gen_forecast_col.exe`), then re-score it as in section 3 (forecast vs the mean of the next 10 Brent rows on or after each `period_start`, and vs the last Brent price before it) and replace the Module 1 numbers.
3. Update the date and the row counts at the top.