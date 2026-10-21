"""Actual AutoDock Vina integration requiring prepared PDBQT input files."""
from __future__ import annotations
from pathlib import Path
from tempfile import TemporaryDirectory


def _validate_pdbqt(text: str, kind: str, maximum: int) -> None:
    """Fail closed on excessive or obviously malformed coordinate data."""
    if not isinstance(text, str) or len(text.encode()) > maximum:
        raise ValueError(f'{kind} PDBQT exceeds configured size limit.')
    if '\x00' in text or not any(line.startswith(('ATOM  ', 'HETATM')) for line in text.splitlines()):
        raise ValueError(f'{kind} must be a prepared PDBQT coordinate file.')
    if len(text.splitlines()) > 40_000:
        raise ValueError('PDBQT has too many lines.')


def dock_prepared(receptor_pdbqt: str, ligand_pdbqt: str,
                  center: list[float], box_size: list[float], seed: int = 2026,
                  exhaustiveness: int = 4) -> dict:
    """Run capped Vina sampling; scores are model estimates, not measured affinities.

    Inputs must already be chemically prepared (protonation, hydrogens, charges,
    torsions). Vina Python bindings and a dedicated compute service are needed.
    """
    if len(center) != 3 or len(box_size) != 3:
        raise ValueError('Docking requires 3D box center and size.')
    if any(abs(float(x)) > 2000 for x in center):
        raise ValueError('Invalid docking coordinates.')
    if any(not 5 <= float(v) <= 32 for v in box_size):
        raise ValueError('Each box dimension must be within 5–32 Angstrom.')
    if not 1 <= exhaustiveness <= 8 or not 0 <= seed < 2**31:
        raise ValueError('Docking exhaustiveness or seed is outside allowed bounds.')
    _validate_pdbqt(receptor_pdbqt, 'Receptor', 2_000_000)
    _validate_pdbqt(ligand_pdbqt, 'Ligand', 100_000)
    try:
        from vina import Vina
        from importlib.metadata import version
    except ImportError as exc:
        raise RuntimeError('AutoDock Vina is not installed on the scientific worker.') from exc
    with TemporaryDirectory(prefix='helix-vina-') as tmp:
        receptor = Path(tmp) / 'receptor.pdbqt'
        ligand = Path(tmp) / 'ligand.pdbqt'
        receptor.write_text(receptor_pdbqt, encoding='utf-8')
        ligand.write_text(ligand_pdbqt, encoding='utf-8')
        model = Vina(sf_name='vina', cpu=1, seed=seed)
        model.set_receptor(str(receptor))
        model.set_ligand_from_file(str(ligand))
        model.compute_vina_maps(center=[float(v) for v in center],
                                box_size=[float(v) for v in box_size])
        model.dock(exhaustiveness=exhaustiveness, n_poses=3)
        pose_path = Path(tmp) / 'poses.pdbqt'
        model.write_poses(str(pose_path), n_poses=3, overwrite=True)
        poses = pose_path.read_text(encoding='utf-8')
        if len(poses) > 1_000_000:
            raise RuntimeError('Vina output exceeded size limit.')
    return {'poses_pdbqt': poses, 'engine': 'AutoDock Vina', 'version': version('vina'),
            'settings': {'center_angstrom': center, 'box_angstrom': box_size,
                         'exhaustiveness': exhaustiveness, 'seed': seed, 'cpu': 1},
            'interpretation': 'Docking scores are predicted, not experimental binding energies.'}
