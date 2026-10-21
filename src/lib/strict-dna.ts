/**
 * Parse IUPAC DNA without dropping or altering unexpected characters.
 * Accepted whitespace and FASTA numbering must be handled by the caller.
 * RNA is deliberately rejected rather than silently converted to DNA.
 */
const allowed=/^[ACGTRYSWKMBDHVN]+$/;
export function validateDna(input:string):string {
  if(typeof input!=='string') throw new Error('Sequence is not text.');
  const value=input.toUpperCase();
  if(value.length===0) throw new Error('DNA sequence is empty.');
  if(value.length>1_000_000) throw new Error('DNA exceeds 1,000,000 bases.');
  if(!allowed.test(value)) {
    const index=[...value].findIndex(c=>!/[ACGTRYSWKMBDHVN]/.test(c));
    throw new Error(`Unsupported DNA character at base ${index+1}: ${JSON.stringify(value[index])}`);
  }
  return value;
}
/** SAFE: source line breaks and numbering may be removed, but never biological letters. */
export function parseOriginLines(input:string):string {
  return validateDna(input.replace(/[\s\d]/g,''));
}
export function gcKnownBases(sequence:string):number {
  const dna=validateDna(sequence);
  const known=(dna.match(/[ACGT]/g)||[]).length;
  if(!known) return 0;
  return (dna.match(/[GC]/g)||[]).length*100/known;
}
