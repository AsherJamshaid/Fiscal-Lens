# DSA Semester Project — Blueprint

## 1. Project Overview
- **Course requirement:** Data Structures & Algorithms — "CCA (Project + Project Report)"
- **Deadline:** Nov 15, 23:59
- **Weight:** 10 points
- **Team size:** up to 4 members
- **Course constraint:** implement an algorithm from an ML/DL/NLP/Cyber Security/Cryptography domain, in C++, using a real dataset, with a full complexity analysis of the implemented algorithm(s). No "vibe-coding" — the team writes the core algorithms itself.

## 2. Project Idea & Scope
A two-module dashboard, self-proposed under the Machine Learning domain: forecasting commodity trends to inform national-level policy decisions (e.g. setting a petroleum levy that balances public burden vs. IMF compliance).

**Module 1 — Commodity Trend Tracker**
Forecasts/extrapolates prices for multiple commodities (oil, gold, minerals, etc.) — a general time-series forecasting tool, similar in spirit to stock-prediction models.

**Module 2 — Petroleum Levy Advisor**
Models the full petroleum pricing build-up (not just crude oil price) plus public affordability, and recommends a levy value/range.

**Scope discipline:** ship both modules at this defined scope first. Only after both are working does the team revisit whether to add more weight — either deepening an existing module or adding a complementary one — rather than deciding that upfront.

## 3. Tech Stack
| Layer | Choice |
|---|---|
| Backend | C++ (entire algorithm layer) |
| Frontend | JavaScript (first choice) — Python Streamlit is the fallback |
| Backend↔frontend bridge | **Open decision:** WebAssembly (Emscripten) vs. a C++ REST API (Crow/Pistache). WASM is currently favored, since the team wants to host the project publicly and WASM bundles into a single static deploy (no server to run or maintain); a REST API would need actual server hosting (Render/Railway/Fly.io — not Vercel) |
| Storage | No database. CSV files, loaded into memory at startup. SQLite was explicitly considered and dropped — not worth the added learning curve for data that's read-mostly and non-relational. Can be revisited later only if a real need shows up |

## 4. Datasets
Training data is static/historical for both modules — a forecasting model always trains on the past regardless of whether the app itself is "live." Sources:
- **World Bank Commodity Price Data ("Pink Sheet")** — free monthly CSV, covers oil, gold, and most other commodities in one file. Likely the primary source since it's multi-commodity.
- **Kaggle** — historical datasets (e.g. Gold Price Historical Data, Crude Oil Prices) for finer daily granularity if the Pink Sheet's monthly resolution isn't enough.
- **EIA (U.S. Energy Information Administration)** — free public API/CSV, useful specifically for the Levy Advisor's petroleum pricing build-up detail.
- **Petroleum Levy Advisor training labels — open decision:** no clean public dataset of real past levy decisions is likely to exist. Team needs to pick between (a) defining its own rule-based logic (e.g. price/affordability thresholds → levy band) to generate synthetic labeled examples, or (b) sourcing a real proxy dataset if one turns up.
- **Optional demo polish (not core, add later if time allows):** a small script that appends the latest available price point on a daily/weekly schedule, so the hosted demo's forecast starting point stays current. Still writes to the same CSV — no live pipeline, no database.

## 5. Models & Algorithms

