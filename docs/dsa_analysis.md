# DSA concepts and complexity (C++ backend)

Updated 14 Nov 2026.

**Scope of this file:** the algorithms, data structures, and complexity of the C++ backend. It covers both modules, their shared concepts, and the time/space complexity of each operation.

### **Notation**
- Module 1: N = Brent prices available, p = AR order, maxP = largest order tried (10), H = forecast horizon (10), s = validation step (7), W = validation windows ~ (N - 250 - H) / s.
- Module 2: n = training rows, f = features (8), d = max tree depth, G = hyperparameter combinations (12), T = training rows in walk-forward, L = levy rows (71).

## 1. Concepts used and where

| Concept | Where | Purpose |
|---|---|---|
| Dynamic arrays (`std::vector`) | Everywhere | Price series, coefficients, feature matrix, row-index lists |
| Recurrence / dynamic programming | `ARIMA::getCoefficients` (Levinson-Durbin) | Order m is built from the order m-1 solution (`phi_prev`) instead of solving a p x p system |
| Sliding / rolling window | `ARIMA::testAllWindows`, `walkForward` | Time-ordered validation: train on a prefix, predict the next block, grow the prefix |
| Sorting | `std::sort` on (feature, y) pairs in `findBestSplit` | Orders the candidate cut points per feature |
| Running (prefix) sums | `findBestSplit` | Scores every cut in O(1) using sum(y) and sum(y^2) |
| Binary tree (pointers) | `Node` with `left` / `right` | The regression tree |
| Recursion | `build`, `freeTree`, `countLeaves`, `printNode` | Recursive partitioning and traversal. `predict` is an iterative walk |
| Greedy algorithm | `build` | Each split is the locally lowest SSE; no backtracking |
| Linear search | `findCol`, carry-row and target-date lookup in `LevyAdvisor` | Column and row lookup |
| Manual memory management | `Node` allocation, recursive destructor, deleted copy constructor | Prevents leaks and double frees |
| String parsing | CSV loading, date helpers | I/O |

## 2. Module 1 complexity

| Operation | Time | Space |
|---|---|---|
| `loadCSV`, `toLog`, `makeStationary` | O(N) | O(N) |
| Autocovariances r[0..p] | O(N p) | O(p) |
| Levinson-Durbin recursion, one order p | O(p^2) | O(p) |
| `getCoefficients` total | O(N p + p^2) | O(N + p) |
| Naive alternative (Yule-Walker as a p x p system, Gaussian elimination) | O(p^3) after autocovariances | O(p^2) |
| `predictValues` + `integrateValues` | O(N + H p) (the N is a data copy) | O(N + H) |
| One validation window (`testOneWindow`) | O(N p) | O(N) |
| `testAllWindows`, one order p | O(W N p) = O(N^2 p / s) | O(N) |
| `findBestP` (orders 1..maxP, each re-fitted) | O(maxP^2 N^2 / s) | O(N) |
| `trainModel` / `forecastMean` | O(maxP^2 N^2 / s), dominated by the order search | O(N) |
| `gen_forecast_col` (one call per levy row) | O(L maxP^2 N^2 / s) | O(N) |

Notes for the report:
- Levinson-Durbin is O(p^2) against O(p^3) for direct solving. With maxP = 10 and N in the hundreds, the O(N p) autocovariance and the window loop dominate, so the real-time gap is tiny. The benchmark must scale p well beyond 10 (and check that coefficients match) to show the difference.
- The code re-runs Levinson-Durbin separately for every candidate order. The recursion produces all orders 1..p in one pass, but the code returns only order p, so order selection does not get the "all orders in one pass" saving. One pass would cost O(N maxP + maxP^2) per window instead of O(N maxP^2). Do not claim the O(maxP^2) vs O(maxP^4) order-selection gain unless that is implemented.
- Order selection is by rolling-window RMSE, not AIC/BIC.

## 3. Module 2 complexity

| Operation | Time | Space |
|---|---|---|
| `findBestSplit`, node with m rows | O(f m log m): build pairs O(f m), sort O(f m log m), sweep O(f m) | O(m) |
| Brute-force split search (comparison only; not in the code) | O(f m^2): rescore every cut from scratch | O(m) |
| `build` / `fit`, whole tree | O(d f n log n): rows at each depth sum to n, and the sum of m log m over a level <= n log n | O(n f) data + O(nodes) |
| Node count | <= min(2^(d+1) - 1, 2n / minLeaf) | |
| Recursion depth | d | |
| `predict`, one row | O(d) | O(1) |
| `evaluate` (RMSE, MAE, MAPE, R^2) | O(n) | O(1) |
| `walkForward`, one configuration | O((T / s) d f T log T) | O(T f) |
| Hyperparameter grid | O(G (T / s) d f T log T) | O(T f) |
| `loadDataset` | O(n x columns) | O(n f) |
| `LevyAdvisor` live / backtest | O(n) row lookup + O(d f n log n) fit + O(d) predict | O(n f) |

Actual sizes: f = 8, d = 3, n ~ 71, so the tree trains in milliseconds. Complexity matters for the analysis, not for runtime.