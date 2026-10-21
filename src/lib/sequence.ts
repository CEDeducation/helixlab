import type { SequenceFeature } from "./types"

export type Enzyme = {
  name: string
  motif: string
  cutForward: number
  cutReverse: number
  typeIIS?: boolean
  methylationNote?: string
}

export type MotifMatch = {
  position: number
  strand: 1 | -1
}

export type RestrictionMatch = MotifMatch & {
  cutTop: number | null
  cutBottom: number | null
  methylationContext: string[]
}

// A deliberately compact common-cloning set. Cut offsets are measured from the
// first base of the recognition sequence on the strand in which the motif is written.
// Type IIS offsets therefore extend beyond the recognition sequence.
export const ENZYMES: Enzyme[] = [
  { name: "EcoRI", motif: "GAATTC", cutForward: 1, cutReverse: 5 },
  { name: "SacI", motif: "GAGCTC", cutForward: 5, cutReverse: 1 },
  { name: "KpnI", motif: "GGTACC", cutForward: 5, cutReverse: 1 },
  { name: "SmaI", motif: "CCCGGG", cutForward: 3, cutReverse: 3 },
  { name: "BamHI", motif: "GGATCC", cutForward: 1, cutReverse: 5 },
  { name: "XbaI", motif: "TCTAGA", cutForward: 1, cutReverse: 5 },
  { name: "SalI", motif: "GTCGAC", cutForward: 1, cutReverse: 5 },
  { name: "PstI", motif: "CTGCAG", cutForward: 5, cutReverse: 1 },
  { name: "SphI", motif: "GCATGC", cutForward: 5, cutReverse: 1 },
  { name: "HindIII", motif: "AAGCTT", cutForward: 1, cutReverse: 5 },
  { name: "NotI", motif: "GCGGCCGC", cutForward: 2, cutReverse: 6 },
  { name: "XhoI", motif: "CTCGAG", cutForward: 1, cutReverse: 5 },
  { name: "NheI", motif: "GCTAGC", cutForward: 1, cutReverse: 5 },
  { name: "SpeI", motif: "ACTAGT", cutForward: 1, cutReverse: 5 },
  { name: "ApaI", motif: "GGGCCC", cutForward: 5, cutReverse: 1 },
  { name: "SacII", motif: "CCGCGG", cutForward: 4, cutReverse: 2 },
  { name: "BglII", motif: "AGATCT", cutForward: 1, cutReverse: 5 },
  { name: "ClaI", motif: "ATCGAT", cutForward: 2, cutReverse: 4, methylationNote: "ClaI sensitivity can depend on overlapping Dam methylation context; verify the enzyme supplier guidance." },
  { name: "MluI", motif: "ACGCGT", cutForward: 1, cutReverse: 5 },
  { name: "AgeI", motif: "ACCGGT", cutForward: 1, cutReverse: 5 },
  { name: "BsaI", motif: "GGTCTC", cutForward: 7, cutReverse: 11, typeIIS: true },
  { name: "BsmBI", motif: "CGTCTC", cutForward: 7, cutReverse: 11, typeIIS: true },
  { name: "BbsI", motif: "GAAGAC", cutForward: 8, cutReverse: 12, typeIIS: true },
  { name: "SapI", motif: "GCTCTTC", cutForward: 8, cutReverse: 11, typeIIS: true },
]

