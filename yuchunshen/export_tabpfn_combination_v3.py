"""Export two second-round research ensembles without changing the application.

Built with PriorLabs-TabPFN. The public v2 checkpoint and its license are retained
in models/combination_v3/tabpfn_probe/. No historical holdout is scored.
"""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import hashlib
import json
import shutil
import time
from importlib.metadata import version
import joblib
import numpy as np
import pandas as pd
from run_tabpfn_combination_v3 import OUT, FIRST, development, freeze, tune, CATALOG
from run_combination_nested import choose_weights, make
from src.data import ROOT
from src.paths import model_path
from src.experimental_tabpfn_v3.adapter import FrameTabPFNRegressor, CHECKPOINT_SHA256, DEFAULT_CHECKPOINT
from src.experimental_v3.ensemble import FittedConvexEnsemble

DEST=OUT/'deployment'
VARIANTS={
    'TabPFN_TwoTreeBlend':['TabPFN','RichExtraTrees','RichCatBoost'],
    'TabPFN_ExtraTreesBlend':['TabPFN','RichExtraTrees'],
}


def dump(path,value):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(value,ensure_ascii=False,indent=2,
                              default=lambda v:v.item() if isinstance(v,np.generic) else str(v))+'\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    freeze()
    df=development();y=df.Solubility_log10.to_numpy();params={};inner={};inputs={}
    for family in ['RichExtraTrees','RichCatBoost','MultiViewKernel','TabM']:
        search=FIRST/'full_development_search'/family
        selected_path=search/'selected.json';selected=json.loads(selected_path.read_text())
        pp=search/f"predictions_{selected['candidate']:02}.csv"
        pred=pd.read_csv(pp)
        assert np.array_equal(pred.data_row,df.data_row)
        np.testing.assert_allclose(pred.y,y,rtol=1e-12,atol=1e-12)
        assert np.isfinite(pred.prediction).all()
        params[family]=selected['params'];inner[family]=pred.prediction.to_numpy()
        inputs[str(selected_path.relative_to(ROOT))]=sha(selected_path)
        inputs[str(pp.relative_to(ROOT))]=sha(pp)
    protocol=dict(stage='Full-development research artifact after second exploratory round; no app replacement',
                  primary='TabPFN_TwoTreeBlend',exploratory_best='TabPFN_ExtraTreesBlend',
                  fit_role='development only',rows=len(df),groups=df.parent.nunique(),seed=2026,
                  tabpfn_catalog=CATALOG,variants=VARIANTS,
                  selection='3-fold development parent GroupKFold, seed2026; nonnegative simplex step.25 parent macro MAE',
                  prediction='mean',checkpoint_sha256=CHECKPOINT_SHA256,
                  nested_protocol_sha256=sha(OUT/'protocol.json'),
                  source_sha256=sha(ROOT/'datasets/data_2026.csv'),
                  export_code_sha256=sha(Path(__file__)),reused_full_development_inputs=inputs,
                  dependencies={n:version(n) for n in ['tabpfn','torch','scikit-learn','numpy','pandas','rdkit','joblib']},
                  historical_holdout_evaluated=False,report_modified=False,app_replaced=False,
                  attribution='Built with PriorLabs-TabPFN')
    protocol_path=DEST/'export_protocol.json'
    if protocol_path.exists():
        assert normalize_frozen(json.loads(protocol_path.read_text()))==protocol,'Export source or frozen search inputs changed'
    else:dump(protocol_path,protocol)
    print('EXPORT PROTOCOL FROZEN',flush=True)
    params['TabPFN'],pred=tune(df,OUT/'full_development_search/TabPFN')
    assert np.array_equal(pred.data_row,df.data_row)
    inner['TabPFN']=pred.prediction.to_numpy()
    selections={}
    for vname,subset in VARIANTS.items():
        score,weights=choose_weights(np.column_stack([inner[n] for n in subset]),y,df.parent.to_numpy())
        selections[vname]=dict(families=subset,weights=dict(zip(subset,weights.tolist())),
                               inner_parent_macro_MAE=score,
                               params={n:params[n] for n in subset},outer_validation_used=False)
    dump(DEST/'selection_frozen.json',dict(all_base_params=params,ensembles=selections,
                                         fit_seed=2026,historical_holdout_evaluated=False))
    print('FULL-DEVELOPMENT SELECTIONS '+json.dumps(selections),flush=True)
    needed=sorted({n for record in selections.values() for n,w in record['weights'].items() if w>0})
    models={};fit_seconds={}
    for name in needed:
        start=time.perf_counter()
        model=FrameTabPFNRegressor(seed=2026,**params[name]) if name=='TabPFN' else make(name,params[name],2026)
        models[name]=model.fit(df,y,groups=df.parent.to_numpy())
        fit_seconds[name]=time.perf_counter()-start
        print(f'COMPONENT FIT {name} seconds={fit_seconds[name]:.3f}',flush=True)
    sample=df.iloc[:20].drop(columns=['Solubility_log10'])
    component_predictions={name:model.predict(sample) for name,model in models.items()}
    pd.DataFrame(dict(data_row=sample.data_row,**component_predictions)).to_csv(DEST/'component_serialization_example.csv',index=False)
    shutil.copyfile(FIRST/'tabpfn_probe/LICENSE.txt',DEST/'TabPFN-LICENSE.txt')
    validations={}
    for vname,selection in selections.items():
        weights=selection['weights']
        ensemble=FittedConvexEnsemble({n:models[n] for n in selection['families'] if weights[n]>0},weights,
                                     dict(model=vname,fit_role='development only',seed=2026,
                                          stage='second-round exploratory research artifact',report_modified=False,
                                          attribution='Built with PriorLabs-TabPFN'))
        path=model_path(DEST/f'{vname}.joblib', create=True)
        joblib.dump(ensemble,path,compress=3)
        # Algebraically identical to the fitted ensemble's predict; reuse original
        # component outputs to avoid repeating expensive local ICL inference.
        expected=sum(w*component_predictions[n] for n,w in weights.items() if w>0)
        restored=joblib.load(path)
        actual=restored.predict(sample)
        np.testing.assert_allclose(actual,expected,rtol=1e-6,atol=1e-6)
        tree_differences={}
        for name,model in restored.models.items():
            if name!='TabPFN':
                restored_component=model.predict(sample)
                np.testing.assert_allclose(restored_component,component_predictions[name],rtol=1e-12,atol=1e-12)
                tree_differences[name]=float(np.max(np.abs(restored_component-component_predictions[name])))
        check=dict(rows=len(sample),target_column_removed=True,
                   maximum_absolute_difference=float(np.max(np.abs(actual-expected))),
                   ensemble_rtol=1e-6,ensemble_atol=1e-6,tree_rtol=1e-12,tree_atol=1e-12,
                   tree_maximum_absolute_differences=tree_differences,status='PASS')
        validations[vname]=check
        pd.DataFrame(dict(data_row=sample.data_row,original_prediction=expected,reloaded_prediction=actual)).to_csv(DEST/f'{vname}_serialization_example.csv',index=False)
        metadata=dict(model=vname,training_rows=len(df),training_groups=df.parent.nunique(),seed=2026,
                      params=selection['params'],weights=weights,
                      inner_parent_macro_MAE=selection['inner_parent_macro_MAE'],
                      retained_components=list(ensemble.models),fit_seconds={n:fit_seconds[n] for n in ensemble.models},
                      model_sha256=sha(path),serialization_check=check,
                      checkpoint=dict(path=str(DEFAULT_CHECKPOINT.relative_to(ROOT)),sha256=CHECKPOINT_SHA256,
                                      embedded_in_joblib=False),
                      deployment='research only; application and report are unchanged',
                      primary=vname=='TabPFN_TwoTreeBlend',exploratory=True,
                      historical_holdout_evaluated=False,export_protocol_sha256=sha(protocol_path),
                      attribution='Built with PriorLabs-TabPFN',license='TabPFN-LICENSE.txt')
        dump(DEST/f'{vname}_metadata.json',metadata)
        for model in restored.models.values():
            if hasattr(model,'release'):model.release()
        print(f'EXPORTED {vname} sha256={metadata["model_sha256"]} maxdiff={check["maximum_absolute_difference"]}',flush=True)
    dump(DEST/'serialization_checks.json',validations)
    for name,model in models.items():
        if hasattr(model,'release'):model.release()
    print('BOTH RESEARCH MODELS EXPORTED',flush=True)


if __name__=='__main__':
    main()
