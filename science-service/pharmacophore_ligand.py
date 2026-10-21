"""Ligand-based 3D consensus pharmacophores for congeneric molecules."""
from __future__ import annotations
from itertools import combinations
from math import dist
from rdkit import Chem
from rdkit.Chem import AllChem, rdFMCS, rdMolAlign
from pharmacophore_common import extract_features, evidence


def _prepare(smiles: str, seed: int) -> Chem.Mol:
    """Sanitize and deterministically embed one ligand before alignment."""
    if not smiles or len(smiles) > 3000:
        raise ValueError('Each ligand SMILES must contain 1–3000 characters.')
    mol = Chem.MolFromSmiles(smiles)
    if mol is None or mol.GetNumHeavyAtoms() > 120:
        raise ValueError('Invalid ligand or more than 120 heavy atoms.')
    mol = Chem.AddHs(mol)
    code = AllChem.EmbedMolecule(mol, randomSeed=seed, maxAttempts=50)
    if code != 0:
        raise ValueError('3D embedding failed; no pharmacophore model generated.')
    if AllChem.MMFFHasAllMoleculeParams(mol):
        AllChem.MMFFOptimizeMolecule(mol, maxIters=200)
    return mol


def ligand_consensus(smiles: list[str], radius: float = 1.5,
                     support: float = 0.67, seed: int = 2026) -> dict:
    """Align a shared substructure then cluster features across ligands.

    Only congeneric ligands sharing a meaningful scaffold are supported; one
    alignment and conformer is insufficient for general LBDD model validation.
    """
    if not 2 <= len(smiles) <= 12:
        raise ValueError('Supply 2–12 ligand SMILES strings.')
    if not 0.5 <= radius <= 3.0 or not 0.5 <= support <= 1:
        raise ValueError('Radius must be 0.5–3.0 Å and support 0.5–1.0.')
    ligands = [_prepare(s, seed + i) for i, s in enumerate(smiles)]
    scaffolds = [Chem.RemoveHs(m) for m in ligands]
    match = rdFMCS.FindMCS(scaffolds, timeout=8, ringMatchesRingOnly=True,
                          completeRingsOnly=True, matchChiralTag=True)
    if match.canceled or match.numAtoms < 3:
        raise ValueError('No reliable shared scaffold; cannot produce meaningful aligned consensus.')
    query = Chem.MolFromSmarts(match.smartsString)
    if query is None:
        raise ValueError('Failed to read shared scaffold.')
    reference = scaffolds[0].GetSubstructMatch(query)
    if not reference:
        raise ValueError('No reference scaffold match.')
    rmsds = [0.0]
    for idx in range(1, len(ligands)):
        target = scaffolds[idx].GetSubstructMatch(query)
        if not target or len(target) != len(reference):
            raise ValueError('Ligand scaffold atom mapping is inconsistent.')
        atom_map = list(zip(target, reference))
        rmsds.append(round(rdMolAlign.AlignMol(ligands[idx], ligands[0], atomMap=atom_map), 3))
    features = [extract_features(m) for m in ligands]
    candidates = []
    for lig_idx, feats in enumerate(features):
        for feat in feats:
            coord = (feat['x'], feat['y'], feat['z'])
            found = None
            for cluster in candidates:
                if cluster['type'] == feat['type'] and lig_idx not in cluster['ligands']:
                    if dist(coord, cluster['center']) <= radius:
                        found = cluster
                        break
            if found is None:
                candidates.append({'type': feat['type'], 'center': coord, 'ligands': {lig_idx}})
            else:
                n = len(found['ligands'])
                found['center'] = tuple((a*n+b)/(n+1) for a, b in zip(found['center'], coord))
                found['ligands'].add(lig_idx)
    selected = [{'type': c['type'], 'xyz_angstrom': [round(v, 3) for v in c['center']],
                 'support_count': len(c['ligands']), 'radius_angstrom': radius}
                for c in candidates if len(c['ligands'])/len(smiles) >= support]
    return {'features': selected, 'aligned_molblocks': [Chem.MolToMolBlock(Chem.RemoveHs(m)) for m in ligands],
            'scaffold_atoms': match.numAtoms, 'alignment_rmsd_angstrom': rmsds,
            'radius_angstrom': radius, 'minimum_support_fraction': support,
            'warning': 'Single-conformer shared-scaffold alignment: not a validated virtual screening model.',
            **evidence('RDKit ETKDG + MMFF + FMCS alignment + BaseFeatures consensus')}
