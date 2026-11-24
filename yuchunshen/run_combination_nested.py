"""Frozen-development 5x3 grouped search and inner-OOF convex model combinations.

No historical test is evaluated. No original model, app or report is written.
Families may run in independent processes; collection happens after all finish.
"""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import argparse
import hashlib
import itertools
import json
import os
import time
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "2")
os.environ.setdefault("MKL_NUM_THREADS", "2")
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupKFold
from src.data import ROOT, load_data, development_splits
from src.paths import model_path, normalize_frozen
from src.metrics import regression_metrics
from src.experimental_v3.tree_models import RichTreeRegressor, pilot_candidates
from src.experimental_v3.kernel_models import MultiViewKernelRegressor
from src.experimental_v3.ensemble import FrameTabMRegressor, FittedConvexEnsemble

OUT = ROOT / "output/combination_v3"
FAMILIES = ["RichExtraTrees", "RichCatBoost", "MultiViewKernel", "TabM"]
SEEDS = [2026, 17, 42]


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, default=lambda v: v.item() if isinstance(v, np.generic) else str(v)) + "\n")


def development():
    frame = load_data()
    return frame.loc[frame.role.eq("development")].reset_index(drop=True)


def catalog():
    trees = pilot_candidates()
    return {
        "RichExtraTrees":[c for c in trees if c["family"] == "extra"],
        "RichCatBoost":[c for c in trees if c["family"] == "catboost"],
        "MultiViewKernel":[
            {"features":"full", "gamma":1., "alpha":.03},
            {"features":"full", "gamma":1., "alpha":.3},
            {"features":"full", "gamma":.3, "alpha":.03},
            {"features":"full", "gamma":3., "alpha":.03},
            {"features":"basic", "gamma":1., "alpha":3.},
            {"estimator":"svr", "gamma":1., "C":1.},
            {"estimator":"svr", "gamma":1., "C":10.},
            {"kernel":"mixed", "alpha":.03},
            {"kernel":"mixed", "alpha":.3},
            {"kernel":"tanimoto", "alpha":.3},
        ],
        "TabM":[{"d_block":64}, {"d_block":128}],
    }


def make(name, params, seed):
    if name in ("RichExtraTrees", "RichCatBoost"):
        return RichTreeRegressor(seed=seed, **params)
    if name == "MultiViewKernel":
        return MultiViewKernelRegressor(**params)
    if name == "TabM":
        return FrameTabMRegressor(seed=seed, **params)
    raise ValueError(name)


def freeze():
    df = development()
    sources = list((ROOT/"src/experimental_v3").glob("*.py")) + [Path(__file__)]
    hashes = {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sources}
    protocol = {
        "stage":"exploratory follow-up after inspecting prior development results and 3-fold pilots",
        "outer":"original frozen development parent 5-fold",
        "inner":"GroupKFold(3, shuffle=True, random_state=2026)",
        "rows":len(df), "groups":df.parent.nunique(), "seeds":SEEDS,
        "primary":"MultiViewBlend; mean of seed-specific pooled outer OOF parent_macro_MAE",
        "blend":"nonnegative sum-to-one weights, step 0.25; all parameter and weight choices within outer training set",
        "kernel_seeds":"deterministic; reuse prediction for seeds 17 and 42, not three independent runs",
        "historical_holdout":"not evaluated or used for selection in this experiment",
        "temperature":"CSV original numeric scale; no Kelvin assumption or inverse temperature",
        "catalog":catalog(), "code_sha256":hashes,
    }
    p = OUT/"protocol.json"
    if p.exists():
        assert normalize_frozen(json.loads(p.read_text())) == protocol, "Frozen code/protocol changed; use a new experiment version"
    else:
        dump(p, protocol)
    print("PROTOCOL FROZEN", flush=True)


