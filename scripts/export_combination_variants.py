"""Save the two-tree exploratory candidate with weights chosen on development OOF."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
sys.path.insert(0,str(Path(__file__).resolve().parent))
import hashlib
import json
import joblib
import numpy as np
import pandas as pd
from run_combination_nested import OUT, development, make, choose_weights, dump
from src.experimental_v3.ensemble import FittedConvexEnsemble


def main():
    df=development()
    families=["RichExtraTrees","RichCatBoost"]
    selected=json.loads((OUT/"deployment/selection_frozen.json").read_text())["params"]
    predictions=[]
    for name in families:
        search=OUT/"full_development_search"/name
        choice=json.loads((search/"selected.json").read_text())
        p=pd.read_csv(search/f"predictions_{choice['candidate']:02}.csv")
        assert np.array_equal(p.data_row,df.data_row)
        predictions.append(p.prediction.to_numpy())
    score,w=choose_weights(np.column_stack(predictions),df.Solubility_log10.to_numpy(),df.parent.to_numpy())
    weights=dict(zip(families,w.tolist()))
    models={name:make(name,selected[name],2026).fit(df,df.Solubility_log10,groups=df.parent.to_numpy())
            for name in families if weights[name]>0}
    ensemble=FittedConvexEnsemble(models,weights,{"candidate":"two trees; exploratory subset"})
    path=OUT/"deployment/two_tree_model.joblib"
    joblib.dump(ensemble,path,compress=3)
    sample=df.iloc[:20].drop(columns=["Solubility_log10"])
    first=ensemble.predict(sample)
    second=joblib.load(path).predict(sample)
    np.testing.assert_allclose(first,second,rtol=1e-12,atol=1e-12)
    dump(OUT/"deployment/two_tree_metadata.json",{
        "model":"Blend_RichExtraTrees_RichCatBoost", "stage":"exploratory subset candidate",
        "seed":2026, "training_rows":len(df), "params":{name:selected[name] for name in families},
        "weights":weights,"inner_parent_macro_MAE":score,"historical_test_evaluated":False,
        "serialization_max_abs_difference":float(np.max(np.abs(first-second))),
        "sha256":hashlib.sha256(path.read_bytes()).hexdigest(),
    })
    print("TWO TREE RESEARCH MODEL SAVED",weights)


if __name__=="__main__":
    main()
