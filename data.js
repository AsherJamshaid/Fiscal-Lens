// DATA CONFIG: add/remove chart features here. Each key must exist in every HISTORY row.
// Colors control lines and legend. Confirm crude price units before changing the unit label.
const FEATURES = [
  {
    "key": "forecast_crude_price",
    "label": "Forecast crude",
    "unit": "Source price units",
    "color": "#97beff"
  },
  {
    "key": "usd_pkr",
    "label": "USD / PKR",
    "unit": "PKR / USD",
    "color": "#f2ce63"
  },
  {
    "key": "affordability_index",
    "label": "Affordability",
    "unit": "Index",
    "color": "#c0a5f5"
  },
  {
    "key": "levy_revenue_target_pkr_bn",
    "label": "Revenue target",
    "unit": "PKR bn",
    "color": "#d2d9e5"
  },
  {
    "key": "fiscal_gap_pkr_bn",
    "label": "Fiscal gap",
    "unit": "PKR bn",
    "color": "#7fa0ef"
  },
  {
    "key": "current_levy",
    "label": "Current levy",
    "unit": "PKR / litre",
    "color": "#e1b5fa"
  },
  {
    "key": "retail_petrol_price",
    "label": "Retail petrol",
    "unit": "PKR / litre",
    "color": "#b7d4ff"
  },
  {
    "key": "levied_volume_bn_litres",
    "label": "Levied volume",
    "unit": "bn litres",
    "color": "#d6bd7f"
  }
];

