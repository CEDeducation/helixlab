# v0.6 build evidence — 2026-10-21

## Passed in the packaging environment

- **7 actual TypeScript scientific module tests:** strict IUPAC checks, multi-record FASTA, malformed input, FASTA/GenBank round-trip, complex-feature rejection, enzyme cut positions, reverse complements, translation.
- **5 scientific Python tests:** reference aspirin properties, invalid SMILES rejection, invalid DNA, EcoRI and translation, multi-FASTA parsing and rejection.
- **Source architecture guard:** 250-line source limit, local-import resolution, basic secret-pattern scan.
- **TypeScript syntax transpilation:** source `.ts/.tsx` parsed without diagnostics using the global TypeScript compiler.
- **UI source preservation:** original OpenLab circular map checksum matches exactly; concatenated original CSS modules also match.

## Not passed/not attempted

- Full `npm install`, `next build` and TypeScript semantic typecheck (package registry unavailable here).
- Live Vercel deployment and Supabase database authentication/row-level security integration.
- Full browser E2E interactions against a deployed build, including five profiles, invitation acceptance, protected upload and notebook round-trips.
- Independent penetration testing or scientific method validation sufficient for scientific publications.

**Release disposition: engineering beta only.** Successful GitHub CI and production integration tests are required before using confidential pre-publication records.