**Commodity Trend Tracker — ARI + Levinson-Durbin**
- Differencing (the "I" in ARI) handles the non-stationary trend in commodity prices.
- AR coefficients fit via the **Levinson-Durbin recursion** — O(p²) — benchmarked against a **naive normal-equations solve** — O(p³) — as the core efficient-vs-brute-force complexity comparison for the report.
- **Order selection:** fit orders 1..p_max in one Levinson-Durbin pass (it produces every intermediate order's solution along the way) and pick the best via AIC/BIC. Compared against solving each order independently from scratch via normal equations — O(p_max⁴) total — this is where Levinson-Durbin's dynamic-programming character actually pays off, not just at a single fixed order.
- **Fallback if more depth is needed later:** Hannan-Rissanen two-step estimation (fit long AR → use residuals → second regression for MA terms), which extends ARI toward full ARMA without the estimation risk of full ARIMA's maximum-likelihood approach.

**Petroleum Levy Advisor — Decision Tree**
- Deliberately a distinct algorithm family from the forecaster (recursive partitioning vs. recurrence-based coefficient solving), so the two modules don't redundantly justify the same technique.
- Splits on features (forecasted price, affordability index, fiscal/IMF target) to minimize Gini impurity (classification into levy bands) or variance (regression tree for a continuous levy value).
- Naturally interpretable — the decision path can be printed directly, which fits the "policy advisor" framing well for the report/demo.
- Training data depends on the open dataset decision in Section 4.

## 6. Project Structure

```
project-root/
├── data/
│   ├── raw/              # downloaded datasets (Pink Sheet, Kaggle, EIA)
│   └── processed/        # cleaned CSVs consumed directly by the backend
├── backend/
│   ├── src/
│   │   ├── Dataset.h/.cpp        # CSV loading, per-commodity series storage
│   │   ├── TimeSeriesModel.h     # abstract base: fit() / forecast()
│   │   ├── ARModel.h/.cpp        # ARI fit via Levinson-Durbin, forecast via recurrence
│   │   ├── NaiveARSolver.h/.cpp  # brute-force normal-equations fit, for benchmarking only
│   │   ├── DecisionTree.h/.cpp   # tree-building (split selection, recursion)
│   │   ├── LevyAdvisor.h/.cpp    # wraps DecisionTree with levy-specific features/labels
│   │   ├── Benchmark.h/.cpp      # times ARModel vs NaiveARSolver across sizes/orders
│   │   └── main.cpp              # CLI driver: load → fit → forecast/advise → output
│   └── CMakeLists.txt (or Makefile)
├── frontend/                     # JS app, or the WASM-compiled backend bundled directly
├── report/                       # complexity analysis write-up, benchmark results
└── README.md
```

## 7. Data Structures & Algorithms Coverage
What each module actually requires, given the algorithms already locked in under Section 5 — not a wishlist padded to hit topic count.

**Commodity Trend Tracker**
- **Arrays/vectors** — time series and coefficient storage
- **Matrices** — the normal-equations formulation for the naive baseline; this exists specifically to benchmark against Levinson-Durbin, so it's load-bearing, not extra
- **Gaussian elimination (or equivalent)** — to actually solve/invert that matrix for the naive baseline
- **Dynamic programming** — Levinson-Durbin builds a table of solutions for increasing AR order (1, 2, ..., p), each entry reusing the previous one instead of resolving from scratch. On its own, at a single fixed order, that's just an efficient recurrence. It becomes genuine DP with a real payoff once used for **order selection**: fitting every order 1..p_max via one Levinson-Durbin pass costs O(p_max²) total, versus O(p_max⁴) for solving each order independently from scratch — the classic DP win of reusing overlapping subproblem solutions instead of recomputing them

**Petroleum Levy Advisor**
- **Binary tree** — the decision tree structure itself: `struct Node { feature, threshold, left, right, prediction }`
- **Recursion** — both building the tree (recursive partitioning) and prediction (recursive descent to a leaf)
- **Sorting** — finding the best split threshold on a continuous feature requires sorting its values at each node
- **Greedy algorithm design** — each split is the locally optimal choice, with no backtracking

**Across the whole backend**
- **Asymptotic/complexity analysis** — required by the assignment itself: Levinson-Durbin O(p²) per order vs. naive O(p³) per order (O(p_max²) vs. O(p_max⁴) across order selection); sorting-based split search O(n log n) vs. brute-force unsorted scan O(n²)
- Three distinct algorithmic techniques represented (dynamic programming, greedy recursive partitioning, and — if the stretch goals below land — divide and conquer), so the report isn't leaning on one paradigm twice

**Stretch goals** — hashing and divide and conquer are both real, reachable additions rather than requirements of the current plan; see Section 8 for what each would take.

Net coverage today: arrays, matrices, recursion, trees, sorting, greedy design, and dynamic programming (via order selection) — each tied directly to an algorithm in Section 5. Hashing and divide-and-conquer are real, reachable additions, not required by the current plan as it stands.

## 8. Open Decisions (to close before or during build)
- Backend↔frontend bridge: WASM vs. REST API (leaning WASM)
- Levy Advisor training labels: rule-based synthetic vs. a real proxy dataset
- Whether to add the optional daily-refresh script for the hosted demo
- Whether Hannan-Rissanen gets added later, and/or a third module, once both core modules are working
- **Attempt, drop only if time runs out:** add a categorical feature to the Levy Advisor to make its hash-map-based split counting genuine rather than unnecessary
- **Attempt, drop only if time runs out:** implement FFT-based autocorrelation (Cooley-Tukey, divide and conquer) for the Tracker instead of the naive O(n²) version — also covers the divide-and-conquer paradigm, which nothing else in the project currently does
