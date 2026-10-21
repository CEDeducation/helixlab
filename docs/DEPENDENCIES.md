# Upstream scientific integrations and licensing

| Engine | Repo | Used through | License / remarks |
|---|---|---|---|
| Ketcher | https://github.com/epam/ketcher | npm `ketcher-react`, `ketcher-core`, `ketcher-standalone` v3.18.0 | Apache-2.0; includes Indigo standalone/WASM assets |
| Mol* | https://github.com/molstar/molstar | npm `molstar` v5.13.1 | MIT; cite Mol* 2021 NAR publication |
| Primer3-py | https://github.com/libnano/primer3-py | Python binding of Primer3 C engine | Review Primer3 GPL terms before distribution |
| AutoDock Vina | https://github.com/ccsb-scripps/AutoDock-Vina | Python `vina` binding, separate compute service | Review current upstream LICENSE and publications |
| RDKit | https://github.com/rdkit/rdkit | Python `Chem`, `AllChem`, `rdFMCS`, `ChemicalFeatures` | BSD |
| Biopython | https://github.com/biopython/biopython | PDBParser, sequence records | Biopython license |
| Original OpenLab viewer | User-provided OpenLab ZIP | `CircularSequenceMap.tsx`, original styles | Confirm rights to redistribute the supplied code |

These dependencies are integrations referenced by code and lockable versions; they are not copies of Benchling/Discovery Studio and do not confer validation for publications. Production license/SBOM audit still required.
