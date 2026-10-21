"""RDKit molecular descriptors with explicit method and toolkit version."""
from __future__ import annotations
from rdkit import Chem, rdBase
from rdkit.Chem import Descriptors, Crippen, rdMolDescriptors, Lipinski


def analyze_smiles(smiles: str) -> dict:
    """Calculate exact mass and related descriptors from a sanitized molecule.

    Lipinski alerts are screening heuristics, not pharmacokinetic measurements.
    """
    if not isinstance(smiles, str) or not smiles or len(smiles) > 5000:
        raise ValueError("SMILES must contain 1–5000 characters")
    molecule = Chem.MolFromSmiles(smiles, sanitize=True)
    if molecule is None:
        raise ValueError("RDKit rejected or could not sanitize SMILES")
    mol_weight = float(Descriptors.MolWt(molecule))
    exact_mass = float(rdMolDescriptors.CalcExactMolWt(molecule))
    logp = float(Crippen.MolLogP(molecule))
    tpsa = float(rdMolDescriptors.CalcTPSA(molecule))
    hbd = int(Lipinski.NumHDonors(molecule))
    hba = int(Lipinski.NumHAcceptors(molecule))
    violations = sum([mol_weight > 500, logp > 5, hbd > 5, hba > 10])
    return {
        "smiles": Chem.MolToSmiles(molecule, canonical=True),
        "formula": rdMolDescriptors.CalcMolFormula(molecule),
        "exact_mass": round(exact_mass, 7),
        "molecular_weight": round(mol_weight, 5),
        "logp": round(logp, 6),
        "tpsa": round(tpsa, 5),
        "hbd": hbd, "hba": hba,
        "rotatable_bonds": int(Lipinski.NumRotatableBonds(molecule)),
        "lipinski_violations": int(violations),
        "method": "RDKit sanitized SMILES; descriptors are computationally derived, not measured ADME",
        "rdkit_version": rdBase.rdkitVersion,
    }
