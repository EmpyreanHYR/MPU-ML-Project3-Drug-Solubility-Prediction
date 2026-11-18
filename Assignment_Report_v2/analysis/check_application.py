"""Verify the report's application example through its actual API routes."""
from pathlib import Path
import json
import platform

import numpy as np
import pandas as pd
from fastapi.testclient import TestClient

from webapp.server import MAIN_MODEL, app, get_model

OUT = Path(__file__).with_name("application_check.json")


def checked(response):
    response.raise_for_status()
    return response.json()


def main():
    with TestClient(app) as client:
        catalog = checked(client.get("/api/catalog"))
        drug = next(row for row in catalog["drugs"] if row["name"] == "Lovastatin")
        solvent = next(row for row in catalog["solvents"] if row["name"] == "Acetone")
        query = {"model_id": MAIN_MODEL, "drug_id": drug["id"],
                 "solvent_id": solvent["id"], "temperature": 25.0}

        first = checked(client.post("/api/predict", json=query))
        warm = [checked(client.post("/api/predict", json=query)) for _ in range(5)]
        frame = pd.DataFrame({"Drug SMILES": [drug["smiles"]],
                              "Solvent SMILES": [solvent["smiles"]],
                              "Temperature": [query["temperature"]]})
        model, metadata = get_model(MAIN_MODEL)
        offline = float(np.asarray(model.predict(frame))[0])
        y = first["log_solubility"]
        error = abs(offline - y)
        assert error < 1e-8
        assert abs(sum(x["contributions"][0] for x in first["components"].values()) - y) < 1e-8
        assert all(abs(x["log_solubility"] - y) < 1e-8 for x in warm)

        support = checked(client.get("/api/evidence", params={
            key: query[key] for key in ("drug_id", "solvent_id", "temperature")
        }))
        compare = checked(client.post("/api/compare", json=query | {
            "model_b": "ExtraTrees", "temperature_min": 10.0, "temperature_max": 40.0
        }))
        assert compare["curve_a"]["temperatures"] == compare["curve_b"]["temperatures"]
        assert len(compare["curve_a"]["temperatures"]) == 61
        assert compare["curve_a"]["temperatures"][30] == query["temperature"]
        curve_single_point_difference = abs(compare["curve_a"]["lines"][0]["values"][30] - y)
        assert len(compare["group_errors"]["ids"]) == 128
        good_input = {k: query[k] for k in ("drug_id", "solvent_id", "temperature")}
        batch = checked(client.post("/api/batch", json={
            "model_id": MAIN_MODEL,
            "rows": [good_input, good_input | {"temperature": "invalid"}]
        }))
        assert batch["success_count"] == batch["error_count"] == 1

    warm_seconds = [x["elapsed_ms"] / 1000 for x in warm]
    result = {
        "case": {"drug": drug["name"], "solvent": solvent["name"], "temperature": 25},
        "model": MAIN_MODEL,
        "model_sha256": metadata["model_sha256"],
        "predicted_log10_solubility": y,
        "back_transformed_concentration": first["concentration"],
        "components": first["components"],
        "development_pair_rows": support["support"]["pair_rows"],
        "development_pair_temperature_range": support["range"],
        "offline_api_absolute_difference": error,
        "comparison_companion": "ExtraTrees",
        "curve_single_point_absolute_difference": curve_single_point_difference,
        "comparison_points_per_curve": len(compare["curve_a"]["temperatures"]),
        "comparison_common_oof_parents": len(compare["group_errors"]["ids"]),
        "batch_valid_rows": batch["success_count"],
        "batch_invalid_rows": batch["error_count"],
        "platform": platform.platform(),
        "device": metadata["resolved_component_params"]["TabPFN"]["device"],
        "timing_scope": "API-reported inference time after one untimed warmup, one row per call",
        "warm_inference_seconds": warm_seconds,
        "warm_median_seconds": float(np.median(warm_seconds)),
    }
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(OUT)


if __name__ == "__main__":
    main()
