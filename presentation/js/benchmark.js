// Report v2, section 6.2, main development results table (p. 16).
const SOLAR_BENCHMARK = [
  {
    "id": "fusion",
    "name": "ExtraTrees–TabPFN",
    "values": [
      "0.6668",
      "0.6510",
      "0.8842",
      "0.5234"
    ]
  },
  {
    "id": "dual",
    "name": "TabPFN + dual trees",
    "values": [
      "0.6729",
      "0.6631",
      "0.8882",
      "0.5191"
    ]
  },
  {
    "id": "five",
    "name": "Five-branch ensemble",
    "values": [
      "0.6767",
      "0.6568",
      "0.8899",
      "0.5172"
    ]
  },
  {
    "id": "randomforest",
    "name": "Random Forest (869D)",
    "values": [
      "0.6815",
      "0.7057",
      "0.9254",
      "0.4780"
    ]
  },
  {
    "id": "tabpfn",
    "name": "TabPFN v2",
    "values": [
      "0.6827",
      "0.6698",
      "0.9117",
      "0.4933"
    ]
  },
  {
    "id": "rich",
    "name": "Rich, parent-weighted ExtraTrees",
    "values": [
      "0.6831",
      "0.6720",
      "0.8981",
      "0.5083"
    ]
  },
  {
    "id": "catboost",
    "name": "CatBoost (869D)",
    "values": [
      "0.6931",
      "0.7168",
      "0.9462",
      "0.4542"
    ]
  },
  {
    "id": "solar",
    "name": "SOLAR-H",
    "values": [
      "0.7164",
      "0.7520",
      "1.0016",
      "0.3884"
    ]
  },
  {
    "id": "svr",
    "name": "RBF-SVR (869D)",
    "values": [
      "0.7226",
      "0.6600",
      "0.9125",
      "0.4924"
    ]
  },
  {
    "id": "kernel",
    "name": "Multi-view Kernel Ridge",
    "values": [
      "0.7277",
      "0.7388",
      "0.9501",
      "0.4497"
    ]
  },
  {
    "id": "basic",
    "name": "Basic ExtraTrees (23D)",
    "values": [
      "0.7469",
      "0.7491",
      "0.9730",
      "0.4229"
    ]
  },
  {
    "id": "tabm",
    "name": "TabM (869D)",
    "values": [
      "0.7694",
      "0.7679",
      "1.0104",
      "0.3777"
    ]
  },
  {
    "id": "ridge",
    "name": "Ridge (23D)",
    "values": [
      "0.8746",
      "0.9155",
      "1.2087",
      "0.1094"
    ]
  }
];
const SOLAR_WEIGHT_SENSITIVITY = [{"weight":0.0,"mae":0.6831157471183306},{"weight":0.25,"mae":0.6734181446599703},{"weight":0.5,"mae":0.6707796383662501},{"weight":0.75,"mae":0.6732324967157641},{"weight":1.0,"mae":0.6826560375776811}];
