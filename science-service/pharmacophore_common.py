"""Shared RDKit pharmacophore features; positions use Angstrom coordinates."""
from __future__ import annotations
from rdkit import Chem, RDConfig, rdBase
from rdkit.Chem import ChemicalFeatures
import os

FEATURE_FACTORY = ChemicalFeatures.BuildFeatureFactory(os.path.join(RDConfig.RDDataDir, 'BaseFeatures.fdef'))
SUPPORTED = {'Donor', 'Acceptor', 'Hydrophobe', 'LumpedHydrophobe',
             'Aromatic', 'PosIonizable', 'NegIonizable'}


def extract_features(mol: Chem.Mol) -> list[dict]:
    """Return RDKit chemical features from one existing 3D conformer."""
    if not mol.GetNumConformers():
        raise ValueError('Molecule must include 3D coordinates.')
    results = []
    for feat in FEATURE_FACTORY.GetFeaturesForMol(mol):
        if feat.GetFamily() not in SUPPORTED:
            continue
        p = feat.GetPos()
        results.append({'type': feat.GetFamily(), 'x': round(p.x, 3),
                        'y': round(p.y, 3), 'z': round(p.z, 3),
                        'atom_ids': list(feat.GetAtomIds())})
    return results


def evidence(method: str) -> dict:
    """Document the algorithm source, not experimental confirmation."""
    return {'method': method, 'rdkit_version': rdBase.rdkitVersion,
            'status': 'computational prediction',
            'warning': 'Pharmacophore geometry is a hypothesis, not experimental binding evidence.'}
