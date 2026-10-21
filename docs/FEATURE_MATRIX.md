# v0.7 feature matrix — read before deploying

**Integration source** means concrete source modules invoke a real open-source engine, not that the whole workflow has passed a production acceptance test.

| Function | Code status | Test evidence / limitation |
|---|---|---|
| OpenLab circular plasmid viewer | Preserved from user ZIP | Browser interaction tested in prior build, source retained |
| DNA restriction, translation, FASTA, simple GenBank | Implemented | Seven JS tests passed; complex GenBank features explicitly rejected |
| Ketcher 2D editing | React component imported from `ketcher-react` | Actual editor import/export/SMILES API wired; npm/browser end-to-end unverified offline |
| Mol* protein viewer | Real `Viewer.create` / `loadStructureFromData` integration | PDB/mmCIF upload UI; npm/browser WebGL end-to-end unverified offline |
| RDKit properties | Real Python RDKit service | Existing reference tests passed |
| Primer3 PCR | Real `primer3-py` bind/route/UI | Scientific backend dependency unavailable locally; CI test will run when installed |
| LBDD pharmacophore | RDKit ETKDG/MMFF, FMCS alignment and feature clustering | Reference test passed; single-conformer congeneric heuristic, not screening-validated |
| SBDD pharmacophore | Biopython receptor coordinates + RDKit ligand features and proximity | Reference test passed; **not** validated H-bond geometry / interaction energies |
| Docking | Real `vina.Vina` calls, prepared PDBQT input/output | Vina dependency unavailable locally; no docking accuracy or runtime validation |
| Research notebook | Basic linked plain-text entries | Rich embeddable notebook not yet integrated |
| Five profiles | Existing account persona implementation | Profiles share login, not separate security boundaries |
| Group collaboration | Existing Supabase schema, invites and RLS | Requires live two-account RLS/invitation test |
| Scientific publication readiness | **Not certified** | Independent benchmark controls, provenance, user validation required |

No third-party proprietary code is included. Packages are resolved from their public registries on install; this ZIP does **not** bundle their upstream source or compiled WebGL/WASM assets.
