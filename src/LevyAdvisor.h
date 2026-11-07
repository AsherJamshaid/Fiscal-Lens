#pragma once
#include "RegressionTree.h"
#include <string>
#include <vector>

struct PetrolBuildupRow {
    std::string period_start;
    std::string period_end;
    double petroleum_levy_pkr_l;
    double carbon_levy_pkr_l;
    double retail_petrol_price_model;
};

struct CpiIncomeRow {
    std::string month;
    double cpi_index_oct2023_100;
    double min_wage_pkr_month;
};

struct AssembledInputs {
    std::string periodStart;
    double forecast_crude_price;
    std::string crude_label;
    std::string crude_detail;

    double retail_petrol_price;
    std::string retail_label;
    std::string retail_detail;

    double current_levy;
    std::string current_levy_label;
    std::string current_levy_detail;

    double min_wage_pkr_month;
    std::string min_wage_label;
    std::string min_wage_detail;

    double cpi_index_oct2023_100;
    std::string cpi_label;
    std::string cpi_detail;

    double affordability_index;
    std::string affordability_label;

    double levy_revenue_target_pkr_bn;
    std::string target_label;
    std::string target_detail;

    double levied_volume_bn_litres;
    std::string volume_label;
    std::string volume_detail;

    double fiscal_gap_pkr_bn;
    std::string fiscal_gap_label;
    std::string fiscal_gap_detail;

    double required_levy;
    std::string required_levy_label;
};

// Raw file loaders (matching columns by NAME)
bool loadPetrolBuildup(const std::string& path, std::vector<PetrolBuildupRow>& rows);
bool loadCpiIncome(const std::string& path, std::vector<CpiIncomeRow>& rows);

// Date utilities
std::string nextDay(const std::string& dateStr);
bool isValidDateFormat(const std::string& dateStr);

class LevyAdvisor {
public:
    std::vector<PetrolBuildupRow> buildupRows;
    std::vector<CpiIncomeRow> cpiRows;

    bool loadRawFiles(const std::string& buildupPath = "../data/raw/petrol_price_buildup_fortnightly.csv",
                      const std::string& cpiPath = "../data/raw/cpi_and_income_monthly.csv");

    std::string getLivePeriodStart() const;

    bool buildRow(const std::string& periodStart,
                  double crudeForecast,
                  const Dataset& ds,
                  bool isLive,
                  std::vector<double>& featureRow,
                  AssembledInputs& inputs) const;
};

int runLiveMode(double crudePrice);
int runBacktestMode(const std::string& targetDate);
