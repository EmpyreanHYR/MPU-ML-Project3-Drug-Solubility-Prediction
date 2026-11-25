"""Read the authorized CSV and reuse the frozen row-level partition."""
from pathlib import Path
import hashlib,json
import pandas as pd
from .features import drug_parent,canonical
ROOT=Path(__file__).resolve().parents[1]
SPLITS=ROOT/'datasets/splits'

def load_data():
    p=ROOT/'datasets/data_2026.csv'
    json.loads((SPLITS/'data_policy.json').read_text())
    df=pd.read_csv(p,encoding='latin1',keep_default_na=False)
    df['data_row']=range(1,len(df)+1)
    df['parent']=df['Drug SMILES'].map(drug_parent)
    df['pair']=df['Drug SMILES'].map(canonical)+'|'+df['Solvent SMILES'].map(canonical)
    split=pd.read_csv(SPLITS/'split_manifest.csv')
    df=df.merge(split,on='data_row',validate='one_to_one')
    actual=df.parent.map(lambda x:hashlib.sha256(x.encode()).hexdigest()[:12])
    assert actual.eq(df.parent_group_id).all(), '分组定义与冻结清单不一致'
    assert not set(df.loc[df.role.eq('development'),'parent'])&set(df.loc[df.role.ne('development'),'parent'])
    return df

def development_splits(df,protocol='parent_group_primary'):
    folds=pd.read_csv(SPLITS/'development_folds.csv')
    mapping=folds[folds.protocol.eq(protocol)].set_index('data_row').fold
    assigned=df.data_row.map(mapping)
    assert assigned.notna().all()
    return [(assigned.ne(i).to_numpy().nonzero()[0],assigned.eq(i).to_numpy().nonzero()[0]) for i in sorted(assigned.unique())]
