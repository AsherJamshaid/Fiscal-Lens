# Fiscal Lens

A two-module dashboard that forecasts commodity prices and recommends a Pakistan petroleum levy. 
Built for the Data Structures & Algorithms Semester Project, with the core ML algorithms written from scratch in C++.

**Live demo:** https://m-mahad-amir.github.io/Fiscal-Lens/frontend/

## Why this project

Petrol is one of the most visible costs in a Pakistani household budget, and a large part of its pump price is not set by the market. According to the OGRA notification of 14 Nov 2026 (as republished by petrolratetoday.pk), a litre of petrol costs Rs 330.00:

| Component | Rs / litre | Share |
|---|---|---|
| Ex-refinery / import price (follows oil prices and the dollar rate) | 235.05 | 71.2% |
| Freight, oil company and dealer margins | 25.98 | 7.9% |
| Petroleum levy + climate support levy (set by government) | 68.64 | 20.8% |
| Sales tax (petrol is currently exempt) | 0.00 | 0.0% |

Only the ex-refinery price follows the market. The levy is a policy choice, so when global prices fall, the pump price falls by less than the headlines suggest. The levy is also a major source of government revenue, which creates a tension:

- The government needs the revenue to meet fiscal and IMF targets.
- Every extra rupee of levy lands on households that are already stretched.

**The problem we target.** Levy decisions are hard to make transparently because they depend on several moving inputs at once: where crude prices are heading, how affordable fuel is for ordinary people, and how much revenue must be collected. Fiscal Lens turns those inputs into a recommendation that can be explained.

**Scope.**
- Module 1 forecasts Brent crude, the main market-driven input.
- Module 2 combines that forecast with an affordability index (how many 40-litre tanks the minimum wage buys) and the revenue target. It recommends a levy that eases the burden when affordability is low or crude is high, while tracking the revenue need.

## How the recommendation works

Module 1 forecasts Brent crude and passes one number, the mean of the next 10 forecasted days, to Module 2. Module 2 first works out the **required levy**, which is the levy that would exactly hit the revenue target. The regression tree then predicts a **multiplier** that scales this down when fuel is hard to afford or crude is high:

```text
recommended levy = required levy x predicted multiplier
```

The multiplier rule, the affordability index and all other formulas are in `docs/working.md`. Every recommendation can be traced to a printed decision path of the tree, and the complexity analysis is in `docs/dsa_analysis.md`.

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
| Deployment | GitHub Actions | Automated build and deploy of the dashboard |

## Run locally

Requirements: Python 3 (serves the frontend; `pandas` and `numpy` are needed only for the label script) and `g++` with C++17.

**Frontend** (from the repository root, so the server also exposes `Binding/` and `data/`)

```
python -m http.server 8000
```

Then open `http://localhost:8000/frontend/`.

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
| Asher Jamshaid | Module 1 backend | <ul><li>Built the Module 1 backend</li><li>Sourced and built the real Module 1 dataset</li><li>Wrote the CCP report</li></ul> |
| S.M. Mutahir Mustafa | Module 1, then frontend integration | <ul><li>Collaborated on Module 1</li><li>Fixed frontend bugs</li><li>Built the WebAssembly bridge</li></ul> |
| M. Mahad Amir | Module 2 backend | <ul><li>Built the Module 2 backend</li><li>Sourced and built the real Module 2 dataset</li><li>Wrote the project documentation</li><li>Deployed the project using GitHub Actions</li></ul> |
| Jibrail Nabi Khan | Module 2, then frontend design | <ul><li>Collaborated on Module 2</li><li>Designed the frontend UI and layout</li><li>Fixed bugs and finalized the frontend</li></ul> |

## Documentation

| File | Content |
|---|---|
| `docs/working.md` | How the system works: pipeline, methods, formulas, parameters, commands, data updates, limitations |
| `docs/dsa_analysis.md` | DSA concepts used and complexity analysis |
| `docs/model_metrics.md` | Model scores and benchmarks, explained for beginners |
| `docs/review.md` | Codebase structure, ownership, status, open gaps |
| `docs/dsa-project-blueprint.md` | Original project proposal |
| `data/Data_Readme.md` | Data sources, cleaning and provenance |
