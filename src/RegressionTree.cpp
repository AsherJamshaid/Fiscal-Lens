#include "RegressionTree.h"
#include <iostream>
#include <fstream>
#include <sstream>
#include <algorithm>
#include <cmath>
#include <iomanip>
#include <random>

// ---------------------------- CONFIG (toggles) ------------------------------
// (constants are declared in RegressionTree.h)
// CSV_PATH                  rows must be sorted oldest -> newest
// PREDICT_MULTIPLIER        true: learn levy/required_levy; false: learn levy directly
// USE_REQUIRED_LEVY_FEATURE add required_levy = target/volume as an input column
// RULE_FEATURES_ONLY        true: only crude, affordability, target, volume
// TRAIN_FRACTION            chronological split, never shuffled
// MIN_GAIN                  ignore splits that only fit rounding noise

// ======================== PART 1: NODE AND TREE ==============================
// Node (declared in RegressionTree.h)
//   prediction   mean of y of the samples that reached this node
//   left         value <= threshold
//   right        value >  threshold
// Split (declared in RegressionTree.h)
//   cost         SSE(left) + SSE(right); lower is better

// a new split must beat the best one by a tiny margin, so rounding noise
// cannot flip ties differently between the two search methods
static bool improves(double cost, double best) {
    return cost < best - 1e-12 * (1.0 + fabs(best));
}

// Finds the best question for one node. For each feature: sort the rows,
// slide a cut from left to right, and keep running totals so each cut costs
// O(1) to score. SSE of a group = sum(y^2) - (sum(y))^2 / count.
Split RegressionTree::findBestSplit(const vector<vector<double>>& X, const vector<double>& y,
                                    const vector<int>& idx) {
    int n = idx.size(), numFeatures = X[0].size();
    double totalSum = 0, totalSq = 0;
    for (int k = 0; k < n; k++) { double v = y[idx[k]]; totalSum += v; totalSq += v * v; }

    Split best{false, -1, 0, 1e300};
    for (int j = 0; j < numFeatures; j++) {
        vector<pair<double, double>> data;
        for (int k = 0; k < n; k++) data.push_back({X[idx[k]][j], y[idx[k]]});
        sort(data.begin(), data.end());

        double sumLeft = 0, sqLeft = 0;
        for (int k = 0; k < n - 1; k++) {
            sumLeft += data[k].second;
            sqLeft += data[k].second * data[k].second;
            int cL = k + 1, cR = n - cL;
            if (data[k].first == data[k + 1].first) continue;     // cannot cut between equal values
            if (cL < minSamplesLeaf || cR < minSamplesLeaf) continue;
            double sumRight = totalSum - sumLeft, sqRight = totalSq - sqLeft;
            double cost = (sqLeft - sumLeft * sumLeft / cL) + (sqRight - sumRight * sumRight / cR);
            if (improves(cost, best.cost)) {
                best = {true, j, (data[k].first + data[k + 1].first) / 2.0, cost};
            }
        }
    }
    return best;
}

// Recursive partitioning: greedy, locally best split, no backtracking.
Node* RegressionTree::build(const vector<vector<double>>& X, const vector<double>& y,
                            const vector<int>& idx, int depth) {
    Node* node = new Node();
    int n = idx.size();
    node->nSamples = n;

    double sum = 0, sumSq = 0;
    for (int k = 0; k < n; k++) { sum += y[idx[k]]; sumSq += y[idx[k]] * y[idx[k]]; }
    node->prediction = sum / n;
    double ownError = sumSq - sum * sum / n;

    if (depth >= maxDepth) return node;          // base cases
    if (n < minSamplesSplit) return node;
    if (ownError < 1e-12) return node;

    Split s = findBestSplit(X, y, idx);
    if (!s.found) return node;
    if (s.cost >= ownError - MIN_GAIN) return node; // split barely helps

    vector<int> leftIdx, rightIdx;
    for (int k = 0; k < n; k++) {
        int row = idx[k];
        if (X[row][s.feature] <= s.threshold) leftIdx.push_back(row);
        else rightIdx.push_back(row);
    }
    node->isLeaf = false;
    node->featureIndex = s.feature;
    node->threshold = s.threshold;
    node->left = build(X, y, leftIdx, depth + 1);
    node->right = build(X, y, rightIdx, depth + 1);
    return node;
}

