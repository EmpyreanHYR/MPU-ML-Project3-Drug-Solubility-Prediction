import hashlib
import numpy as np
from src.data import ROOT,load_data,development_splits
from src.features import featurize_pairs,feature_names,canonical
from src.metrics import regression_metrics

def test_frozen_holdout_and_every_fold_are_disjoint():
    df=load_data();dev=df[df.role.eq('development')].reset_index(drop=True);hold=df[df.role.ne('development')]
    assert (len(dev),len(hold))==(1507,397)
    assert not set(dev.parent)&set(hold.parent)
    coverage=np.zeros(len(dev),int)
    for tr,va in development_splits(dev):
        assert not set(dev.iloc[tr].parent)&set(dev.iloc[va].parent)
        coverage[va]+=1
    assert (coverage==1).all()
    for tr,va in development_splits(dev,'pair_group'):
        assert not set(dev.iloc[tr].pair)&set(dev.iloc[va].pair)

def test_molecular_features_are_stable_and_input_only():
    df=load_data().head(5)
    args=[df['Drug SMILES'].tolist(),df['Solvent SMILES'].tolist(),df.Temperature.tolist()]
    for rep,n in [('descriptors',23),('fingerprints',2049),('combined',2071)]:
        x=featurize_pairs(*args,rep)
        assert x.shape==(5,n) and len(feature_names(rep))==n
        assert np.isfinite(x).all()
        np.testing.assert_array_equal(x[:,-1],df.Temperature.to_numpy(dtype=np.float32))
        np.testing.assert_array_equal(x,featurize_pairs(*args,rep))
    assert canonical('OCC')==canonical('CCO')

def test_macro_mae_weights_groups_not_rows():
    y=np.array([0.,0.,0.,0.]);p=np.array([1.,1.,1.,4.]);groups=['a','a','a','b']
    m=regression_metrics(y,p,groups)
    assert m['MAE']==1.75 and m['parent_macro_MAE']==2.5

def test_original_sha_unchanged():
    assert hashlib.sha256((ROOT/'datasets/data_2026.csv').read_bytes()).hexdigest()=='5cf4cecfb556dba5fe10d57ffebe337090cdee07cca6327ec7375cf84c79290d'