def tune(name, df, dest):
    dest.mkdir(parents=True, exist_ok=True)
    y = df.Solubility_log10.to_numpy()
    folds = list(GroupKFold(3, shuffle=True, random_state=2026).split(df, y, df.parent))
    records = []
    for cid, params in enumerate(catalog()[name]):
        path = dest/f"candidate_{cid:02}.json"
        predpath = dest/f"predictions_{cid:02}.csv"
        if path.exists():
            record = json.loads(path.read_text())
            assert record["params"] == params
            assert predpath.exists()
        else:
            pred = np.full(len(df), np.nan)
            assigned = np.full(len(df), -1)
            start = time.perf_counter()
            for fold, (tr, va) in enumerate(folds, 1):
                assert not set(df.iloc[tr].parent) & set(df.iloc[va].parent)
                m = make(name, params, 2026).fit(df.iloc[tr], y[tr], groups=df.iloc[tr].parent.to_numpy())
                pred[va] = m.predict(df.iloc[va])
                assigned[va] = fold
            assert np.isfinite(pred).all()
            record = {"params":params, "candidate":cid, "seconds":time.perf_counter()-start,
                      **regression_metrics(y, pred, df.parent)}
            pd.DataFrame({"data_row":df.data_row, "parent_id":df.parent_group_id, "inner_fold":assigned,
                          "y":y, "prediction":pred}).to_csv(predpath, index=False)
            dump(path, record)
        records.append(record)
    best = min(records, key=lambda r:r["parent_macro_MAE"])
    dump(dest/"selected.json", best)
    return best["params"], pd.read_csv(dest/f"predictions_{best['candidate']:02}.csv")


def nested_family(name):
    freeze()
    df = development()
    y = df.Solubility_log10.to_numpy()
    folder = OUT/"nested"/name
    for fold, (tr, va) in enumerate(development_splits(df), 1):
        assert not set(df.iloc[tr].parent) & set(df.iloc[va].parent)
        dest = folder/f"fold_{fold}"
        params, _ = tune(name, df.iloc[tr].reset_index(drop=True), dest/"search")
        deterministic = None
        for seed in SEEDS:
            path = dest/f"predictions_{seed}.csv"
            if path.exists():
                if name == "MultiViewKernel":
                    deterministic = pd.read_csv(path).prediction.to_numpy()
                continue
            start = time.perf_counter()
            if deterministic is None:
                model = make(name, params, seed).fit(df.iloc[tr], y[tr], groups=df.iloc[tr].parent.to_numpy())
                pred = model.predict(df.iloc[va])
                if name == "MultiViewKernel":
                    deterministic = pred
            else:
                pred = deterministic.copy()
            assert np.isfinite(pred).all()
            pd.DataFrame({"data_row":df.iloc[va].data_row, "parent_id":df.iloc[va].parent_group_id,
                          "fold":fold, "seed":seed, "y":y[va], "prediction":pred}).to_csv(path, index=False)
            dump(dest/f"metrics_{seed}.json", {"params":params,"seconds":time.perf_counter()-start,
                                               **regression_metrics(y[va], pred, df.iloc[va].parent)})
            print(f"NESTED {name} fold={fold} seed={seed} parent_MAE={regression_metrics(y[va],pred,df.iloc[va].parent)['parent_macro_MAE']:.5f}", flush=True)
    print("FAMILY COMPLETE", name, flush=True)


def simplex(n, steps=4):
    return [np.array(w, float)/steps for w in itertools.product(range(steps+1), repeat=n) if sum(w) == steps]


def choose_weights(predictions, y, groups):
    # Parent weights turn pooled absolute errors into parent-macro MAE.
    _, inv, counts = np.unique(groups, return_inverse=True, return_counts=True)
    w = 1/counts[inv]
    grid = simplex(predictions.shape[1])
    scored = [(float(np.average(np.abs(y-predictions@z), weights=w)), z) for z in grid]
    # Prefer a distributed blend on exactly tied objective values.
    return min(scored, key=lambda item:(round(item[0],12), float(np.sum(item[1]**2))))


def variants():
    result = {}
    for n in range(2, len(FAMILIES)+1):
        for subset in itertools.combinations(FAMILIES, n):
            name = "MultiViewBlend" if n == len(FAMILIES) else "Blend_"+"_".join(subset)
            result[name] = list(subset)
    return result


def blend():
    freeze()
    df = development()
    for fold, (tr, va) in enumerate(development_splits(df), 1):
        expected = df.iloc[tr].data_row.to_numpy()
        inner = []
        for name in FAMILIES:
            search = OUT/"nested"/name/f"fold_{fold}"/"search"
            selected = json.loads((search/"selected.json").read_text())
            p = pd.read_csv(search/f"predictions_{selected['candidate']:02}.csv")
            assert np.array_equal(p.data_row, expected)
            inner.append(p.prediction.to_numpy())
        matrix = np.column_stack(inner)
        for vname, subset in variants().items():
            ids = [FAMILIES.index(n) for n in subset]
            score, weights = choose_weights(matrix[:,ids], df.iloc[tr].Solubility_log10.to_numpy(), df.iloc[tr].parent.to_numpy())
            directory = OUT/"nested"/vname/f"fold_{fold}"
            dump(directory/"weights.json", {"families":subset, "weights":dict(zip(subset, weights.tolist())),
                                             "inner_parent_macro_MAE":score,"selection_rows":len(tr),
                                             "outer_validation_used":False})
            for seed in SEEDS:
                predictions = []
                for name in subset:
                    p = pd.read_csv(OUT/"nested"/name/f"fold_{fold}"/f"predictions_{seed}.csv")
                    assert np.array_equal(p.data_row, df.iloc[va].data_row)
                    predictions.append(p.prediction.to_numpy())
                pred = np.column_stack(predictions)@weights
                pd.DataFrame({"data_row":df.iloc[va].data_row, "parent_id":df.iloc[va].parent_group_id,
                              "fold":fold, "seed":seed, "y":df.iloc[va].Solubility_log10,
                              "prediction":pred}).to_csv(directory/f"predictions_{seed}.csv", index=False)
    print("BLENDS COMPLETE", flush=True)