void RegressionTree::freeTree(Node* node) {
    if (!node) return;
    freeTree(node->left);
    freeTree(node->right);
    delete node;
}
int RegressionTree::countLeaves(Node* node) const {
    if (!node) return 0;
    if (node->isLeaf) return 1;
    return countLeaves(node->left) + countLeaves(node->right);
}
void RegressionTree::printNode(Node* node, const vector<string>& names, const string& label, int indent) const {
    string pad(indent * 2, ' ');
    if (node->isLeaf) {
        cout << pad << "-> " << label << " = " << node->prediction
             << "  (samples: " << node->nSamples << ")\n";
        return;
    }
    cout << pad << "if " << names[node->featureIndex] << " <= " << node->threshold << ":\n";
    printNode(node->left, names, label, indent + 1);
    cout << pad << "else:\n";
    printNode(node->right, names, label, indent + 1);
}

RegressionTree::RegressionTree(int depth, int minSplit, int minLeaf)
    : root(nullptr), maxDepth(depth), minSamplesSplit(minSplit),
      minSamplesLeaf(minLeaf) {}
RegressionTree::~RegressionTree() { freeTree(root); }

void RegressionTree::fit(const vector<vector<double>>& X, const vector<double>& y) {
    freeTree(root);
    vector<int> idx(y.size());
    for (int i = 0; i < (int)y.size(); i++) idx[i] = i;
    root = build(X, y, idx, 0);
}
double RegressionTree::predict(const vector<double>& x) const {
    Node* cur = root;
    while (!cur->isLeaf) cur = (x[cur->featureIndex] <= cur->threshold) ? cur->left : cur->right;
    return cur->prediction;
}
int RegressionTree::leaves() const { return countLeaves(root); }
void RegressionTree::print(const vector<string>& names, const string& label) const { printNode(root, names, label, 0); }

// ============================ PART 2: DATASET ================================
// Dataset (declared in RegressionTree.h)
//   y            what the tree learns (multiplier or levy)
//   levy         true levy_value, PKR/litre
//   scale        levy = y * scale  (required_levy, or 1.0 in direct mode)
//   currentLevy  levy applied in the previous fortnight (an input)

static vector<string> splitLine(const string& line, char delim) {
    vector<string> parts;
    string cell;
    stringstream ss(line);
    while (getline(ss, cell, delim)) {
        if (!cell.empty() && cell.back() == '\r') cell.pop_back();
        parts.push_back(cell);
    }
    return parts;
}

static int findCol(const vector<string>& header, const string& name) {
    for (size_t i = 0; i < header.size(); i++) {
        string h = header[i];
        if (!h.empty() && h.back() == '\r') h.pop_back();
        if (h == name) return (int)i;
    }
    return -1;
}

bool loadDataset(const string& path, Dataset& ds) {
    ifstream file(path);
    if (!file) { cout << "ERROR: cannot open " << path << "\n"; return false; }

    string line;
    getline(file, line);
    char delim = (line.find('\t') != string::npos) ? '\t' : ',';   // accepts TSV or CSV
    vector<string> header = splitLine(line, delim);

    vector<string> wanted;
    if (RULE_FEATURES_ONLY)
        wanted = {"forecast_crude_price", "affordability_index",
                  "levy_revenue_target_pkr_bn", "levied_volume_bn_litres"};
    else
        wanted = {"forecast_crude_price", "usd_pkr", "affordability_index",
                  "levy_revenue_target_pkr_bn", "fiscal_gap_pkr_bn", "current_levy",
                  "retail_petrol_price", "levied_volume_bn_litres"};

    vector<int> cols;
    for (const string& w : wanted) {
        int c = findCol(header, w);
        if (c < 0) { cout << "ERROR: column not found: " << w << "\n"; return false; }
        cols.push_back(c);
        ds.featureNames.push_back(w);
    }
    int cTarget = findCol(header, "levy_revenue_target_pkr_bn");
    int cVolume = findCol(header, "levied_volume_bn_litres");
    int cCurrent = findCol(header, "current_levy");
    int cLevy = findCol(header, "levy_value");
    if (cTarget < 0 || cVolume < 0 || cCurrent < 0 || cLevy < 0) {
        cout << "ERROR: need levy_revenue_target_pkr_bn, levied_volume_bn_litres, current_levy, levy_value\n";
        return false;
    }
    if (USE_REQUIRED_LEVY_FEATURE) ds.featureNames.push_back("required_levy");

    while (getline(file, line)) {
        if (line.empty()) continue;
        vector<string> cells = splitLine(line, delim);
        if (cells.size() < header.size()) continue;      // skip broken rows
        try {
            vector<double> row;
            for (int c : cols) row.push_back(stod(cells[c]));
            double target = stod(cells[cTarget]);
            double volume = stod(cells[cVolume]);
            double levy = stod(cells[cLevy]);
            if (volume <= 0) { cout << "ERROR: non-positive volume in row: " << line << "\n"; return false; }
            double required = target / volume;           // PKR/litre needed to hit the revenue target
            if (USE_REQUIRED_LEVY_FEATURE) row.push_back(required);

            double sc = PREDICT_MULTIPLIER ? required : 1.0;
            ds.X.push_back(row);
            ds.levy.push_back(levy);
            ds.scale.push_back(sc);
            ds.y.push_back(levy / sc);
            ds.currentLevy.push_back(stod(cells[cCurrent]));
        } catch (const exception&) {
            cout << "ERROR: invalid value in row: " << line << "\n";
            return false;
        }
    }
    return true;
}

