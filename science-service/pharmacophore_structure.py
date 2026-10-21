"""Structure-based pharmacophore candidates from explicit molecular coordinates."""
from __future__ import annotations
from io import StringIO, BytesIO
from math import dist
from Bio.PDB import PDBParser
from rdkit import Chem
from pharmacophore_common import extract_features, evidence


def structure_pharmacophore(protein_pdb: str, ligand_sdf: str,
                            cutoff: float = 4.0) -> dict:
    """Return feature positions on a bound ligand and nearby protein atoms.

    Contacts are only distance-based candidate interactions. A full H-bond
    analysis requires protonation and angular geometry; do not label these
    predictions as experimentally confirmed protein-ligand bonds.
    """
    if len(protein_pdb.encode()) > 2_000_000 or len(ligand_sdf.encode()) > 300_000:
        raise ValueError('Protein must be <2 MB and ligand SDF <300 kB.')
    if not 2.0 <= cutoff <= 6.0:
        raise ValueError('Cutoff must be between 2 and 6 Angstrom.')
    if not ('ATOM  ' in protein_pdb or 'HETATM' in protein_pdb):
        raise ValueError('Input does not appear to be PDB coordinates.')
    try:
        structure = PDBParser(QUIET=True).get_structure('receptor', StringIO(protein_pdb))
    except Exception as exc:
        raise ValueError('Cannot parse protein PDB.') from exc
    reader = Chem.ForwardSDMolSupplier(BytesIO(ligand_sdf.encode('utf-8')), sanitize=True, removeHs=False)
    try:
        ligand = next(iter(reader), None)
    except Exception as exc:
        raise ValueError('Cannot parse ligand SDF.') from exc
    if ligand is None or ligand.GetNumAtoms() > 300 or not ligand.GetNumConformers():
        raise ValueError('Ligand must be a valid 3D SDF with at most 300 atoms.')
    atoms = []
    for atom in structure.get_atoms():
        if atom.element.upper() not in {'C', 'N', 'O', 'S', 'P', 'F'}:
            continue
        residue = atom.get_parent()
        if residue.id[0] != ' ':
            continue
        atoms.append((atom.get_coord(), residue.get_resname(), residue.id[1], atom.get_name()))
        if len(atoms) > 100_000:
            raise ValueError('Protein has too many atoms for interactive contact screening.')
    if not atoms:
        raise ValueError('No recognized protein heavy atoms in PDB.')
    entries = []
    for feat in extract_features(ligand):
        center = (feat['x'], feat['y'], feat['z'])
        nearby = []
        for coord, res, resid, name in atoms:
            sep = dist(center, (float(coord[0]), float(coord[1]), float(coord[2])))
            if sep <= cutoff:
                nearby.append({'residue': res, 'residue_number': resid,
                               'atom': name, 'distance_angstrom': round(sep, 3)})
        if nearby:
            feat['nearby_protein_atoms'] = sorted(nearby, key=lambda v: v['distance_angstrom'])[:8]
            feat['xyz_angstrom'] = [feat.pop('x'), feat.pop('y'), feat.pop('z')]
            entries.append(feat)
    return {'features': entries, 'cutoff_angstrom': cutoff,
            'protein_atoms_examined': len(atoms), 'feature_count': len(entries),
            **evidence('Biopython PDB parser + RDKit BaseFeatures + distance proximity'),
            'interpretation': 'Nearby protein atoms are contact candidates, not validated hydrogen bonds.'}
