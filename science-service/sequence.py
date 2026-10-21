"""Biopython-backed sequence parsing and reproducible reference outputs."""
from __future__ import annotations
import hashlib
from io import StringIO
from Bio import __version__ as BIOPYTHON_VERSION
from Bio.Seq import Seq
from Bio.Restriction import EcoRI, BamHI, HindIII, RestrictionBatch, Analysis
from Bio.SeqUtils import gc_fraction
from validation import parse_fasta_source, parse_genbank_source, validate_dna


def sequence_summary(sequence: str, circular: bool = False) -> dict:
    """The input must be validated IUPAC DNA; GC reports fraction of known bases."""
    sequence = validate_dna(sequence)
    known = ''.join(x for x in sequence if x in 'ACGT')
    gc_percent = gc_fraction(known) * 100 if known else 0.0
    enzyme_analysis = Analysis(RestrictionBatch([EcoRI, BamHI, HindIII]), Seq(sequence), linear=not circular)
    sites = {enzyme.__name__: positions for enzyme, positions in enzyme_analysis.full().items() if positions}
    return {
        'length': len(sequence), 'gc_known_pct': round(gc_percent, 6),
        'ambiguous_bases': len(sequence) - len(known),
        'reverse_complement': str(Seq(sequence).reverse_complement()),
        'frame_1_standard': str(Seq(sequence).translate(to_stop=False)),
        'restriction_cuts_1_based': sites,
        'method': 'Biopython; standard genetic code 1; 1-based cut coordinates',
        'biopython_version': BIOPYTHON_VERSION,
        'sha256_normalized_sequence': hashlib.sha256(sequence.encode()).hexdigest(),
    }


def parse_records(text: str, fmt: str) -> list[dict]:
    if fmt == 'fasta': records = parse_fasta_source(text)
    elif fmt == 'genbank': records = parse_genbank_source(text)
    else: raise ValueError('Unsupported sequence format')
    output = []
    for item in records:
        sequence = validate_dna(str(item.seq))
        features = []
        for feature in item.features:
            # CompoundLocation is represented explicitly; not collapsed into an incorrect range.
            loc = str(feature.location)
            features.append({'type': feature.type, 'location_expression': loc,
                             'qualifiers': feature.qualifiers})
        output.append({'name': item.name, 'sequence': sequence,
                       'topology': item.annotations.get('topology', 'linear'),
                       'features': features, 'format': fmt})
    return output
