#include <iostream>
#include <vector>
using namespace std;

class ARIMA {
public:
// days ye batata hai ke har window mein kitne din aage predict karne hain. Default 30 hai,
//  matlab 700 din pe train karo to 701 se 730 tak ke 30 din predict honge aur unka RMSE nikalega.
// step ye batata hai ke agli window kitna aage khiskegi. Default 30 hai,
//  to origin 700 → 730 → 760 → 790 aise badhta hai.
Arima(int maxP = 10, int days = 90, int step = 90, int startTrain = 700);

    // Step 1
    bool checkStationarity(const vector<double>& data) const;
    vector<double> makeStationary(const vector<double>& data) const;

    // Step 2
    vector<double> getCoefficients(const vector<double>& data, int p) const;

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

    // Final
    void trainModel(const vector<double>& data);
    vector<double> forecast(int days) const;

    int getBestP() const;
    const vector<double>& getErrors() const;  // errors[p-1] = avg RMSE of AR(p)

private:
    int maxP;
    int days;
    int step;
    int startTrain;

    int bestP;
    vector<double> errors;
    vector<double> coeffs;
    vector<double> history;
};
// Note :
// Overlapping windows ke saath kuch masle hain, lekin chhote hain.
// 1. **Windows ek doosre jaisi hoti hain.** Origin 700 aur 707 ki test windows ke 30 mein se 23 din
// same hain, to dono ke RMSE lagbhag ek jaise aate hain. Tumhe lagega 40 alag tests ka average hai,
// lekin asal mein bohat kam alag information hai. Is ka asar ye hai ke average zyada pakka dikhta
// hai jitna wo hai. Phir bhi AR(1) se AR(10) ko rank karne ke liye ye theek kaam karta hai, kyunki
//  sab p ke saath ek hi windows use hoti hain, to compare fair rehta hai.
// 2. **Compute zyada lagta hai.** 40 windows × 10 values of p = 400 se zyada fits. C++ mein daily
//  data pe ye ek second se kam ka kaam hai, to masla nahi. Bas Levinson-Durbin ya normal equations 
// use karo, har baar bhari optimisation mat chalao.
// 3. **Ek ajeeb period average kharab kar sakta hai.** RMSE bade jhatkon ko zyada weight deta hai.
//  Agar data mein oil ya PKR ka koi bada crash hai, to jin windows mein wo aaya unka error baqi
//  sab pe bhari pad sakta hai. Is liye average ke saath median RMSE bhi nikal lo. Agar dono ka 
// best p alag aaye, to samajh jao ke kuch outlier window ka asar hai.
// 4. **Data leakage nahi hona chahiye.** Har window mein training sirf `data[0..t)` se honi chahiye,
//  aage ka kuch nahi. Ye step galat hua to saare nateeje bekaar hain, aur ye sabse aam galti hai
//  jo code mein ho jati hai.
int main() {
    return 0;
}