const CODONS: Record<string, string> = {
  TTT: "F", TTC: "F", TTA: "L", TTG: "L", TCT: "S", TCC: "S", TCA: "S", TCG: "S",
  TAT: "Y", TAC: "Y", TAA: "*", TAG: "*", TGT: "C", TGC: "C", TGA: "*", TGG: "W",
  CTT: "L", CTC: "L", CTA: "L", CTG: "L", CCT: "P", CCC: "P", CCA: "P", CCG: "P",
  CAT: "H", CAC: "H", CAA: "Q", CAG: "Q", CGT: "R", CGC: "R", CGA: "R", CGG: "R",
  ATT: "I", ATC: "I", ATA: "I", ATG: "M", ACT: "T", ACC: "T", ACA: "T", ACG: "T",
  AAT: "N", AAC: "N", AAA: "K", AAG: "K", AGT: "S", AGC: "S", AGA: "R", AGG: "R",
  GTT: "V", GTC: "V", GTA: "V", GTG: "V", GCT: "A", GCC: "A", GCA: "A", GCG: "A",
  GAT: "D", GAC: "D", GAA: "E", GAG: "E", GGT: "G", GGC: "G", GGA: "G", GGG: "G",
}

const IUPAC = new Set("ACGTRYSWKMBDHVN".split(""))
const IUPAC_PATTERN: Record<string, string> = {
  A: "A", C: "C", G: "G", T: "T", R: "[AG]", Y: "[CT]", S: "[GC]", W: "[AT]",
  K: "[GT]", M: "[AC]", B: "[CGT]", D: "[AGT]", H: "[ACT]", V: "[ACG]", N: "[ACGT]",
}

export function cleanDna(input: string) {
  // Sequence calculations must operate on biological symbols only.
  // This deliberately removes line breaks, spaces, digits and punctuation so
  // formatting characters can never inflate bp length or dilute GC%.
  return input.toUpperCase().replace(/U/g, "T").replace(/[^ACGTRYSWKMBDHVN]/g, "")
}

export function dnaLength(input: string) {
  return cleanDna(input).length
}

export function canonicalDna(input: string) {
  return cleanDna(input).replace(/[^ACGT]/g, "N")
}

export function gcPercent(sequence: string) {
  const seq = cleanDna(sequence)
  let gc = 0
  let canonical = 0
  for (const base of seq) {
    if ("ACGT".includes(base)) canonical += 1
    if (base === "G" || base === "C") gc += 1
  }
  return canonical ? (gc / canonical) * 100 : 0
}

export function reverseComplement(sequence: string) {
  const pair: Record<string, string> = {
    A: "T", T: "A", G: "C", C: "G", N: "N", R: "Y", Y: "R", S: "S", W: "W",
    K: "M", M: "K", B: "V", V: "B", D: "H", H: "D",
  }
  return [...cleanDna(sequence)].reverse().map(base => pair[base] || "N").join("")
}

export function translateDna(sequence: string, frame = 0, table: 1 | 11 = 1, cdsStart = false) {
  const seq = canonicalDna(sequence).slice(Math.max(0, Math.min(2, frame)))
  let protein = ""
  const bacterialStarts = new Set(["TTG", "CTG", "ATT", "ATC", "ATA", "ATG", "GTG"])
  for (let index = 0; index + 2 < seq.length; index += 3) {
    const codon = seq.slice(index, index + 3)
    let aa = /^[ACGT]{3}$/.test(codon) ? (CODONS[codon] || "X") : "X"
    if (cdsStart && index === 0 && table === 11 && bacterialStarts.has(codon)) aa = "M"
    protein += aa
  }
  return protein
}

function iupacRegex(query: string) {
  const cleaned = cleanDna(query)
  return cleaned ? new RegExp(`(?=(${[...cleaned].map(base => IUPAC_PATTERN[base] || "N").join("")}))`, "g") : null
}

function motifPositions(sequence: string, query: string, circular: boolean) {
  const seq = canonicalDna(sequence)
  const needle = cleanDna(query)
  if (!seq || !needle) return [] as number[]
  const haystack = circular && needle.length > 1 ? seq + seq.slice(0, needle.length - 1) : seq
  const regex = iupacRegex(needle)
  if (!regex) return []
  const positions: number[] = []
  let match: RegExpExecArray | null
  while ((match = regex.exec(haystack)) && positions.length < 5000) {
    if (match.index >= seq.length) break
    positions.push(match.index)
    regex.lastIndex = match.index + 1
  }
  return positions
}

