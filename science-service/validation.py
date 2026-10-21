"""Fail-closed scientific input validation: never silently normalize unknown bases."""
from __future__ import annotations
import hashlib
import re
from dataclasses import dataclass

DNA_ALPHABET = frozenset("ACGTRYSWKMBDHVN")
MAX_UPLOAD = 5_000_000

@dataclass(frozen=True)
class InputEvidence:
    sha256: str
    length: int
    format: str


def read_biological_bytes(raw: bytes, format_name: str) -> tuple[str, InputEvidence]:
    """Decode UTF-8 only and retain hash of the unaltered upload."""
    if not raw or len(raw) > MAX_UPLOAD:
        raise ValueError("File must be between 1 byte and 5 MB")
    if b"\x00" in raw:
        raise ValueError("Binary/NUL data is not a supported text sequence file")
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ValueError("Source must be UTF-8 text") from exc
    return text, InputEvidence(hashlib.sha256(raw).hexdigest(), len(raw), format_name)


def validate_dna(sequence: str) -> str:
    """Strict IUPAC DNA; stripping whitespace is an importer responsibility."""
    if not sequence or len(sequence) > 1_000_000:
        raise ValueError("DNA length must be 1–1,000,000 bases")
    sequence = sequence.upper()
    invalid = next((i for i, c in enumerate(sequence) if c not in DNA_ALPHABET), None)
    if invalid is not None:
        raise ValueError(f"Unexpected DNA character at position {invalid + 1}")
    return sequence


def parse_fasta_source(text: str):
    """Parse using Biopython, verify no ambiguous text was silently discarded."""
    from Bio import SeqIO
    from io import StringIO
    if not text.lstrip().startswith(">"):
        raise ValueError("Expected FASTA header beginning with >")
    records = list(SeqIO.parse(StringIO(text), "fasta"))
    if not records:
        raise ValueError("No FASTA records")
    for record in records:
        validate_dna(str(record.seq))
    return records


def parse_genbank_source(text: str):
    """Use Biopython to preserve complex feature locations and annotations."""
    from Bio import SeqIO
    from io import StringIO
    if not re.search(r"^LOCUS\s+", text, re.M):
        raise ValueError("Missing GenBank LOCUS line")
    records = list(SeqIO.parse(StringIO(text), "genbank"))
    if not records:
        raise ValueError("No GenBank records")
    for record in records:
        validate_dna(str(record.seq))
    return records
