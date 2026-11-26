"""Use a saved research model without changing the existing demo app."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import argparse
import json
import joblib
import pandas as pd
from src.data import ROOT
from src.paths import model_path


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--drug-smiles',required=True)
    parser.add_argument('--solvent-smiles',required=True)
    parser.add_argument('--temperature',required=True,type=float)
    tabpfn_model=model_path(ROOT/'output/combination_v3/tabpfn_nested/deployment/TabPFN_ExtraTreesBlend.joblib')
    default_model=tabpfn_model if tabpfn_model.exists() else model_path(ROOT/'output/combination_v3/deployment/two_tree_model.joblib')
    parser.add_argument('--model',type=Path,default=default_model)
    args=parser.parse_args()
    frame=pd.DataFrame({'Drug SMILES':[args.drug_smiles], 'Solvent SMILES':[args.solvent_smiles], 'Temperature':[args.temperature]})
    model=joblib.load(args.model)
    print(json.dumps({'model':str(args.model.resolve()),'prediction_log10':float(model.predict(frame)[0])},ensure_ascii=False))


if __name__=='__main__':
    main()
