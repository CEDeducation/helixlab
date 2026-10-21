"""Primer3-backed PCR primer design; never fabricate thermodynamic scores."""
from __future__ import annotations


def design_primers(sequence: str, *, product_min: int = 90, product_max: int = 300,
                   num_return: int = 5) -> dict:
    """Design paired primers for an explicitly specified DNA template.

    Primer3's default salt/thermodynamic parameters are preserved and reported.
    These candidates are not guaranteed specific to a genomic reference.
    """
    if not 50 <= len(sequence) <= 100_000 or set(sequence.upper()) - set('ACGT'):
        raise ValueError('Primer design requires 50–100,000 unambiguous A/C/G/T bases.')
    if not 40 <= product_min <= product_max <= min(20_000, len(sequence)):
        raise ValueError('Product range must be within 40 bp and template length.')
    if not 1 <= num_return <= 10:
        raise ValueError('Request between 1 and 10 primer pairs.')
    try:
        import primer3
    except ImportError as exc:
        raise RuntimeError('Primer3-py is not installed on the scientific service.') from exc
    settings = {'PRIMER_OPT_SIZE': 20, 'PRIMER_MIN_SIZE': 18, 'PRIMER_MAX_SIZE': 27,
                'PRIMER_MIN_TM': 57.0, 'PRIMER_OPT_TM': 60.0, 'PRIMER_MAX_TM': 63.0,
                'PRIMER_PRODUCT_SIZE_RANGE': [[product_min, product_max]],
                'PRIMER_NUM_RETURN': num_return}
    out = primer3.bindings.design_primers({'SEQUENCE_ID': 'input', 'SEQUENCE_TEMPLATE': sequence.upper()}, settings)
    if out.get('PRIMER_ERROR'):
        raise ValueError(str(out['PRIMER_ERROR']))
    pairs = []
    for i in range(int(out.get('PRIMER_PAIR_NUM_RETURNED', 0))):
        fpos, flen = out[f'PRIMER_LEFT_{i}']
        rpos, rlen = out[f'PRIMER_RIGHT_{i}']
        pairs.append({'forward': out[f'PRIMER_LEFT_{i}_SEQUENCE'],
                      'reverse': out[f'PRIMER_RIGHT_{i}_SEQUENCE'],
                      'forward_start_0': fpos, 'reverse_end_0': rpos,
                      'forward_length': flen, 'reverse_length': rlen,
                      'forward_tm_c': out[f'PRIMER_LEFT_{i}_TM'],
                      'reverse_tm_c': out[f'PRIMER_RIGHT_{i}_TM'],
                      'product_size_bp': out[f'PRIMER_PAIR_{i}_PRODUCT_SIZE'],
                      'pair_penalty': out[f'PRIMER_PAIR_{i}_PENALTY']})
    return {'pairs': pairs, 'engine': 'Primer3-py', 'version': getattr(primer3, '__version__', 'unknown'),
            'settings': settings, 'caveat': 'Primer design is not genome-wide specificity validation.'}
