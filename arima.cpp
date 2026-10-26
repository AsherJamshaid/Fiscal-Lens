#include <iostream>
#include <vector>
#include<cmath>
#include<fstream>
#include<sstream>
using namespace std;
// x[t] = c + φ1·x[t-1] + φ2·x[t-2] + ... + φp·x[t-p] + e[t] -> general eq for AR(p)
bool loadCSV(const string& path, vector<string>& dates, vector<double>& prices) {
    ifstream file(path);
    if (!file.is_open()) return false;     // file nahi mili

    string line;
    getline(file, line);                   // pehli line (header) skip

    while (getline(file, line)) {
        if (line.empty()) continue;
        stringstream ss(line);
        string date, priceStr;
        getline(ss, date, ','); //this breakage can be done with the help of stringstream
        getline(ss, priceStr, ',');

        try {
            double price = stod(priceStr); // string se double
            dates.push_back(date);
            prices.push_back(price);
        } catch (...) {
            continue;
            }
    }
    return true;
}
class ARIMA {
// days ye batata hai ke har window mein kitne din aage predict karne hain. Default 30 hai,
//  matlab 700 din pe train karo to 701 se 730 tak ke 30 din predict honge aur unka RMSE nikalega.
// step ye batata hai ke agli window kitna aage khiskegi.
    // Step 1
    void toLog(vector<double> &data)
    {
        for (double &d:data)
        {
            d=log(d);
        }
    }
    vector<double> makeStationary(vector<double>& data)
    {
         toLog(data);
         vector<double> newData;
         for (int i=0;i<data.size()-1;i++)
         {
            newData.push_back(data[i+1]-data[i]);
         }
       return newData;
    }
    // Step 2
    vector<double> getCoefficients(const vector<double>& data, int p)
    {
     
        
    }

    // Step 3
    vector<double> predictValues(const vector<double>& data,
                                 const vector<double>& coeffs,
                                 int days) const;

    // Step 3.5
    vector<double> integrateValues(const vector<double>& predicted,
                                   const vector<double>& original) const;

    // Step 4
    double getRMSE(const vector<double>& predicted,
                   const vector<double>& actual) const;

    // Step 5 (improved)
    double testOneWindow(const vector<double>& data, int p, int trainEnd) const;
    double testAllWindows(const vector<double>& data, int p) const;
    int findBestP(const vector<double>& data);
    double baselineRMSE(const vector<double>& data) const;

    int getBestP() const;
    const vector<double>& getErrors() const;  // errors[p-1] = avg RMSE of AR(p)

    int maxP;
    int days;
    int step;
    int startTrain;

    int bestP;
    vector<double> errors;
    vector<double> coeffs;
    vector<double> history;
    public:
    ARIMA(int maxP = 10, int days = 30, int step = 7, int startTrain = 700);
    void trainModel(const vector<double>& data);
    vector<double> forecast(int days) const;
};
int main() {
    return 0;
}