// ============================ PART 3: METRICS ================================

Metrics evaluate(const vector<double>& actual, const vector<double>& pred) {
    int n = actual.size();
    double mean = 0;
    for (double v : actual) mean += v;
    mean /= n;
    double se = 0, ae = 0, pe = 0, ssTot = 0;
    int pc = 0;
    for (int i = 0; i < n; i++) {
        double e = actual[i] - pred[i];
        se += e * e;
        ae += fabs(e);
        if (fabs(actual[i]) > 1e-12) { pe += fabs(e) / fabs(actual[i]) * 100; pc++; }
        ssTot += (actual[i] - mean) * (actual[i] - mean);
    }
    Metrics m;
    m.rmse = sqrt(se / n);
    m.mae = ae / n;
    m.mape = pc ? pe / pc : -1;
    m.r2 = ssTot > 1e-12 ? 1.0 - se / ssTot : 0;
    return m;
}

double rmseOf(const vector<double>& a, const vector<double>& p) { return evaluate(a, p).rmse; }

int bandOf(double levy) { return levy < 55 ? 0 : (levy < 70 ? 1 : 2); }   // LOW / MEDIUM / HIGH
const char* bandName(int b) { return b == 0 ? "LOW" : (b == 1 ? "MEDIUM" : "HIGH"); }

// Predict levy (PKR/litre) for row i of a dataset with a fitted tree
double levyPrediction(const RegressionTree& t, const Dataset& ds, int i) {
    return t.predict(ds.X[i]) * ds.scale[i];
}

// ======================= PART 4: WALK-FORWARD VALIDATION =====================
// Train on rows [0,a), predict the next `step` rows, grow a, repeat.
// Only the rows passed in (the TRAINING rows) are ever used. RMSE in levy units.
double walkForward(const Dataset& ds, int trainCount, int startSize, int step,
                   int depth, int minSplit, int minLeaf) {
    double s = 0; int cnt = 0;
    for (int a = startSize; a + step <= trainCount; a += step) {
        vector<vector<double>> Xa(ds.X.begin(), ds.X.begin() + a);
        vector<double> ya(ds.y.begin(), ds.y.begin() + a);
        RegressionTree m(depth, minSplit, minLeaf);
        m.fit(Xa, ya);
        for (int k = a; k < a + step; k++) {
            double d = ds.levy[k] - levyPrediction(m, ds, k);
            s += d * d; cnt++;
        }
    }
    return cnt ? sqrt(s / cnt) : -1;
}

// "previous levy" baseline over exactly the rows walkForward predicts
double walkForwardPersistence(const Dataset& ds, int trainCount, int startSize, int step) {
    int end = startSize + ((trainCount - startSize) / step) * step;
    double s = 0; int cnt = 0;
    for (int k = startSize; k < end; k++) {
        double d = ds.levy[k] - ds.levy[k - 1];
        s += d * d; cnt++;
    }
    return cnt ? sqrt(s / cnt) : -1;
}

