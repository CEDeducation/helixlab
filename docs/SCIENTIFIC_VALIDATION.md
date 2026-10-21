# Scientific validation requirements

## Established deterministic methods

- Browser DNA: IUPAC validation, known-base GC%, reverse complement, standard genetic code translation, motif search, and restriction cuts using OpenLab's supplied code. Coordinates are zero-based inclusive in viewer records; GenBank uses one-based inclusive positions.
- Backend DNA: Biopython independently computes GC, translation, EcoRI/BamHI/HindIII sites and reverse complements. Data is labeled by Biopython version.
- Backend molecular properties: RDKit canonical SMILES, molecular formula, monoisotopic exact mass, average molecular weight, Crippen logP and TPSA, HBD/HBA, and rotatable bonds. Values are model/toolkit descriptors, not measured pharmacokinetics.
- Original bytes and SHA-256 metadata are retained for sequence uploads, with server-side verification still a recommended security hardening task.

## Required before publication use

1. Establish an external, independent reference dataset for each scientific module, including synthetic positive and negative controls.
2. Test circular-origin restriction sites, ambiguous IUPAC bases, reverse-strand GenBank features, segmented join/complement locations, gene frames and genetic code tables.
3. Validate FASTA/GenBank round-trips against Biopython and canonical external fixtures; no silent feature loss.
4. Validate RDKit descriptor values against toolkit references; record mol standardization, protonation and tautomer policy.
5. Treat docking/pharmacophore outputs as predictions, not measured binding energy or biological efficacy. Add active/inactive datasets, pose controls and parameter metadata before enabling.
6. Verify audit trail integrity and original-file restore, and test under simultaneous users and interrupted uploads.
7. Document input checksums, provenance, execution version, assumptions, confidence/limitations, and precise export coordinates.

## Explicit non-guarantees

A passing unit test or recognizable output does **not** mean a method is scientifically correct in every context. Even deterministic computation requires correct assumptions and valid input. HelixLab does not assert absolute accuracy or that results are sufficient for a journal submission.

## v0.7 additional modeling engines

- Primer3: actual design engine used when installed; report engine settings, melting temperatures and penalties. Genome-wide primer specificity is **not** assessed.
- Ligand pharmacophores: RDKit ETKDG embedding + optional MMFF optimization + common-scaffold alignment + RDKit feature clustering. One-conformer/single-alignment approximation; do not equate spatial feature consensus with proven binding.
- Structure pharmacophores: RDKit features in a bound 3D ligand with Biopython PDB heavy-atom proximity; they are **contact candidates**, not chemically/angle-verified hydrogen bonds.
- Vina: PDBQT input must already be chemically prepared; seed, box, CPU and exhaustiveness recorded. Docking scores are predicted and should be validated by redocking known complexes and inspecting pose quality.
- Mol*: renders structure coordinates; does not validate source structure quality or experimental method.
- Ketcher: chemical drawing is distinct from RDKit sanitization; only RDKit-accepted SMILES produces computed descriptors.

**Required prepublication work:** publish version-pinned external benchmark test fixtures, analytical methods for all modules, uncertainty/control data, provenance exports, independently reviewed reference calculations, and software environment capture. Do not label predictive outputs “100% scientifically correct.”
