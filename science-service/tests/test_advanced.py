"""Scientific integrity smoke tests for real and optional computation engines."""
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
import pytest
from fastapi.testclient import TestClient
from rdkit import Chem
from rdkit.Chem import AllChem
from main import app
from primer_engine import design_primers
from docking_engine import dock_prepared
from pharmacophore_ligand import ligand_consensus
from pharmacophore_structure import structure_pharmacophore


def test_ligand_consensus_has_real_3d_features():
    result = ligand_consensus(['CCO', 'CCCO'], seed=42)
    assert result['scaffold_atoms'] >= 3
    assert all(len(feat['xyz_angstrom']) == 3 for feat in result['features'])
    assert result['status'] == 'computational prediction'
    assert result['aligned_molblocks'] and 'V2000' in result['aligned_molblocks'][0]


def test_ligand_consensus_rejects_malformed_or_too_few():
    with pytest.raises(ValueError):
        ligand_consensus(['not_a_smiles', 'CCO'])
    with pytest.raises(ValueError):
        ligand_consensus(['CCO'])


def test_structure_proximity_uses_ligand_coordinates():
    ligand = Chem.AddHs(Chem.MolFromSmiles('CCO'))
    assert AllChem.EmbedMolecule(ligand, randomSeed=12) == 0
    sdf = Chem.MolToMolBlock(ligand) + '\n$$$$\n'
    pdb = ''.join(f'ATOM  {i:5d}  CA  GLY A{i:4d}    '
                  f'{0.:8.3f}{0.:8.3f}{float(i):8.3f}{1.:6.2f}{30.:6.2f}           C\n'
                  for i in range(1, 5)) + 'END\n'
    result = structure_pharmacophore(pdb, sdf)
    assert result['protein_atoms_examined'] == 4
    assert result['feature_count'] > 0
    assert 'contact candidates' in result['interpretation']


def test_structure_rejects_non_3d_files():
    with pytest.raises(ValueError):
        structure_pharmacophore('this is not a valid protein PDB', 'not an SDF')


def test_primer_validation_is_not_a_mock():
    with pytest.raises(ValueError):
        design_primers('ATCG')
    with pytest.raises(ValueError):
        design_primers('A' * 120, product_min=150, product_max=300)


def test_docking_prepared_inputs_checked_before_engine():
    with pytest.raises(ValueError):
        dock_prepared('not-pdbqt', 'not-pdbqt', [0, 0, 0], [20, 20, 20])
    with pytest.raises(ValueError):
        dock_prepared('ATOM   1', 'ATOM   1', [0, 0, 0], [400, 20, 20])


def test_science_auth_required(monkeypatch):
    monkeypatch.setenv('SCIENCE_SERVICE_SECRET', 'a_secure_test_secret_that_is_very_long')
    client = TestClient(app)
    response = client.post('/v1/pharmacophore/ligand', json={'smiles':['CCO','CCCO']})
    assert response.status_code == 401
    valid = client.post('/v1/pharmacophore/ligand', headers={'x-helix-token':'a_secure_test_secret_that_is_very_long'},
                        json={'smiles':['CCO','CCCO']})
    assert valid.status_code == 200
    assert valid.json()['features']


def test_real_primer_engine_when_installed():
    pytest.importorskip('primer3', reason='Primer3 unavailable in offline package image')
    result = design_primers('ATGCGCTAGCTAGGCCATGGAATTCGCGGTACCTAGCGTAGCGATCGATCG' * 4,
                            product_min=90, product_max=120)
    assert result['engine'] == 'Primer3-py'
    assert len(result['pairs']) <= 5
