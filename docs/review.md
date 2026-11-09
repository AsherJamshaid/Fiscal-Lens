# Fiscal Lens — Codebase and Data Report

## Snapshot

Fiscal Lens is a two-module DSA/ML project:

1. **Commodity Trend Tracker** forecasts Brent crude prices with an ARI-style model (log transform, first differencing, autoregression).
2. **Petroleum Levy Advisor** uses a hand-built C++ regression tree to recommend a Pakistan petroleum levy from crude, affordability, fiscal, and pricing inputs.

The repository contains C++ source, static frontend assets, CSV data, documentation, and two compiled Windows executables. There is no build configuration, package manifest, server, database, or automated test suite.

## Structure and responsibilities

| Location | Contents and role |
|---|---|
| `src/` | C++ implementation of the AR model, regression tree, levy input assembler, forecast-column generator, and `tree_test.exe`. |
| `data/raw/` | Source-style daily/fortnightly/monthly data used to assemble or clean model inputs. |
| `data/processed/` | Backend-consumable cleaned Brent data, regenerated levy training data (`levy_training.csv`), placeholder crude backup (`levy_training_placeholder_crude.csv`), and generated forecast-column output (`forecast_col.csv`). |
| `frontend/` | Static HTML/CSS/JavaScript dashboard and visual assets. |
| `docs/` | Current system design notes and the original semester-project blueprint. |
| `gen_forecast_col.exe` | Prebuilt forecast-column generator at repository root. |

## C++ backend

### Commodity Trend Tracker

| File | Purpose |
|---|---|
| `src/arima.h`, `src/arima.cpp` | Defines `ARIMA`, CSV loading, and `forecastMean`. Prices are logged and first-differenced; AR coefficients are estimated with Yule–Walker autocovariances and Levinson–Durbin recursion. Order `p` is chosen from `1..maxP` by rolling-window RMSE, then forecasts are recursively integrated and exponentiated. Defaults: `maxP=10`, 30-day validation horizon, 7-day validation step, 700-row initial window; `forecastMean` uses a 10-day horizon and a 250-row minimum. |
| `src/gen_forecast_col.cpp` | Reads cleaned Brent rows, takes only rows before each levy period, calls `forecastMean(..., 10)`, and writes `data/processed/forecast_col.csv`. It reports each forecast and a persistence baseline to stderr. |

The AR implementation treats invalid/non-positive CSV prices as unusable. Autocovariance calculation is (O(n p)); Levinson–Durbin is (O(p^2)) after autocovariances are available. The current order-selection strategy is rolling validation, not the AIC/BIC approach proposed in the blueprint.

### Petroleum Levy Advisor

| File | Purpose |
|---|---|
| `src/RegressionTree.h`, `src/RegressionTree.cpp` | Implements a CART-like regression tree from scratch. Each node searches every feature by sorting candidate values and minimizing child SSE with running sums; leaves emit their mean target. Includes CSV dataset loading, RMSE/MAE/MAPE/R² evaluation, chronological train/test evaluation, walk-forward hyperparameter selection, baselines, tree printing, and CLI dispatch. |
| `src/LevyAdvisor.h`, `src/LevyAdvisor.cpp` | Loads raw petrol/CPI files, validates ISO dates, assembles live or historical feature rows, and implements `live` and `backtest` CLI modes. |

`RegressionTree` defaults to depth 4, minimum split size 6, and minimum leaf size 3. The default experiment instead searches depths 3–6 and minimum leaf sizes 8, 5, and 3 on the oldest 80% of data; it reserves the newest 20% for testing. A node split costs (O(f n \log n)) for (f) features and node sample count (n), because each feature is sorted.

The learned target is normally a **multiplier** rather than the levy directly:

```text
required_levy = levy_revenue_target_pkr_bn / levied_volume_bn_litres
target_multiplier = levy_value / required_levy
recommended_levy = predicted_multiplier × required_levy
```

