# Fiscal Lens: Codebase and Status Report

Updated 14 Nov 2026.

**Scope of this file:** repository structure and ownership, what each file does, documentation index, latest verified results, and open gaps.

## 1. Snapshot

Fiscal Lens is a two-module DSA/ML project:

1. **Commodity Trend Tracker** forecasts Brent crude with an ARI-style model (log transform, first differencing, autoregression).
2. **Petroleum Levy Advisor** uses a hand-built C++ regression tree to recommend a Pakistan petroleum levy.

The repository holds C++ source, static frontend assets, CSV data, documentation and compiled Windows executables. There is no build configuration, package manifest, server, database or automated test suite.

**Status:** both modules are built and linked through CSV files. The browser interface is not connected to the backend (no WASM or API bridge).

## 2. Repository structure and ownership

| Location | Contents and role | Owner |
|---|---|---|
| `src/arima.*` | `ARIMA` class, CSV loading, `forecastMean` | Module 1 |
| `src/gen_forecast_col.cpp` | Generates `forecast_col.csv` | Module 1 |
| `src/RegressionTree.*` | Regression tree, dataset loading, metrics, validation, CLI dispatch | Module 2 |
| `src/LevyAdvisor.*` | `live` and `backtest` modes | Module 2 |
| `data/raw/` | Uncleaned source files (PDFs, CSVs, wage image) | Shared |
| `data/processed/` | Cleaned Brent data, `forecast_col.csv` (Module 1); `levy_training.csv` (Module 2). Backup copies (`*.bak`, `levy_training_placeholder_crude.csv`) may appear here after script runs and should be deleted once verified. | Per file |
| `scripts/clean_brent.py` | Cleans raw Brent data | Module 1 |
| `scripts/regenerate_labels.py` | Merges `forecast_col.csv` into the levy file and recomputes `levy_value`. Run manually. | Module 2 |
| `frontend/` | Static HTML/CSS/JavaScript dashboard and assets | Frontend pair |
| `docs/`, `data/Data_Readme.md` | Documentation (section 5) | Module 2 (`Data_Readme.md`); shared (`docs/`) |

## 3. File roles in the backend

### Commodity Trend Tracker

| File | Purpose |
|---|---|
| `src/arima.h`, `src/arima.cpp` | Prices are logged and first-differenced; AR coefficients come from Yule-Walker autocovariances and Levinson-Durbin; order `p` is chosen by rolling-window RMSE; forecasts are integrated and exponentiated. `forecastMean` returns the mean of the next `n` forecasted prices. |
| `src/gen_forecast_col.cpp` | For each levy period, takes only Brent rows before it, calls `forecastMean(..., 10)`, and writes `data/processed/forecast_col.csv`. |

### Petroleum Levy Advisor

| File | Purpose |
|---|---|
| `src/RegressionTree.h`, `src/RegressionTree.cpp` | CART-like regression tree written from scratch (sorted split search, running-sum SSE, mean leaves). Also holds dataset loading, RMSE/MAE/MAPE/R^2, chronological evaluation, walk-forward hyperparameter selection, baselines, tree printing and CLI dispatch. Defaults: depth 4, minimum split 6, minimum leaf 3. |
| `src/LevyAdvisor.h`, `src/LevyAdvisor.cpp` | `live` and `backtest` modes. Reads no raw files; every input except the crude price is carried from a row of `levy_training.csv`. |

Build and CLI usage: `docs/working.md`, section 7.

## 4. Frontend

`frontend/index.html` is a single-page, responsive dashboard with Overview, Commodity Tracker, Levy Advisor and Benchmarks sections. It references `styles.css`, then `app.js` and an expected `data.js`.

| File/group | Role |
|---|---|
| `frontend/app.js` | Renders reference cards and the pump-price build-up from global `PREDICTIONS` / `HISTORY`, persists light/dark theme, updates navigation, animates the levy recommendation steps, adds reveal and cursor-glow effects. |
| `frontend/base.css` | Theme variables, reset, typography, shared base rules. |
| `frontend/layout.css` | Shell, sidebar, sections, responsive layout, page geometry. |
| `frontend/components.css` | Buttons, cards, charts, controls, price build-up, animation. |
| `frontend/styles.css` | Imports the three CSS layers and applies the custom cursor on fine pointers. |
| `frontend/assets/` | Hero and decorative imagery, cursor, icons, fonts. |

No frontend changes are planned until it is connected to the backend. As of the 9 Nov review (not re-verified): `data.js` (which must define `PREDICTIONS` and `HISTORY`) was referenced but absent, the Tracker's "Run forecast" button had no handler, and the Levy button only animated supplied values. If retail price and USD/PKR are not shown, remove them from `FEATURES`.

## 5. Documentation index
 
| File | Content |
|---|---|
| `docs/working.md` | Operating design: pipeline, methods, formulas, parameters, commands, data-update procedure, model limitations, DSA complexity. |
| `data/Data_Readme.md` | Provenance of every CSV: sources, cleaning, calculations, estimates, carry-forwards, approved descriptions. |
| `docs/model_metrics.md` | Scores and benchmarks for both modules, plain-language explanations, and the metrics the dashboard shows. |
| `docs/review.md` | This file: structure, status, gaps. |
| `docs/dsa-project-blueprint.md` | Original course/project proposal: scope, stack alternatives, algorithms, planned structure. |

## 6. Integration and maintenance gaps

1. **Manual data updates:** nothing in the C++ code appends rows or runs `regenerate_labels.py` or the forecast generator (procedure: `docs/working.md`, section 8). `regenerate_labels.py` also overwrites `levy_training_placeholder_crude.csv` on every run.
2. **Live crude input:** `LevyAdvisor` cannot call `forecastMean`; live mode requires `--crude`.
3. **Loader limits:** the training loader needs rows sorted oldest to newest and the named primary columns. It accepts CSV or TSV but does not handle quoted delimiters.
4. **Data and model caveats** are kept in `data/Data_Readme.md` and `docs/working.md` (section 9).