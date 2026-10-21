"""Reference behavior tests, not a claim of exhaustive scientific validation."""
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pytest
from molecule import analyze_smiles
from sequence import sequence_summary, parse_records
from validation import validate_dna


def test_aspirin_formula_and_masses():
    result = analyze_smiles('CC(=O)Oc1ccccc1C(=O)O')
    assert result['formula'] == 'C9H8O4'
    assert abs(result['exact_mass'] - 180.0423) < 0.001
    assert abs(result['molecular_weight'] - 180.16) < 0.05


def test_chem_invalid_smiles_fails_closed():
    with pytest.raises(ValueError): analyze_smiles('this_is_not_a_smiles!')


def test_dna_validation_fails_closed():
    with pytest.raises(ValueError): validate_dna('ATGXYZ')


def test_dna_reference_and_enzymes():
    result = sequence_summary('ATGGAATTCTAA', False)
    assert result['length'] == 12
    assert result['frame_1_standard'] == 'MEF*'
    assert 'EcoRI' in result['restriction_cuts_1_based']


def test_fasta_multi_record_and_invalid_input():
    result = parse_records('>a\nATG\n>b\nGGCC\n', 'fasta')
    assert len(result) == 2
    assert result[1]['sequence'] == 'GGCC'
    with pytest.raises(ValueError): parse_records('>bad\nATGX\n', 'fasta')