export function findMotifMatches(sequence: string, query: string, circular = false, bothStrands = true): MotifMatch[] {
  const needle = cleanDna(query)
  if (!needle) return []
  const forward = motifPositions(sequence, needle, circular).map(position => ({ position, strand: 1 as const }))
  if (!bothStrands) return forward
  const reverseNeedle = reverseComplement(needle)
  if (reverseNeedle === needle) return forward
  const reverse = motifPositions(sequence, reverseNeedle, circular).map(position => ({ position, strand: -1 as const }))
  return [...forward, ...reverse].sort((a, b) => a.position - b.position || b.strand - a.strand)
}

export function findAll(sequence: string, query: string, circular = false) {
  return findMotifMatches(sequence, query, circular, false).map(match => match.position)
}

function normalizeCut(value: number, length: number, circular: boolean) {
  if (!length) return null
  if (circular) return ((value % length) + length) % length
  return value >= 0 && value <= length ? value : null
}

function intervalsOverlapCircular(siteStart: number, siteLength: number, motifStart: number, motifLength: number, length: number) {
  const expand = (start: number, span: number) => span <= 0 ? [] : start + span <= length ? [[start, start + span]] : [[start, length], [0, (start + span) % length]]
  const a = expand(siteStart, siteLength)
  const b = expand(motifStart, motifLength)
  return a.some(([as, ae]) => b.some(([bs, be]) => as < be && bs < ae))
}

function methylationContext(sequence: string, position: number, motifLength: number, circular: boolean) {
  const length = cleanDna(sequence).length
  if (!length) return []
  const warnings: string[] = []
  const candidates = [
    { motif: "GATC", label: "Dam (GATC)" },
    { motif: "CCWGG", label: "Dcm (CCWGG)" },
  ]
  for (const candidate of candidates) {
    const matches = findMotifMatches(sequence, candidate.motif, circular, false)
    if (matches.some(match => intervalsOverlapCircular(position, motifLength, match.position, cleanDna(candidate.motif).length, length))) warnings.push(candidate.label)
  }
  return warnings
}

export function restrictionSites(sequence: string, circular = false) {
  const length = cleanDna(sequence).length
  return ENZYMES.map(enzyme => {
    const matches: RestrictionMatch[] = findMotifMatches(sequence, enzyme.motif, circular, true).map(match => {
      const motifLength = cleanDna(enzyme.motif).length
      const topRaw = match.strand === 1 ? match.position + enzyme.cutForward : match.position + motifLength - enzyme.cutReverse
      const bottomRaw = match.strand === 1 ? match.position + enzyme.cutReverse : match.position + motifLength - enzyme.cutForward
      return {
        ...match,
        cutTop: normalizeCut(topRaw, length, circular),
        cutBottom: normalizeCut(bottomRaw, length, circular),
        methylationContext: methylationContext(sequence, match.position, motifLength, circular),
      }
    })
    return { ...enzyme, matches, positions: matches.map(match => match.position) }
  }).filter(enzyme => enzyme.matches.length > 0)
}

export function digestFragments(sequenceLength: number, cutPositions: number[], circular: boolean) {
  const cuts = [...new Set(cutPositions.map(value => Math.max(0, Math.min(sequenceLength, Math.trunc(value)))))]
    .sort((a, b) => a - b)
  if (!cuts.length) return [sequenceLength]
  if (!circular) {
    const edges = [0, ...cuts, sequenceLength]
    return edges.slice(1).map((edge, index) => edge - edges[index]).filter(length => length > 0)
  }
  if (cuts.length === 1) return [sequenceLength]
  const fragments = cuts.slice(1).map((cut, index) => cut - cuts[index])
  fragments.push(sequenceLength - cuts[cuts.length - 1] + cuts[0])
  return fragments.sort((a, b) => b - a)
}

