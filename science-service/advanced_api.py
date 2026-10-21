"""Authenticated computational engines with explicit input limits."""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from auth import authorize
from primer_engine import design_primers
from pharmacophore_ligand import ligand_consensus
from pharmacophore_structure import structure_pharmacophore
from docking_engine import dock_prepared

router = APIRouter(prefix='/v1', dependencies=[Depends(authorize)])


class PrimerInput(BaseModel):
    sequence: str = Field(min_length=50, max_length=100_000, pattern=r'^[ACGTacgt]+$')
    product_min: int = Field(default=90, ge=40, le=20_000)
    product_max: int = Field(default=300, ge=40, le=20_000)
    num_return: int = Field(default=5, ge=1, le=10)


class LigandInput(BaseModel):
    smiles: list[str] = Field(min_length=2, max_length=12)
    radius: float = Field(default=1.5, ge=.5, le=3)
    support: float = Field(default=.67, ge=.5, le=1)
    seed: int = Field(default=2026, ge=0, le=2_147_483_647)


class StructureInput(BaseModel):
    protein_pdb: str = Field(min_length=50, max_length=2_000_000)
    ligand_sdf: str = Field(min_length=50, max_length=300_000)
    cutoff: float = Field(default=4.0, ge=2, le=6)


class DockingInput(BaseModel):
    receptor_pdbqt: str = Field(min_length=50, max_length=2_000_000)
    ligand_pdbqt: str = Field(min_length=50, max_length=100_000)
    center: list[float] = Field(min_length=3, max_length=3)
    box_size: list[float] = Field(min_length=3, max_length=3)
    seed: int = Field(default=2026, ge=0, le=2_147_483_647)
    exhaustiveness: int = Field(default=4, ge=1, le=8)


def evaluate(fn, *args, **kwargs) -> dict:
    """Return invalid input distinctly from missing engine dependencies."""
    try:
        return fn(*args, **kwargs)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(503, str(exc)) from exc


@router.post('/primers')
def primers(input: PrimerInput) -> dict:
    return evaluate(design_primers, input.sequence, product_min=input.product_min,
                    product_max=input.product_max, num_return=input.num_return)


@router.post('/pharmacophore/ligand')
def ligand(input: LigandInput) -> dict:
    return evaluate(ligand_consensus, input.smiles, radius=input.radius,
                    support=input.support, seed=input.seed)


@router.post('/pharmacophore/structure')
def structure(input: StructureInput) -> dict:
    return evaluate(structure_pharmacophore, input.protein_pdb, input.ligand_sdf, input.cutoff)


@router.post('/dock')
def docking(input: DockingInput) -> dict:
    return evaluate(dock_prepared, input.receptor_pdbqt, input.ligand_pdbqt,
                    input.center, input.box_size, input.seed, input.exhaustiveness)
