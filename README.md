# Fiscal Lens

A two-module dashboard that forecasts commodity prices and recommends a Pakistan petroleum levy. 
Built for the Data Structures & Algorithms Semester Project, with the core ML algorithms written from scratch in C++.

**Live demo:** coming soon (the link will be added after deployment).

## What it does

| Module | What it does | Core algorithm |
|---|---|---|
| **1. Commodity Trend Tracker** | Forecasts Brent crude prices and passes one number, the 10-day forecast mean, to Module 2. | Log, first difference, AR(p) fitted by the Levinson-Durbin recursion |
| **2. Petroleum Levy Advisor** | Recommends a levy (PKR/litre) for the next fortnight from crude forecast, affordability and fiscal inputs. | Regression tree (greedy recursive partitioning, sorted split search) |

## Status

- Both modules are built and linked through CSV files; there is no database and no live data feed.
- The levy labels come from a rule we wrote, so model scores measure rule recovery, not real-world levy prediction. See `docs/model_metrics.md`.

## Tech stack

| Layer | Technology | Used for |
|---|---|---|
| Backend | C++17 | Levinson-Durbin forecaster, regression tree, levy advisor CLI |
| Frontend | JavaScript, HTML, CSS | Static dashboard |
| Data pipeline | Python 3 (`pandas`, `numpy`) | Cleaning Brent data, regenerating levy labels |
| Storage | CSV files | No database; data is read into memory at startup |
| Bridge | WebAssembly | Connecting the backend to the dashboard |

## Run locally

Requirements: Python 3 (serves the frontend; `pandas` and `numpy` are needed only for the label script) and `g++` with C++17.

**Frontend** (from `frontend/`)

```
python -m http.server 8000
```

Then open `http://localhost:8000`. The dashboard does not show backend output yet.

**Levy Advisor** (build and run from `src/`)

```
g++ -std=c++17 -O2 RegressionTree.cpp LevyAdvisor.cpp -o tree_test.exe
.\tree_test.exe                          # full experiment report
.\tree_test.exe live --crude <value>     # recommend the levy for the next fortnight
.\tree_test.exe backtest YYYY-MM-DD      # replay a past fortnight
```

**Crude forecast** (build and run from the repo root)

```
g++ -std=c++17 -O2 src/arima.cpp src/gen_forecast_col.cpp -o gen_forecast_col.exe
.\gen_forecast_col.exe                   # rewrites data/processed/forecast_col.csv
```

Adding a new fortnight of data is a manual process: see `docs/working.md`, section 4.

## Repository structure

```
fiscal-lens/
├── src/                        C++ backend
│   ├── arima.*                 AR model, Levinson-Durbin, forecastMean
│   ├── gen_forecast_col.cpp    crude forecast generator
│   ├── RegressionTree.*        regression tree, validation, CLI
│   └── LevyAdvisor.*           live and backtest modes
├── data/
│   ├── raw/                    uncleaned source files
│   ├── processed/              brent_daily.csv, forecast_col.csv, levy_training.csv
│   └── Data_Readme.md          provenance of every dataset
├── scripts/
│   ├── clean_brent.py          cleans the raw Brent data
│   └── regenerate_labels.py    merges forecasts, recomputes levy labels
├── frontend/                   static dashboard (HTML, CSS, JS)
└── docs/                       project documentation
```
## Contributions

| Member | Role | Contributions |
|---|---|---|
| Asher Jamshaid | Module 1 backend | Backend work on Module 1, then sourced and built the real dataset for Module 1 as well. CCP Report. |
| S.M. Mutahir Mustafa | Module 1, then frontend integration | Worked alongside on Module 1, then moved to the frontend: bug fixing and the WebAssembly bridge. |
| M. Mahad Amir | Module 2 backend | Backend Work on Module 2. Built the initial synthetic datasets for both modules, then sourced and built the real dataset for Module 2. Handeled Documentation. |
| Jibrail Nabi Khan | Module 2, then frontend design | Worked alongside on Module 2, then moved to the frontend: UI design and layout. |

## Documentation

| File | Content |
|---|---|
| `docs/working.md` | How the system works: pipeline, methods, formulas, parameters, commands, data updates, limitations |
| `docs/dsa_analysis.md` | DSA concepts used and complexity analysis |
| `docs/model_metrics.md` | Model scores and benchmarks, explained for beginners |
| `docs/review.md` | Codebase structure, ownership, status, open gaps |
| `docs/dsa-project-blueprint.md` | Original project proposal |
| `data/Data_Readme.md` | Data sources, cleaning and provenance |
