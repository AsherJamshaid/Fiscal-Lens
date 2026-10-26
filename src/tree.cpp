#include <bits/stdc++.h>
using namespace std;

struct Row { vector<double> x; double y; };

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

int main() {
  vector<double> x = {1, 2, 3, 10, 11, 12};
vector<double> y = {5, 5, 5, 20, 20, 20};
double t = 6.5;

vector<double> left, right;
// loop over i: if x[i] <= t, push y[i] into left, else into right

cout << sse(left) + sse(right) << endl;   // expect 0   
}