def collect():
    rows = []
    for folder in sorted((OUT/"nested").iterdir()):
        paths = sorted(folder.glob("fold_*/predictions_*.csv"))
        if len(paths) != 15:
            continue
        p = pd.concat([pd.read_csv(f) for f in paths], ignore_index=True)
        p.to_csv(folder/"predictions.csv", index=False)
        seed_metrics = [{"seed":int(seed), **regression_metrics(g.y, g.prediction, g.parent_id)} for seed, g in p.groupby("seed")]
        summary = {"model":folder.name, **{key:float(np.mean([s[key] for s in seed_metrics]))
                   for key in ["MAE","RMSE","R2","parent_macro_MAE"]}, "seed_metrics":seed_metrics}
        dump(folder/"summary.json",summary)
        rows.append({k:v for k,v in summary.items() if k != "seed_metrics"})
    for old in ["AdaptiveHybrid", "ExtraTrees"]:
        previous = json.loads((ROOT/"output/revision_v2/nested"/old/"summary.json").read_text())
        rows.append({"model":"Original_"+old, **{k:previous[k] for k in ["MAE","RMSE","R2","parent_macro_MAE"]}})
    table = pd.DataFrame(rows).sort_values("parent_macro_MAE")
    table.to_csv(OUT/"comparison.csv",index=False)
    print(table.to_string(index=False),flush=True)


def deploy():
    """Full-development fitted research artifact; no app replacement and no holdout score."""
    freeze()
    df = development()
    inner = []
    params = {}
    for name in FAMILIES:
        params[name], pred = tune(name, df, OUT/"full_development_search"/name)
        assert np.array_equal(pred.data_row, df.data_row)
        inner.append(pred.prediction.to_numpy())
    score, selected = choose_weights(np.column_stack(inner), df.Solubility_log10.to_numpy(), df.parent.to_numpy())
    weights = dict(zip(FAMILIES, selected.tolist()))
    dump(OUT/"deployment"/"selection_frozen.json", {"params":params,"weights":weights,"inner_parent_macro_MAE":score})
    models = {name:make(name, params[name],2026).fit(df,df.Solubility_log10,groups=df.parent.to_numpy()) for name in FAMILIES if weights[name] > 0}
    ensemble = FittedConvexEnsemble(models,weights,{"fit_role":"development only","seed":2026,"report_modified":False})
    path = model_path(OUT/"deployment/model.joblib", create=True)
    joblib.dump(ensemble,path,compress=3)
    sample = df.iloc[:20].drop(columns=["Solubility_log10"])
    # Parallel tree reductions can differ in the last bit after a reload.
    np.testing.assert_allclose(ensemble.predict(sample),joblib.load(path).predict(sample),rtol=1e-12,atol=1e-12)
    pd.DataFrame({"data_row":sample.data_row,"prediction":ensemble.predict(sample)}).to_csv(OUT/"deployment/serialization_example.csv",index=False)
    dump(OUT/"deployment/metadata.json",{"model":"MultiViewBlend","seed":2026,"training_rows":len(df),
         "training_groups":df.parent.nunique(),"weights":weights,"params":params,
         "historical_test_evaluated":False,"sha256":hashlib.sha256(path.read_bytes()).hexdigest()})
    print("RESEARCH MODEL SAVED",weights,flush=True)


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("stage",choices=["freeze","nested","blend","collect","deploy"])
    parser.add_argument("--family",choices=FAMILIES)
    args=parser.parse_args()
    if args.stage == "nested":
        if not args.family:
            parser.error("nested requires --family")
        nested_family(args.family)
    else:
        globals()[args.stage]()