With the checked-in data and existing `src/tree_test.exe`, the default run uses 56 training and 14 test rows, selects depth 3/minimum leaf 3, builds a 5-leaf tree, and reports test RMSE 0.671 PKR/litre, MAE 0.383, MAPE 0.546%, R² 0.971, and 12/14 band matches (walk-forward RMSE on training rows is 1.262 vs previous-levy baseline 2.376). These are rule-recovery results: the labels are synthetic/rule-based, not evidence of real-world forecasting accuracy.

### CLI

From `src/`, the documented build for the levy executable is:

```powershell
g++ -std=c++17 -O2 RegressionTree.cpp LevyAdvisor.cpp -o tree_test.exe
```

| Command | Behavior |
|---|---|
| `tree_test.exe` | Runs the chronological levy experiment, validation, baselines, and printed decision tree. |
| `tree_test.exe live --crude <positive-number>` | Trains on all levy rows and produces a recommendation for the day after the latest petrol build-up period. The crude input is currently manual. |
| `tree_test.exe backtest YYYY-MM-DD` | Trains only on earlier rows, reconstructs inputs as of the requested levy-row date, and compares the recommendation with the stored label. |

The verified `backtest 2026-10-01` recommends 65.902 PKR/litre (MEDIUM) versus stored 63.400, an absolute error of 2.502. Its carried volume produces required levy 82.383 rather than the stored 79.268, which explains the difference.

## Frontend

`frontend/index.html` is a single-page, responsive dashboard with Overview, Commodity Tracker, Levy Advisor, and Benchmarks sections. It references `styles.css`, then `app.js` and an expected `data.js`.

| File/group | Role |
|---|---|
| `frontend/app.js` | Renders reference cards and pump-price build-up from global `PREDICTIONS`/`HISTORY`, persists light/dark theme, updates navigation, animates the levy recommendation steps, and adds reveal/cursor-glow effects. |
| `frontend/base.css` | Theme variables, reset, typography, and shared base rules. |
| `frontend/layout.css` | Shell, sidebar, section, responsive layout, and page geometry. |
| `frontend/components.css` | Buttons, cards, charts, controls, price build-up, animation, and component styles. |
| `frontend/styles.css` | Imports the three CSS layers and applies the custom cursor on fine pointers. |
| `frontend/assets/hero.jpg`, `h.jpg`, `cursor.png` | Hero/decorative imagery and pointer asset. |
| `frontend/assets/icons/` | `overview.svg`, `tracker.svg`, `levy.svg`, `benchmarks.svg`, `sun.svg`, and `moon.svg`. The HTML currently embeds large inline SVG navigation icons instead of relying on these icon files. |
| `frontend/assets/fonts/` | Paytone One and Helvetica family font files (regular, bold, oblique, light, compressed, and rounded variants). |

The frontend is presently **not standalone-runnable**: `data.js`, which must define `PREDICTIONS` and `HISTORY`, is referenced but absent. Also, although the Tracker UI exposes a “Run forecast” button and chart placeholders, `app.js` provides no forecast handler. The Levy button only animates the already-supplied prediction; it does not call the C++ model. No C++→browser bridge (WASM or API) is implemented.

## Data catalogue

All CSVs are comma-delimited and have headers.

