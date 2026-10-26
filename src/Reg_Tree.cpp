#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

struct TreeNode{
    int featureIndex;
    double threshold;
    double prediction;
    TreeNode* left;
    TreeNode* right;
    TreeNode() : featureIndex(-1), threshold(0), prediction(0),
                 left(nullptr), right(nullptr) {}
};

struct SplitResult {
    bool found;
    int featureIndex;
    double threshold;
    double sse;   // combined SSE of left + right after the split
};

// struct Row { vector<double> x; double y; };  // why needed?

double mean(const vector<double>& ys) {
    double s = 0;
    for (double v : ys) s += v; 
    return s / ys.size();
}

double sse(const vector<double>& ys){
    if(ys.empty())
     return 0;
    double m = mean(ys);   // mean
    double a= 0;
    for(int i=0; i<ys.size(); i++){     
        a += (ys[i]-m)*(ys[i]-m);    // ye sum of squared hain
    }
    return a;
}

// Brute force, one feature: try a threshold between every pair of
// neighbouring distinct sorted values, keep the lowest combined SSE.
SplitResult bestThreshold(const vector<double>& x, const vector<double>& y) {
    SplitResult best = {false, 0, 0, sse(y)};   // must beat the unsplit SSE

    vector<double> sortedX = x;
    sort(sortedX.begin(), sortedX.end());

    for (int i = 0; i + 1 < sortedX.size(); i++) {
        if (sortedX[i] == sortedX[i + 1]) continue;   // no gap, no valid threshold
        double t = (sortedX[i] + sortedX[i + 1]) / 2.0;
        double score = splitscore(x, y, t);
        if (score < best.sse) {
            best.found = true;
            best.threshold = t;
            best.sse = score;
        }
    }
    return best;
}

double splitscore(const vector<double>& x, const vector<double>&y, double t){
    vector<double> l, r;
    for(int i=0; i<x.size(); i++){     
        if(x[i]<=t)    // we are comparing the x val with midpoint. is se we which side the y needs to go. remember, x is the value we decide WHHERE to split.
        l.push_back(y[i]); // and y is the predicted value.
    else
    r.push_back(y[i]);
    }
    return sse(l)+sse(r);
}


int main() {
vector<double> x = {1, 2, 3, 10, 11, 12};
vector<double> y = {5, 5, 5, 20, 20, 20};
double t = 6.5;

vector<double> left, right;
// loop over i: if x[i] <= t, push y[i] into left, else into right

cout << sse(left) + sse(right) << endl;   // expect 0   
}

// X = { {85,30,10}, {65,48,10}, {72,40,11} };   // 2D: X[i][f]
// y = { 20, 10, 15 };                            // 1D: y[i]

/*
sample   forecasted_price  affordability  imf_target |  levy (y)
  0            85               30            10     |    20
  1            65               48            10     |    10
  2            72               40            11     |    15
*/