// Historical training inputs from levy_training.csv, ordered by period_start.
// forecast_crude_price is an existing dataset input, NOT a forecast computed by this page.
const HISTORY = [
  {
    "date": "2023-11-16",
    "forecast_crude_price": 96.14,
    "usd_pkr": 283.479,
    "affordability_index": 26.676,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -6.39,
    "current_levy": 60.0,
    "retail_petrol_price": 293.55,
    "levied_volume_bn_litres": 0.71
  },
  {
    "date": "2023-12-01",
    "forecast_crude_price": 79.76,
    "usd_pkr": 282.467,
    "affordability_index": 25.414,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -7.41,
    "current_levy": 60.0,
    "retail_petrol_price": 301.52,
    "levied_volume_bn_litres": 0.727
  },
  {
    "date": "2023-12-16",
    "forecast_crude_price": 73.01,
    "usd_pkr": 281.42,
    "affordability_index": 27.011,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -8.13,
    "current_levy": 60.0,
    "retail_petrol_price": 283.69,
    "levied_volume_bn_litres": 0.739
  },
  {
    "date": "2024-01-01",
    "forecast_crude_price": 72.29,
    "usd_pkr": 280.245,
    "affordability_index": 27.835,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -7.71,
    "current_levy": 60.0,
    "retail_petrol_price": 269.64,
    "levied_volume_bn_litres": 0.732
  },
  {
    "date": "2024-01-16",
    "forecast_crude_price": 72.9,
    "usd_pkr": 279.712,
    "affordability_index": 28.528,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -8.91,
    "current_levy": 60.0,
    "retail_petrol_price": 263.09,
    "levied_volume_bn_litres": 0.752
  },
  {
    "date": "2024-02-01",
    "forecast_crude_price": 80.09,
    "usd_pkr": 279.467,
    "affordability_index": 28.163,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -8.01,
    "current_levy": 60.0,
    "retail_petrol_price": 261.93,
    "levied_volume_bn_litres": 0.737
  },
  {
    "date": "2024-02-16",
    "forecast_crude_price": 83.69,
    "usd_pkr": 279.163,
    "affordability_index": 27.423,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -8.19,
    "current_levy": 60.0,
    "retail_petrol_price": 269.0,
    "levied_volume_bn_litres": 0.74
  },
  {
    "date": "2024-03-01",
    "forecast_crude_price": 85.09,
    "usd_pkr": 278.756,
    "affordability_index": 26.251,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -7.65,
    "current_levy": 60.0,
    "retail_petrol_price": 276.64,
    "levied_volume_bn_litres": 0.731
  },
  {
    "date": "2024-03-16",
    "forecast_crude_price": 82.2,
    "usd_pkr": 278.182,
    "affordability_index": 25.952,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -8.19,
    "current_levy": 60.0,
    "retail_petrol_price": 279.83,
    "levied_volume_bn_litres": 0.74
  },
  {
    "date": "2024-04-01",
    "forecast_crude_price": 79.69,
    "usd_pkr": 277.931,
    "affordability_index": 25.872,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -7.89,
    "current_levy": 60.0,
    "retail_petrol_price": 276.98,
    "levied_volume_bn_litres": 0.735
  },
  {
    "date": "2024-04-16",
    "forecast_crude_price": 90.44,
    "usd_pkr": 277.94,
    "affordability_index": 26.263,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -8.01,
    "current_levy": 60.0,
    "retail_petrol_price": 272.85,
    "levied_volume_bn_litres": 0.737
  },
  {
    "date": "2024-05-01",
    "forecast_crude_price": 89.89,
    "usd_pkr": 278.329,
    "affordability_index": 24.989,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -6.93,
    "current_levy": 60.0,
    "retail_petrol_price": 284.12,
    "levied_volume_bn_litres": 0.719
  },
  {
    "date": "2024-05-16",
    "forecast_crude_price": 79.55,
    "usd_pkr": 278.228,
    "affordability_index": 24.762,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -6.57,
    "current_levy": 60.0,
    "retail_petrol_price": 286.72,
    "levied_volume_bn_litres": 0.713
  },
  {
    "date": "2024-06-01",
    "forecast_crude_price": 82.69,
    "usd_pkr": 277.988,
    "affordability_index": 25.429,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -6.93,
    "current_levy": 60.0,
    "retail_petrol_price": 276.45,
    "levied_volume_bn_litres": 0.719
  },
  {
    "date": "2024-06-16",
    "forecast_crude_price": 84.89,
    "usd_pkr": 278.213,
    "affordability_index": 25.57,
    "levy_revenue_target_pkr_bn": 36.21,
    "fiscal_gap_pkr_bn": -7.17,
    "current_levy": 60.0,
    "retail_petrol_price": 274.93,
    "levied_volume_bn_litres": 0.723
  },
  {
    "date": "2024-07-01",
    "forecast_crude_price": 85.82,
    "usd_pkr": 278.179,
    "affordability_index": 28.959,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 8.38,
    "current_levy": 60.0,
    "retail_petrol_price": 278.24,
    "levied_volume_bn_litres": 0.75
  },
  {
    "date": "2024-07-16",
    "forecast_crude_price": 87.54,
    "usd_pkr": 278.666,
    "affordability_index": 27.598,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 0.25,
    "current_levy": 70.0,
    "retail_petrol_price": 291.96,
    "levied_volume_bn_litres": 0.759
  },
  {
    "date": "2024-08-01",
    "forecast_crude_price": 78.91,
    "usd_pkr": 278.727,
    "affordability_index": 27.135,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 1.3,
    "current_levy": 70.0,
    "retail_petrol_price": 294.68,
    "levied_volume_bn_litres": 0.744
  },
  {
    "date": "2024-08-16",
    "forecast_crude_price": 76.97,
    "usd_pkr": 278.608,
    "affordability_index": 27.955,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 1.44,
    "current_levy": 70.0,
    "retail_petrol_price": 286.04,
    "levied_volume_bn_litres": 0.742
  },
  {
    "date": "2024-09-01",
    "forecast_crude_price": 75.89,
    "usd_pkr": 278.867,
    "affordability_index": 28.357,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 1.23,
    "current_levy": 70.0,
    "retail_petrol_price": 280.41,
    "levied_volume_bn_litres": 0.745
  },
  {
    "date": "2024-09-16",
    "forecast_crude_price": 76.73,
    "usd_pkr": 278.408,
    "affordability_index": 28.695,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 0.53,
    "current_levy": 70.0,
    "retail_petrol_price": 277.1,
    "levied_volume_bn_litres": 0.755
  },
  {
    "date": "2024-10-01",
    "forecast_crude_price": 75.64,
    "usd_pkr": 277.854,
    "affordability_index": 28.448,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 0.46,
    "current_levy": 70.0,
    "retail_petrol_price": 277.91,
    "levied_volume_bn_litres": 0.756
  },
  {
    "date": "2024-10-16",
    "forecast_crude_price": 68.39,
    "usd_pkr": 277.626,
    "affordability_index": 28.554,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 1.72,
    "current_levy": 70.0,
    "retail_petrol_price": 276.88,
    "levied_volume_bn_litres": 0.738
  },
  {
    "date": "2024-11-01",
    "forecast_crude_price": 74.19,
    "usd_pkr": 277.564,
    "affordability_index": 29.461,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 0.04,
    "current_levy": 70.0,
    "retail_petrol_price": 267.28,
    "levied_volume_bn_litres": 0.762
  },
  {
    "date": "2024-11-16",
    "forecast_crude_price": 64.57,
    "usd_pkr": 277.985,
    "affordability_index": 28.996,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -0.03,
    "current_levy": 70.0,
    "retail_petrol_price": 271.57,
    "levied_volume_bn_litres": 0.763
  },
  {
    "date": "2024-12-01",
    "forecast_crude_price": 64.05,
    "usd_pkr": 278.002,
    "affordability_index": 30.016,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -0.1,
    "current_levy": 70.0,
    "retail_petrol_price": 261.47,
    "levied_volume_bn_litres": 0.764
  },
  {
    "date": "2024-12-16",
    "forecast_crude_price": 68.22,
    "usd_pkr": 278.171,
    "affordability_index": 30.471,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 0.6,
    "current_levy": 70.0,
    "retail_petrol_price": 257.57,
    "levied_volume_bn_litres": 0.754
  },
  {
    "date": "2025-01-01",
    "forecast_crude_price": 77.42,
    "usd_pkr": 278.244,
    "affordability_index": 29.997,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 0.11,
    "current_levy": 70.0,
    "retail_petrol_price": 261.1,
    "levied_volume_bn_litres": 0.761
  },
  {
    "date": "2025-01-16",
    "forecast_crude_price": 83.07,
    "usd_pkr": 278.427,
    "affordability_index": 28.793,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -0.94,
    "current_levy": 70.0,
    "retail_petrol_price": 272.02,
    "levied_volume_bn_litres": 0.776
  },
  {
    "date": "2025-02-01",
    "forecast_crude_price": 80.67,
    "usd_pkr": 278.953,
    "affordability_index": 27.563,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -0.31,
    "current_levy": 70.0,
    "retail_petrol_price": 283.83,
    "levied_volume_bn_litres": 0.767
  },
  {
    "date": "2025-02-16",
    "forecast_crude_price": 80.24,
    "usd_pkr": 279.435,
    "affordability_index": 27.394,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -1.15,
    "current_levy": 70.0,
    "retail_petrol_price": 285.58,
    "levied_volume_bn_litres": 0.779
  },
  {
    "date": "2025-03-01",
    "forecast_crude_price": 73.16,
    "usd_pkr": 279.816,
    "affordability_index": 27.376,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -1.85,
    "current_levy": 70.0,
    "retail_petrol_price": 285.59,
    "levied_volume_bn_litres": 0.789
  },
  {
    "date": "2025-03-16",
    "forecast_crude_price": 76.99,
    "usd_pkr": 279.918,
    "affordability_index": 28.168,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -0.8,
    "current_levy": 70.0,
    "retail_petrol_price": 277.56,
    "levied_volume_bn_litres": 0.774
  },
  {
    "date": "2025-04-01",
    "forecast_crude_price": 69.51,
    "usd_pkr": 280.335,
    "affordability_index": 28.031,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -1.01,
    "current_levy": 70.0,
    "retail_petrol_price": 278.85,
    "levied_volume_bn_litres": 0.777
  },
  {
    "date": "2025-04-16",
    "forecast_crude_price": 65.76,
    "usd_pkr": 280.418,
    "affordability_index": 28.756,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 0.11,
    "current_levy": 70.0,
    "retail_petrol_price": 271.82,
    "levied_volume_bn_litres": 0.761
  },
  {
    "date": "2025-05-01",
    "forecast_crude_price": 65.07,
    "usd_pkr": 280.776,
    "affordability_index": 29.591,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -0.45,
    "current_levy": 70.0,
    "retail_petrol_price": 263.39,
    "levied_volume_bn_litres": 0.769
  },
  {
    "date": "2025-05-16",
    "forecast_crude_price": 64.0,
    "usd_pkr": 281.304,
    "affordability_index": 30.058,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": -0.17,
    "current_levy": 70.0,
    "retail_petrol_price": 259.3,
    "levied_volume_bn_litres": 0.765
  },
  {
    "date": "2025-06-01",
    "forecast_crude_price": 57.72,
    "usd_pkr": 281.9,
    "affordability_index": 30.182,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 1.58,
    "current_levy": 70.0,
    "retail_petrol_price": 257.56,
    "levied_volume_bn_litres": 0.74
  },
  {
    "date": "2025-06-16",
    "forecast_crude_price": 66.66,
    "usd_pkr": 282.644,
    "affordability_index": 31.005,
    "levy_revenue_target_pkr_bn": 53.38,
    "fiscal_gap_pkr_bn": 1.51,
    "current_levy": 70.0,
    "retail_petrol_price": 250.73,
    "levied_volume_bn_litres": 0.741
  },
  {
    "date": "2025-07-01",
    "forecast_crude_price": 66.39,
    "usd_pkr": 283.22,
    "affordability_index": 32.469,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 7.27,
    "current_levy": 70.0,
    "retail_petrol_price": 257.97,
    "levied_volume_bn_litres": 0.77
  },
  {
    "date": "2025-07-16",
    "forecast_crude_price": 70.0,
    "usd_pkr": 283.004,
    "affordability_index": 31.082,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 0.41,
    "current_levy": 77.5,
    "retail_petrol_price": 269.48,
    "levied_volume_bn_litres": 0.784
  },
  {
    "date": "2025-08-01",
    "forecast_crude_price": 68.48,
    "usd_pkr": 281.98,
    "affordability_index": 30.414,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 0.88,
    "current_levy": 77.5,
    "retail_petrol_price": 274.71,
    "levied_volume_bn_litres": 0.778
  },
  {
    "date": "2025-08-16",
    "forecast_crude_price": 62.26,
    "usd_pkr": 281.696,
    "affordability_index": 30.367,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 1.03,
    "current_levy": 77.5,
    "retail_petrol_price": 275.13,
    "levied_volume_bn_litres": 0.776
  },
  {
    "date": "2025-09-01",
    "forecast_crude_price": 66.8,
    "usd_pkr": 281.553,
    "affordability_index": 31.144,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 1.03,
    "current_levy": 77.5,
    "retail_petrol_price": 267.06,
    "levied_volume_bn_litres": 0.776
  },
  {
    "date": "2025-09-16",
    "forecast_crude_price": 71.71,
    "usd_pkr": 281.368,
    "affordability_index": 30.952,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 0.56,
    "current_levy": 77.5,
    "retail_petrol_price": 268.72,
    "levied_volume_bn_litres": 0.782
  },
  {
    "date": "2025-10-01",
    "forecast_crude_price": 70.49,
    "usd_pkr": 281.208,
    "affordability_index": 29.993,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 0.26,
    "current_levy": 77.5,
    "retail_petrol_price": 275.91,
    "levied_volume_bn_litres": 0.786
  },
  {
    "date": "2025-10-16",
    "forecast_crude_price": 73.0,
    "usd_pkr": 280.884,
    "affordability_index": 29.851,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 0.49,
    "current_levy": 77.5,
    "retail_petrol_price": 277.22,
    "levied_volume_bn_litres": 0.783
  },
  {
    "date": "2025-11-01",
    "forecast_crude_price": 65.87,
    "usd_pkr": 280.732,
    "affordability_index": 29.53,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 0.18,
    "current_levy": 77.5,
    "retail_petrol_price": 279.31,
    "levied_volume_bn_litres": 0.787
  },
  {
    "date": "2025-11-16",
    "forecast_crude_price": 62.09,
    "usd_pkr": 280.685,
    "affordability_index": 30.259,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -0.75,
    "current_levy": 77.5,
    "retail_petrol_price": 272.58,
    "levied_volume_bn_litres": 0.799
  },
  {
    "date": "2025-12-01",
    "forecast_crude_price": 62.06,
    "usd_pkr": 280.741,
    "affordability_index": 30.934,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -1.14,
    "current_levy": 77.5,
    "retail_petrol_price": 265.54,
    "levied_volume_bn_litres": 0.804
  },
  {
    "date": "2025-12-16",
    "forecast_crude_price": 61.67,
    "usd_pkr": 280.385,
    "affordability_index": 31.163,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -3.39,
    "current_levy": 77.5,
    "retail_petrol_price": 263.59,
    "levied_volume_bn_litres": 0.833
  },
  {
    "date": "2026-01-01",
    "forecast_crude_price": 64.06,
    "usd_pkr": 280.51,
    "affordability_index": 31.142,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -1.84,
    "current_levy": 77.5,
    "retail_petrol_price": 262.54,
    "levied_volume_bn_litres": 0.813
  },
  {
    "date": "2026-01-16",
    "forecast_crude_price": 61.3,
    "usd_pkr": 280.556,
    "affordability_index": 30.923,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -2.69,
    "current_levy": 77.5,
    "retail_petrol_price": 264.4,
    "levied_volume_bn_litres": 0.824
  },
  {
    "date": "2026-02-01",
    "forecast_crude_price": 61.67,
    "usd_pkr": 280.25,
    "affordability_index": 31.013,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -3.0,
    "current_levy": 77.5,
    "retail_petrol_price": 262.32,
    "levied_volume_bn_litres": 0.828
  },
  {
    "date": "2026-02-16",
    "forecast_crude_price": 63.7,
    "usd_pkr": 280.135,
    "affordability_index": 31.029,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -3.77,
    "current_levy": 77.5,
    "retail_petrol_price": 262.19,
    "levied_volume_bn_litres": 0.838
  },
  {
    "date": "2026-03-01",
    "forecast_crude_price": 69.36,
    "usd_pkr": 279.906,
    "affordability_index": 30.549,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -1.99,
    "current_levy": 77.5,
    "retail_petrol_price": 264.84,
    "levied_volume_bn_litres": 0.815
  },
  {
    "date": "2026-03-16",
    "forecast_crude_price": 68.34,
    "usd_pkr": 279.937,
    "affordability_index": 29.687,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -3.46,
    "current_levy": 77.5,
    "retail_petrol_price": 272.53,
    "levied_volume_bn_litres": 0.834
  },
  {
    "date": "2026-04-01",
    "forecast_crude_price": 67.56,
    "usd_pkr": 280.234,
    "affordability_index": 29.496,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -1.99,
    "current_levy": 77.5,
    "retail_petrol_price": 272.64,
    "levied_volume_bn_litres": 0.815
  },
  {
    "date": "2026-04-16",
    "forecast_crude_price": 73.95,
    "usd_pkr": 280.027,
    "affordability_index": 29.469,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -3.7,
    "current_levy": 77.5,
    "retail_petrol_price": 272.89,
    "levied_volume_bn_litres": 0.837
  },
  {
    "date": "2026-05-01",
    "forecast_crude_price": 82.47,
    "usd_pkr": 280.272,
    "affordability_index": 28.571,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -1.61,
    "current_levy": 77.5,
    "retail_petrol_price": 279.67,
    "levied_volume_bn_litres": 0.81
  },
  {
    "date": "2026-05-16",
    "forecast_crude_price": 89.35,
    "usd_pkr": 280.273,
    "affordability_index": 27.335,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": 0.1,
    "current_levy": 77.5,
    "retail_petrol_price": 292.31,
    "levied_volume_bn_litres": 0.788
  },
  {
    "date": "2026-06-01",
    "forecast_crude_price": 85.39,
    "usd_pkr": 280.322,
    "affordability_index": 26.068,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -0.21,
    "current_levy": 77.5,
    "retail_petrol_price": 304.53,
    "levied_volume_bn_litres": 0.792
  },
  {
    "date": "2026-06-16",
    "forecast_crude_price": 90.92,
    "usd_pkr": 280.582,
    "affordability_index": 26.134,
    "levy_revenue_target_pkr_bn": 61.17,
    "fiscal_gap_pkr_bn": -0.91,
    "current_levy": 77.5,
    "retail_petrol_price": 303.76,
    "levied_volume_bn_litres": 0.801
  },
  {
    "date": "2026-07-01",
    "forecast_crude_price": 91.57,
    "usd_pkr": 280.125,
    "affordability_index": 26.782,
    "levy_revenue_target_pkr_bn": 65.0,
    "fiscal_gap_pkr_bn": 2.77,
    "current_levy": 77.5,
    "retail_petrol_price": 309.24,
    "levied_volume_bn_litres": 0.803
  },
  {
    "date": "2026-07-16",
    "forecast_crude_price": 95.07,
    "usd_pkr": 279.95,
    "affordability_index": 26.029,
    "levy_revenue_target_pkr_bn": 65.0,
    "fiscal_gap_pkr_bn": -1.23,
    "current_levy": 83.0,
    "retail_petrol_price": 318.18,
    "levied_volume_bn_litres": 0.798
  },
  {
    "date": "2026-08-01",
    "forecast_crude_price": 91.23,
    "usd_pkr": 279.921,
    "affordability_index": 25.468,
    "levy_revenue_target_pkr_bn": 65.0,
    "fiscal_gap_pkr_bn": -1.65,
    "current_levy": 83.0,
    "retail_petrol_price": 323.15,
    "levied_volume_bn_litres": 0.803
  },
  {
    "date": "2026-08-16",
    "forecast_crude_price": 100.53,
    "usd_pkr": 280.076,
    "affordability_index": 25.683,
    "levy_revenue_target_pkr_bn": 65.0,
    "fiscal_gap_pkr_bn": -0.74,
    "current_levy": 83.0,
    "retail_petrol_price": 320.45,
    "levied_volume_bn_litres": 0.792
  },
  {
    "date": "2026-09-01",
    "forecast_crude_price": 89.32,
    "usd_pkr": 279.845,
    "affordability_index": 24.813,
    "levy_revenue_target_pkr_bn": 65.0,
    "fiscal_gap_pkr_bn": -0.9,
    "current_levy": 83.0,
    "retail_petrol_price": 329.7,
    "levied_volume_bn_litres": 0.794
  },
  {
    "date": "2026-09-16",
    "forecast_crude_price": 97.94,
    "usd_pkr": 280.195,
    "affordability_index": 25.544,
    "levy_revenue_target_pkr_bn": 65.0,
    "fiscal_gap_pkr_bn": -0.49,
    "current_levy": 83.0,
    "retail_petrol_price": 320.26,
    "levied_volume_bn_litres": 0.789
  },
  {
    "date": "2026-10-01",
    "forecast_crude_price": 86.04,
    "usd_pkr": 280.05,
    "affordability_index": 24.933,
    "levy_revenue_target_pkr_bn": 65.0,
    "fiscal_gap_pkr_bn": -3.06,
    "current_levy": 83.0,
    "retail_petrol_price": 326.18,
    "levied_volume_bn_litres": 0.82
  }
];

// OUTPUT CONFIG: replace null forecast and targetDate with real model output.
// current = historical reference, not a live quote. Do not mix sources without checking dates.
let PREDICTIONS = [
  {
    "label": "USD / PKR",
    "unit": "PKR per US dollar",
    "current": 279.92,
    "date": "2026-10-16",
    "source": "usd_pkr_daily.csv",
    "forecast": null,
    "targetDate": null
  },
  {
    "label": "Petrol price",
    "unit": "PKR per litre",
    "current": 316.3,
    "date": "2026-10-01 to 2026-10-15",
    "source": "petrol_price_buildup_fortnightly.csv",
    "forecast": null,
    "targetDate": null
  },
  {
    "label": "Petroleum levy",
    "unit": "PKR per litre",
    "current": 78,
    "date": "2026-10-01 to 2026-10-15",
    "source": "petrol_price_buildup_fortnightly.csv; excludes carbon levy",
    "forecast": null,
    "targetDate": null
  }
];
