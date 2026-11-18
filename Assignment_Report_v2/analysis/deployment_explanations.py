"""Reproduce deployment TreeSHAP, local examples and temperature curves.

Run from the project root with the project environment. This script loads the
frozen ensemble, predicts with it and writes artifacts under Assignment_Report_v2.
"""
import hashlib
import json
from pathlib import Path
import sys

REPORT = Path(__file__).resolve().parents[1]
ROOT = REPORT.parent
sys.path.insert(0, str(ROOT))

import joblib
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

from src.data import load_data
from src.experimental_v3.tree_models import DESCRIPTOR_NAMES, rich_features

SEED = 2026
INPUTS = ['Drug SMILES', 'Solvent SMILES', 'Temperature']
MODEL_DIR = 'combination_v3/tabpfn_nested/deployment'
MODEL_ID = 'TabPFN_ExtraTreesBlend'
TREE_ID = 'RichExtraTrees'
PFN_ID = 'TabPFN'
GROUPS = ['Drug', 'Solvent', 'Temperature', 'Interactions']


def load_ensemble():
    path = ROOT / 'models' / MODEL_DIR / f'{MODEL_ID}.joblib'
    source = ROOT / 'output' / MODEL_DIR
    metadata = json.loads((source / f'{MODEL_ID}_metadata.json').read_text())
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != metadata['model_sha256']:
        raise ValueError('The serialized deployment model does not match metadata')
    return joblib.load(path), source, digest


def explain_tree(tree, frame):
    """Apply exactly the saved preprocessing and map retained columns to groups."""
    raw = rich_features(frame[INPUTS], tree.representation)
    processed = tree.selector_.transform(tree.imputer_.transform(raw))
    d = len(DESCRIPTOR_NAMES)
    raw_groups = np.repeat(GROUPS, [d, d, 1, 2 * d])
    active_groups = raw_groups[tree.selector_.get_support()]
    explainer = shap.TreeExplainer(tree.model_, feature_perturbation='tree_path_dependent')
    shap_values = explainer.shap_values(processed)
    base = float(np.asarray(explainer.expected_value).item())
    group_values = pd.DataFrame({
        name: shap_values[:, active_groups == name].sum(axis=1)
        for name in GROUPS
    }, index=frame.index)
    discrepancy = group_values.sum(axis=1).add(base) - tree.predict(frame[INPUTS])
    np.testing.assert_allclose(discrepancy, 0.0, atol=1e-9)
    return group_values, base, discrepancy.abs().max(), processed.shape[1]


def sample_rows(development):
    rng = np.random.default_rng(SEED)
    indices = []
    for _, rows in development.groupby('parent_group_id', sort=True):
        choices = rng.choice(rows.index, size=min(len(rows), 2), replace=False)
        indices.extend(choices)
    return development.loc[indices].sort_values('data_row')


def temperature_curve(development, ensemble):
    ranges = development.groupby('pair').Temperature.agg(['nunique', 'min', 'max'])
    ranges['span'] = ranges['max'] - ranges['min']
    pair_key = ranges.sort_values(
        ['nunique', 'span'], ascending=False, kind='stable'
    ).index[0]
    observations = development.loc[development.pair.eq(pair_key)].sort_values('Temperature')
    representative = observations.iloc[0]
    low, high = ranges.loc[pair_key, ['min', 'max']]
    temperatures = np.linspace(low, high, 61)
    queries = pd.DataFrame({
        'Drug SMILES': representative['Drug SMILES'],
        'Solvent SMILES': representative['Solvent SMILES'],
        'Temperature': temperatures,
    })
    components = ensemble.predict_components(queries)
    curves = pd.DataFrame(components)
    curves.insert(0, 'Temperature', temperatures)
    curves['Fusion'] = sum(ensemble.weights[k] * v for k, v in components.items())
    return observations, curves, representative