| File | Rows / coverage | Columns and meaning | Current use |
|---|---|---|---|
| `data/raw/brent_daily.csv` | 1,784 rows, 2020-01-02–2026-11-03; 1,731 numeric prices and 53 missing/non-numeric entries | `observation_date`; `DCOILBRENTEU` (Brent USD/bbl) | Raw source series; not read directly by the current generator. |
| `data/processed/brent_daily.csv` | 783 rows, 2023-10-18–2026-10-16; price 57.270–101.100, mean 76.425 | `date`; `price` (Brent USD/bbl) | Read by `gen_forecast_col.cpp`. |
| `data/raw/usd_pkr_daily.csv` | 783 rows, 2023-10-18–2026-10-16; rate 277.349–284.222, mean 279.997 | `date`; `usd_pkr` | Auxiliary source; no current C++ consumption. |
| `data/raw/cpi_and_income_monthly.csv` | 37 rows, 2023-10–2026-10 | `month`; approximate CPI YoY %; CPI index (Oct-2023=100); monthly minimum wage. CPI index 100.000–129.110; wage 32,000–42,000 PKR. | Read by `LevyAdvisor` to calculate affordability. |
| `data/raw/petrol_price_buildup_fortnightly.csv` | 71 rows, 2023-11-01–2026-10-15 | Start/end dates; import/refinery cost; OMC/dealer margins; IFEM; GST; petroleum and carbon levies; model retail price. Retail price 250.730–329.700 PKR/litre. | Read by `LevyAdvisor` to carry the prior retail price and calculate current levy. |
| `data/processed/levy_training.csv` | 70 fortnightly rows, 2023-11-16–2026-10-01 | Dates; crude forecast (Module 1); affordability; revenue target; fiscal gap; current levy; retail price; levied volume; `levy_value`. | Primary tree-training data (`usd_pkr` and `levy_band` dropped). Levy values range 39.100–79.400 PKR/litre (derived bands: LOW 15, MEDIUM 25, HIGH 30). |
| `data/processed/forecast_col.csv` | 70 levy-period rows, 2023-11-16–2026-10-01; all 70 numeric forecasts populated | `period_start`; `forecast_crude_price` | Generator output merged into `levy_training.csv` via `scripts/regenerate_labels.py`. |

The eight active tree features are `forecast_crude_price`, `affordability_index`, `levy_revenue_target_pkr_bn`, `fiscal_gap_pkr_bn`, `current_levy`, `retail_petrol_price`, `levied_volume_bn_litres`, and derived `required_levy`. The training file also retains `usd_pkr`, but the loader does not use it. Key training-data ranges are: crude 57.720–100.530 USD/bbl, affordability 24.762–32.469, target 36.210–65.000 PKR bn, fiscal gap −8.910–8.380 PKR bn, current levy 60.000–83.000 PKR/litre, volume 0.710–0.838 bn litres, and retail price 250.730–329.700 PKR/litre.

For a live/backtest row, the advisor carries the latest earlier petrol build-up; uses that row’s retail price and petroleum+carbon levy; uses the matching CPI/wage month (or latest available); carries target, volume, and fiscal gap from the prior training row; and computes affordability as:

```text
affordability_index = min_wage / (40 × retail_price) × (100 / cpi_index) × 10
```

## Documentation

| File | Content |
|---|---|
| `docs/working.md` | Most current operating design: data flow, formulas, labels, CLI modes, validation plan, regeneration steps, ownership, and limitations. |
| `docs/dsa-project-blueprint.md` | Original course/project proposal: scope, stack alternatives, source ideas, algorithms, complexity justification, and planned structure. |

## Current integration and maintenance gaps

1. `src/gen_forecast_col.cpp` tries to read `data/levy_training.csv`, but the checked-in file is `data/processed/levy_training.csv`; its output target is correct. The root-level prebuilt generator may therefore not reproduce successfully without a path fix or copied file.
2. `docs/working.md` also names old locations (`data/levy_training.csv` and `data/crude_forecasts.csv`) and describes a four-column forecast output, while the actual output is `data/processed/forecast_col.csv` with two columns.
3. The training loader requires rows to be chronologically sorted and requires the named primary columns. It accepts CSV or TSV, but does not handle quoted delimiters.
4. (Resolved) `forecast_col.csv` provides numeric forecasts for all 70 rows; `scripts/regenerate_labels.py` merged these forecasts into `data/processed/levy_training.csv`, dropped `usd_pkr` and `levy_band`, and recomputed `levy_value`. Backup of the old data is retained at `data/processed/levy_training_placeholder_crude.csv`.
5. `LevyAdvisor` can call neither `forecastMean` nor the tracker directly in live mode; it requires `--crude`. The requested backend-to-frontend mechanism is likewise absent.
6. Levy labels are intentionally synthetic. Small sample size (70 rows), carry-forward volume assumptions, threshold sensitivity around crude price 80, and retail-price circularity limit any policy interpretation.

## Practical state

The levy-model command-line demo is executable and was successfully run against the checked-in processed data. The commodity forecaster and forecast-column generator are implemented but not fully wired into the levy workflow. The browser interface is visually structured but awaits its missing `data.js`, forecast interaction, and a real bridge to backend outputs.