// =============================== PART 5: MAIN ================================
int main() {
    Dataset ds;
    if (!loadDataset(CSV_PATH, ds)) return 1;
    int N = ds.y.size();
    if (N < 10) { cout << "ERROR: dataset too small.\n"; return 1; }

    cout << fixed << setprecision(3);
    int trainCount = (int)(N * TRAIN_FRACTION);
    int testCount = N - trainCount;

    cout << "========================================\n";
    cout << "   LEVY ADVISOR - CLEANED DEMO REPORT\n";
    cout << "========================================\n";
    cout << "NOTE: labels are synthetic and rule-based. Scores measure rule recovery,\n"
         << "not real-world levy prediction.\n";

    cout << "\nCONFIGURATION\n";
    cout << "Target learned:      " << (PREDICT_MULTIPLIER ? "relief multiplier (levy / required_levy)" : "levy directly") << "\n";
    cout << "required_levy input: " << (USE_REQUIRED_LEVY_FEATURE ? "yes" : "no") << "\n";
    cout << "Feature set:         " << (RULE_FEATURES_ONLY ? "rule features only" : "all 8 columns") << "\n";

    cout << "\nDATASET SUMMARY\n";
    cout << "Total samples:       " << N << "\n";
    cout << "Training samples:    " << trainCount << " (oldest, chronological)\n";
    cout << "Testing samples:     " << testCount << " (newest)\n";
    cout << "Input features (" << ds.featureNames.size() << "): ";
    for (size_t i = 0; i < ds.featureNames.size(); i++) cout << ds.featureNames[i] << (i + 1 < ds.featureNames.size() ? ", " : "\n");

    // ---- hyperparameter selection: walk-forward on TRAINING rows only ----
    int wfStart = trainCount / 2, wfStep = 3;
    cout << "\nHYPERPARAMETER SELECTION (walk-forward on training rows, start " << wfStart
         << ", step " << wfStep << ")\n";
    double wfPersist = walkForwardPersistence(ds, trainCount, wfStart, wfStep);
    cout << "Previous-levy baseline RMSE on the same rows: " << wfPersist << "\n";
    cout << left << setw(8) << "depth" << setw(10) << "minLeaf" << "walk-forward RMSE\n";

    int bestDepth = 3, bestLeaf = 8;
    double bestWF = 1e300;
    int depths[] = {3, 4, 5, 6};
    int leaves[] = {8, 5, 3};                 // simplest first, so ties favour the simpler tree
    for (int d : depths) {
        for (int l : leaves) {
            double w = walkForward(ds, trainCount, wfStart, wfStep, d, 2 * l, l);
            if (w < 0) continue;
            cout << left << setw(8) << d << setw(10) << l << w << "\n";
            if (w < bestWF - 1e-9) { bestWF = w; bestDepth = d; bestLeaf = l; }
        }
    }
    int bestSplit = 2 * bestLeaf;
    if (bestWF > 1e299) { cout << "Not enough training rows for walk-forward; using defaults.\n"; bestDepth = 4; bestLeaf = 3; bestSplit = 6; }
    cout << "Chosen: depth " << bestDepth << ", min leaf " << bestLeaf << ", min split " << bestSplit << "\n";

    // ---- final fit and test ----
    vector<vector<double>> Xtrain(ds.X.begin(), ds.X.begin() + trainCount);
    vector<double> ytrain(ds.y.begin(), ds.y.begin() + trainCount);
    RegressionTree tree(bestDepth, bestSplit, bestLeaf);
    tree.fit(Xtrain, ytrain);

    vector<double> trainActual(ds.levy.begin(), ds.levy.begin() + trainCount), trainPred;
    for (int i = 0; i < trainCount; i++) trainPred.push_back(levyPrediction(tree, ds, i));
    Metrics tr = evaluate(trainActual, trainPred);

    vector<double> actual, pred;
    for (int i = trainCount; i < N; i++) { actual.push_back(ds.levy[i]); pred.push_back(levyPrediction(tree, ds, i)); }
    Metrics te = evaluate(actual, pred);

    cout << "\nTREE SIZE: " << tree.leaves() << " leaves\n";
    cout << "\nTRAIN PERFORMANCE (levy units, PKR/litre)\n";
    cout << "RMSE:                " << tr.rmse << "\nR-squared:           " << tr.r2 << "\n";

    cout << "\nTEST PERFORMANCE (chronological split, levy units, PKR/litre)\n";
    cout << "RMSE:                " << te.rmse << "\n";
    cout << "MAE:                 " << te.mae << "\n";
    cout << "MAPE:                " << te.mape << "%   (error size only, not 'accuracy')\n";
    cout << "R-squared:           " << te.r2 << "\n";
    int bandHits = 0;
    for (int i = 0; i < testCount; i++) if (bandOf(actual[i]) == bandOf(pred[i])) bandHits++;
    cout << "Band accuracy:       " << bandHits << " / " << testCount
         << "  (LOW <55, MEDIUM <70, HIGH)\n";

    // ---- baselines on the same test rows ----
    double trainMean = 0;
    for (double v : trainActual) trainMean += v;
    trainMean /= trainCount;
    vector<double> pMean(testCount, trainMean), pPrev, pCur;
    for (int i = 0; i < testCount; i++) {
        pPrev.push_back(i == 0 ? ds.levy[trainCount - 1] : actual[i - 1]);
        pCur.push_back(ds.currentLevy[trainCount + i]);
    }
    double rMean = rmseOf(actual, pMean), rPrev = rmseOf(actual, pPrev), rCur = rmseOf(actual, pCur);

    cout << "\nBASELINES ON THE SAME TEST ROWS (RMSE, lower is better)\n";
    cout << left << setw(34) << "Model (this tree)" << te.rmse << "\n";
    cout << setw(34) << "Training mean" << rMean << "\n";
    cout << setw(34) << "Previous recommended levy" << rPrev << "\n";
    cout << setw(34) << "Current levy (status quo)" << rCur << "\n";
    cout << "Walk-forward RMSE of chosen model (training rows): " << bestWF
         << "  vs previous-levy " << wfPersist << "\n";

    // ---- actual vs predicted ----
    cout << "\nACTUAL VS PREDICTED (test rows)\n";
    cout << "---------------------------------------------------------------\n";
    cout << left << setw(5) << "No." << setw(10) << "Actual" << setw(11) << "Predicted"
         << setw(10) << "Abs Err" << setw(9) << "Err %" << "Band (actual/pred)\n";
    cout << "---------------------------------------------------------------\n";
    for (int i = 0; i < testCount; i++) {
        double err = fabs(actual[i] - pred[i]);
        cout << left << setw(5) << i + 1 << setw(10) << actual[i] << setw(11) << pred[i]
             << setw(10) << err << setw(9) << (err / fabs(actual[i]) * 100)
             << bandName(bandOf(actual[i])) << "/" << bandName(bandOf(pred[i])) << "\n";
    }
    vector<double> sortedPred = pred;
    sort(sortedPred.begin(), sortedPred.end());
    int distinct = unique(sortedPred.begin(), sortedPred.end(),
                          [](double a, double b) { return fabs(a - b) < 1e-9; }) - sortedPred.begin();
    cout << "Distinct predicted values on test rows: " << distinct << " of " << testCount << "\n";

    // ---- learned rules ----
    cout << "\nLEARNED REGRESSION TREE (leaf value = "
         << (PREDICT_MULTIPLIER ? "multiplier" : "levy") << ")\n";
    cout << "-----------------------------------------------\n";
    tree.print(ds.featureNames, PREDICT_MULTIPLIER ? "multiplier" : "levy");

    // ---- rule-recovery check: shuffled split, diagnostic only ----
    {
        vector<int> order(N);
        for (int i = 0; i < N; i++) order[i] = i;
        mt19937 rng(42);
        shuffle(order.begin(), order.end(), rng);
        vector<vector<double>> Xs; vector<double> ys;
        for (int i = 0; i < trainCount; i++) { Xs.push_back(ds.X[order[i]]); ys.push_back(ds.y[order[i]]); }
        RegressionTree t(bestDepth, bestSplit, bestLeaf);
        t.fit(Xs, ys);
        vector<double> a2, p2;
        for (int i = trainCount; i < N; i++) {
            int r = order[i];
            a2.push_back(ds.levy[r]);
            p2.push_back(levyPrediction(t, ds, r));
        }
        Metrics m = evaluate(a2, p2);
        cout << "\nRULE-RECOVERY CHECK (shuffled split, DIAGNOSTIC ONLY, not a forecast)\n";
        cout << "RMSE: " << m.rmse << "   R-squared: " << m.r2 << "\n";
        cout << "High here and low on the chronological test = the tree recovers the rule\n"
             << "but cannot handle values it has not seen in time.\n";
    }

    cout << "\n========================================\n";
    cout << "END OF REPORT\n";
    cout << "========================================\n";
    return 0;
}
