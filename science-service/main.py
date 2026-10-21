"""Separate scientific service: not deployed directly as a Vercel Node function."""
from __future__ import annotations
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel, Field
from molecule import analyze_smiles
from sequence import sequence_summary, parse_records
from validation import read_biological_bytes
from auth import authorize
from advanced_api import router

app = FastAPI(title='HelixLab Scientific Engine', docs_url=None, redoc_url=None)
app.include_router(router)


class MoleculeRequest(BaseModel):
    smiles: str = Field(min_length=1, max_length=5000)


class SequenceRequest(BaseModel):
    sequence: str = Field(min_length=1, max_length=1_000_000)
    circular: bool = False


class ImportRequest(BaseModel):
    source: str = Field(min_length=1, max_length=5_000_000)
    format: str = Field(pattern='^(fasta|genbank)$')


@app.get('/health')
def health():
    return {'status': 'ok', 'engine': 'RDKit + Biopython'}


@app.post('/v1/molecule', dependencies=[Depends(authorize)])
def molecule(request: MoleculeRequest):
    try:
        return analyze_smiles(request.smiles)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post('/v1/sequence', dependencies=[Depends(authorize)])
def sequence(request: SequenceRequest):
    try:
        return sequence_summary(request.sequence, request.circular)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post('/v1/import', dependencies=[Depends(authorize)])
def import_sequence(request: ImportRequest):
    try:
        _, evidence = read_biological_bytes(request.source.encode('utf-8'), request.format)
        return {'records': parse_records(request.source, request.format),
                'evidence': evidence.__dict__}
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