def draw(global_importance, observations, curve):
    fig, axes = plt.subplots(1, 2, figsize=(8.4, 3.0), layout='constrained',
                             gridspec_kw={'width_ratios': [0.9, 1.4]})
    feature_order = global_importance.sort_values().index
    ax = axes[0]
    ax.barh(feature_order, global_importance[feature_order], color='#266d85')
    ax.set(xlabel='Mean absolute net attribution (log10)', title='A. Tree feature groups')
    ax.set_axisbelow(True)
    ax.grid(axis='x', color='#dfe5ec', linewidth=0.6)
    ax = axes[1]
    styles = [(TREE_ID, '#286908', '--', 'ExtraTrees'),
              (PFN_ID, '#a9412b', ':', 'TabPFN'),
              ('Fusion', '#193a6b', '-', 'Fusion')]
    for field, color, line, label in styles:
        ax.plot(curve.Temperature, curve[field], linestyle=line, linewidth=1.6,
                color=color, label=label)
    ax.scatter(observations.Temperature, observations.Solubility_log10,
               s=12, color='#414853', alpha=0.75, label='Development observations')
    ax.set(xlabel='Temperature (CSV scale)', ylabel='Log10 solubility',
           title='B. Temperature response')
    ax.legend(frameon=False, fontsize=7, loc='best')
    for axis in axes:
        axis.spines[['top', 'right']].set_visible(False)
        axis.tick_params(labelsize=8)
        axis.xaxis.label.set_size(8)
        axis.yaxis.label.set_size(8)
        axis.title.set_size(10)
    fig.savefig(REPORT / 'figures/deployment_explanations.pdf',
                metadata={'CreationDate': None, 'ModDate': None}, bbox_inches='tight')
    plt.close(fig)


def main():
    data = load_data()
    development = data.loc[data.role.eq('development')].sort_values('data_row')
    if (len(development), development.parent_group_id.nunique()) != (1507, 128):
        raise ValueError('Unexpected frozen development partition')
    ensemble, source, digest = load_ensemble()
    tree = ensemble.models[TREE_ID]
    if tree.representation != 'interaction':
        raise ValueError('Feature group mapping requires the deployment interaction representation')
    saved = pd.read_csv(source / 'component_serialization_example.csv').set_index('data_row')
    corrections = ensemble.weights[PFN_ID] * (saved[PFN_ID] - saved[TREE_ID])
    example_rows = [int(corrections.idxmin()), int(corrections.idxmax())]
    examples = development.set_index('data_row', drop=False).loc[example_rows]
    sample = sample_rows(development)
    matrix_rows = pd.concat([sample, examples]).drop_duplicates('data_row').set_index('data_row')
    group_values, base, discrepancy, n_features = explain_tree(tree, matrix_rows)
    sample_values = group_values.loc[sample.data_row].abs()
    global_importance = sample_values.groupby(sample.set_index('data_row').parent_group_id).mean().mean()
    deployment_predictions = ensemble.predict_components(examples[INPUTS])
    for branch in (TREE_ID, PFN_ID):
        np.testing.assert_allclose(deployment_predictions[branch],
                                   saved.loc[example_rows, branch], rtol=1e-6, atol=1e-6)
    cases = []
    for i, (row_id, row) in enumerate(examples.iterrows()):
        tree_value = float(deployment_predictions[TREE_ID][i])
        pfn_value = float(deployment_predictions[PFN_ID][i])
        correction = ensemble.weights[PFN_ID] * (pfn_value - tree_value)
        cases.append(dict(data_row=row_id, drug=row.Drug, solvent=row.Solvent,
                          temperature=float(row.Temperature), observed=float(row.Solubility_log10),
                          tree=tree_value, pfn=pfn_value, fusion=tree_value + correction,
                          correction=correction, group_shap=group_values.loc[row_id].to_dict()))
    observations, curve, representative = temperature_curve(development, ensemble)
    summary = {
        'model_sha256': digest,
        'feature_perturbation': 'tree_path_dependent',
        'shap_version': shap.__version__,
        'sampling_seed': SEED,
        'sample_rows': len(sample),
        'sample_parents': sample.parent_group_id.nunique(),
        'tree_input_features': n_features,
        'tree_baseline': base,
        'max_abs_additivity_error': discrepancy,
        'mean_abs_group_attribution': global_importance.to_dict(),
        'examples': cases,
        'curve': {
            'drug': representative.Drug,
            'solvent': representative.Solvent,
            'observations': len(observations),
            'unique_temperatures': observations.Temperature.nunique(),
            'temperature_bounds': [float(curve.Temperature.min()), float(curve.Temperature.max())],
            'endpoints': {k: curve[k].iloc[[0, -1]].tolist() for k in (TREE_ID, PFN_ID, 'Fusion')},
        },
    }
    (REPORT / 'analysis/deployment_explanations.json').write_text(
        json.dumps(summary, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    draw(global_importance, observations, curve)


if __name__ == '__main__':
    main()
