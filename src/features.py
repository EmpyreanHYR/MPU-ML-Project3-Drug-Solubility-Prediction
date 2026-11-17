"""Pure deterministic chemistry features. No target or fitted preprocessing."""
from functools import lru_cache
import numpy as np
from rdkit import Chem
from rdkit.Chem import Descriptors, rdFingerprintGenerator
from rdkit.Chem.MolStandardize import rdMolStandardize

DESCRIPTORS = {
    'MolWt': Descriptors.MolWt, 'MolLogP': Descriptors.MolLogP, 'TPSA': Descriptors.TPSA,
    'HBD': Descriptors.NumHDonors, 'HBA': Descriptors.NumHAcceptors,
    'RotatableBonds': Descriptors.NumRotatableBonds, 'RingCount': Descriptors.RingCount,
    'AromaticRings': Descriptors.NumAromaticRings, 'HeavyAtomCount': Descriptors.HeavyAtomCount,
    'FractionCSP3': Descriptors.FractionCSP3, 'FormalCharge': Chem.GetFormalCharge,
}
FP = rdFingerprintGenerator.GetMorganGenerator(radius=2, fpSize=1024, includeChirality=True)

@lru_cache(maxsize=8192)
def molecule(smiles):
    mol=Chem.MolFromSmiles(str(smiles))
    if mol is None: raise ValueError('SMILES无法解析')
    return mol

def canonical(smiles):
    return Chem.MolToSmiles(molecule(smiles))

@lru_cache(maxsize=8192)
def drug_parent(smiles):
    mol=rdMolStandardize.ChargeParent(molecule(smiles))
    Chem.RemoveStereochemistry(mol)
    return Chem.MolToSmiles(mol)

@lru_cache(maxsize=8192)
def _describe(smiles):
    return np.array([f(molecule(smiles)) for f in DESCRIPTORS.values()],dtype=np.float32)

@lru_cache(maxsize=8192)
def _fingerprint(smiles):
    return FP.GetFingerprintAsNumPy(molecule(smiles)).astype(np.float32)

def feature_names(representation='descriptors'):
    names=[]
    if representation in ('descriptors','combined'):
        names += [f'{side}_{d}' for side in ['drug','solvent'] for d in DESCRIPTORS]
    if representation in ('fingerprints','combined'):
        names += [f'{side}_Morgan_{i}' for side in ['drug','solvent'] for i in range(1024)]
    if representation not in ('descriptors','fingerprints','combined'):raise ValueError(representation)
    return names+['Temperature']

def featurize_pairs(drug_smiles,solvent_smiles,temperatures,representation='descriptors'):
    if not len(drug_smiles)==len(solvent_smiles)==len(temperatures):raise ValueError('输入长度不一致')
    feature_names(representation)
    rows=[]
    for drug,solvent,temp in zip(drug_smiles,solvent_smiles,temperatures):
        blocks=[]
        if representation in ('descriptors','combined'):blocks += [_describe(drug),_describe(solvent)]
        if representation in ('fingerprints','combined'):blocks += [_fingerprint(drug),_fingerprint(solvent)]
        rows.append(np.concatenate(blocks+[np.array([float(temp)],dtype=np.float32)]))
    x=np.array(rows,dtype=np.float32).reshape(-1,len(feature_names(representation)))
    if not np.isfinite(x).all():raise ValueError('输入或特征包含非有限数值')
    return x
