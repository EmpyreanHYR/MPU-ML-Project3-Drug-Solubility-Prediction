"""Exploratory second-round TabPFN-v2 local-inference pilot only."""
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parents[3]
PROBE = ROOT / "output/combination_v3/tabpfn_probe"
PROBE.mkdir(parents=True, exist_ok=True)
# Set before importing TabPFN; no cloud inference or telemetry is used.
os.environ['TABPFN_DISABLE_TELEMETRY'] = '1'
os.environ['DO_NOT_TRACK'] = '1'
os.environ['HF_HUB_DISABLE_TELEMETRY'] = '1'
os.environ['HF_HUB_OFFLINE'] = '1'
os.environ['TABPFN_MODEL_CACHE_DIR'] = str(ROOT / '.cache/tabpfn')
os.environ.setdefault('OMP_NUM_THREADS', '2')
os.environ.setdefault('OPENBLAS_NUM_THREADS', '2')
os.environ.setdefault('VECLIB_MAXIMUM_THREADS', '2')

import argparse
import gc
import json
import sys
import time
from importlib.metadata import version
sys.path.insert(0, str(ROOT))
import numpy as np
import pandas as pd
import torch
from sklearn.model_selection import GroupKFold
from tabpfn import TabPFNRegressor
from tabpfn.constants import ModelVersion
from src.data import load_data
from src.metrics import regression_metrics
from src.experimental_v3.tree_models import rich_features


def dump(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2)+'\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--representations', nargs='+', default=['small', 'full'])
    parser.add_argument('--estimators', type=int, default=2)
    parser.add_argument('--device', default='mps')
    args = parser.parse_args()
    torch.set_num_threads(2)
    df = load_data()
    df = df[df.role.eq('development')].reset_index(drop=True)
    y = df.Solubility_log10.to_numpy()
    folds = list(GroupKFold(3, shuffle=True, random_state=2026).split(df, y, df.parent))
    ckpt = ROOT/'models/combination_v3/tabpfn_probe/tabpfn-v2-regressor.ckpt'
    params = dict(model_path=str(ckpt), device=args.device,
                  n_estimators=args.estimators, n_preprocessing_jobs=1,
                  random_state=2026, memory_saving_mode='auto')
    protocol = dict(stage='second-round exploratory branch after v3 results; not confirmatory',
                    model='TabPFN-v2 Nature 2025 original public regressor checkpoint',
                    params=params, rows=len(df), parents=df.parent.nunique(),
                    split='GroupKFold(3, shuffle=True, random_state=2026), development parents only',
                    data_source='datasets/data_2026.csv', code_source=str(Path(__file__).relative_to(ROOT)),
                    checkpoint_source=str(ckpt.relative_to(ROOT)),
                    holdout_used=False, telemetry_disabled=True, local_inference_only=True,
                    tabpfn_version=version('tabpfn'), torch_version=torch.__version__,
                    weighting='No sample weighting; native ICL implementation has no sample_weight argument',
                    primary_output='median, targets MAE; mean retained as a prespecified comparison')
    dump(PROBE/'protocol.json', protocol)
    for rep in args.representations:
        dest = PROBE/f'{rep}_n{args.estimators}_{args.device}'
        dest.mkdir(exist_ok=True)
        x = rich_features(df, rep)
        means, medians = np.full(len(df), np.nan), np.full(len(df), np.nan)
        timings = []
        for fold, (tr, va) in enumerate(folds, 1):
            assert not set(df.iloc[tr].parent) & set(df.iloc[va].parent)
            print(f'START {rep} fold={fold} train={len(tr)} val={len(va)} features={x.shape[1]}', flush=True)
            start = time.perf_counter()
            model = TabPFNRegressor.create_default_for_version(ModelVersion.V2, **params)
            model.fit(x[tr], y[tr])
            fit_seconds = time.perf_counter()-start
            start = time.perf_counter()
            output = model.predict(x[va], output_type='main')
            predict_seconds = time.perf_counter()-start
            means[va], medians[va] = output['mean'], output['median']
            result = dict(fold=fold, fit_seconds=fit_seconds, predict_seconds=predict_seconds,
                          mean=regression_metrics(y[va], means[va], df.iloc[va].parent),
                          median=regression_metrics(y[va], medians[va], df.iloc[va].parent))
            dump(dest/f'fold_{fold}.json', result)
            pd.DataFrame(dict(data_row=df.iloc[va].data_row, parent=df.iloc[va].parent_group_id,
                              fold=fold, y=y[va], mean=means[va], median=medians[va])).to_csv(dest/f'fold_{fold}.csv',index=False)
            timings.append(result)
            print(json.dumps(result), flush=True)
            del model, output
            gc.collect()
            if torch.backends.mps.is_available():
                torch.mps.empty_cache()
        summary = dict(representation=rep, features=x.shape[1], params=params,
                       mean=regression_metrics(y, means, df.parent),
                       median=regression_metrics(y, medians, df.parent), folds=timings)
        dump(dest/'summary.json', summary)
        pd.DataFrame(dict(data_row=df.data_row, parent=df.parent_group_id, y=y,
                          mean=means, median=medians)).to_csv(dest/'predictions.csv', index=False)
        print('SUMMARY '+json.dumps(summary), flush=True)


if __name__ == '__main__':
    main()
