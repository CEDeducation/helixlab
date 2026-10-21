# HelixLab Scientific Suite v0.7

**Status: integration beta, NOT commercial-launch certified and NOT publication-validated.**

This GitHub-ready application preserves the user's original **OpenLab v8.2 plasmid viewer and UI**, while adding direct scientific integrations from **Ketcher, Mol*, Primer3-py, AutoDock Vina, RDKit and Biopython**. The source code is modular and includes 250-line audits and scientific checks. It does not contain proprietary Benchling/Discovery Studio code.

## What changed from v0.6

| Module | What the new code does | Actual validation |
|---|---|---|
| Ketcher | Embeds `ketcher-react` editor; load SMILES/MOL, extract SMILES, export MOL | Frontend code wired; **browser/npm run unverified** |
| Mol* | `Viewer.create` and `loadStructureFromData` for local PDB/mmCIF | Frontend code wired; **WebGL/browser unverified** |
| Primer3 | Official `primer3-py` PCR design API, explicit Tm, penalties and report export | API/UI implemented; `primer3` missing in packaging environment |
| LBDD | RDKit ETKDG+FMCS 3D alignment/feature clustering | Real local scientific tests passed; limited congeneric approach |
| SBDD | RDKit 3D ligand features near Biopython PDB receptor atoms | Real local tests passed; proximity only, **not verified binding chemistry** |
| Docking | AutoDock Vina prepared-PDBQT interface, private API, capped settings | API/UI implemented; `vina` missing in packaging environment |
| DNA / ELN / group | Prior plasmid editor, notebook, profiles, RLS-backed records | Existing tests passed; full Supabase security testing outstanding |

**The ZIP includes integration code, not vendored third-party source/binaries.** On installation the upstream packages must be downloaded via npm/pip. Installing libraries alone does not prove browser/runtime correctness.

## Quick GitHub + Vercel deployment

1. Unzip the contents and upload the directory tree (not the ZIP itself) to a private GitHub repository. Include `.github` and the Supabase migrations; never commit real research data or secrets.
2. Create a [Supabase](https://supabase.com) project. In SQL Editor, run `supabase/migrations/202610210001_schema.sql` then `supabase/migrations/202610210002_policies.sql`. Configure authenticated email redirects for the actual Vercel hostname.
3. Import the GitHub repo into [Vercel](https://vercel.com/new) as Next.js. Use **Node.js 24** (Ketcher v3.18 requires Node ≥24.20 for build tooling) and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy the frontend and sign in. The DNA, profile and notebook code uses Supabase. The scientific compute tools need the **separate Python service** in the next section.
5. Check Vercel build logs. The package registry was unreachable here, so the complete npm/Next.js build could **not** be verified before release. Fix any production-only bundling, asset or API issues before sharing the site.

## Private scientific service (not hosted by Vercel)

Install this **separately** on a suitable Python/Linux compute host; Vercel functions should not run docking tasks or install RDKit/Vina inside frontend functions.

```bash
cd science-service
python -m venv .venv
source .venv/bin/activate       # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
export SCIENCE_SERVICE_SECRET='replace-with-a-long-random-secret'
uvicorn main:app --host 127.0.0.1 --port 8000
pytest -q tests
```

Do **not** expose raw Uvicorn to the public internet. Put it behind HTTPS, restrictive networking, authenticated routing and rate limiting. Set the following **server-only Vercel environment variables** to connect it:

```dotenv
SCIENCE_SERVICE_URL=https://your-private-compute-api.example
SCIENCE_SERVICE_SECRET=the-same-strong-secret
```

The Next.js `/api/science/[engine]` handler authenticates via Supabase, checks a fixed endpoint allowlist and proxies to the Python engine. Engines return explicit 503 errors when not installed. Vina requires a prepared receptor/ligand PDBQT, and may exceed Vercel hobby execution limits: production docking requires an asynchronous job queue and controlled worker resources.

## Local frontend

```bash
# Node.js 24.20+, .env.local configured with your real Supabase project
npm install
npm run dev
```

Open `http://localhost:3000`. To run validation:

```bash
npm run test:science
npm run lint:architecture
npm run typecheck
npm run build
cd science-service && python -m pytest -q tests
```

The `postinstall` script copies published Ketcher UI assets to `public/ketcher-assets`. If the editor is blank, check Vercel's network console for missing resources and verify Node version, package compatibility and bundled asset paths.

## Architecture

- `src/components/DnaStudio.tsx` and `CircularSequenceMap.tsx`: preserved OpenLab plasmid editing and source UI.
- `src/components/KetcherCanvas.tsx`: official Ketcher React editor embedded in Chemistry Studio.
- `src/components/ProteinViewer.tsx`: Mol* structure viewer; local PDB/mmCIF input.
- `src/components/PrimerStudio.tsx`, `PharmacophoreStudio.tsx`, `DockingStudio.tsx`: real scientific workflows.
- `src/lib/science-client.ts`: typed protected scientific request helper and export utility.
- `src/app/api/science/[engine]/route.ts`: authenticated Next.js proxy (no tokens in browser).
- `science-service/advanced_api.py`: Pydantic API input contracts and size limits.
- `science-service/{primer_engine,pharmacophore_*,docking_engine}.py`: independent scientific algorithms backed by named libraries.
- `supabase/migrations/`: workspace, member permissions, profiles, record history and private files.
- `docs/FEATURE_MATRIX.md`, `docs/SCIENTIFIC_VALIDATION.md`, `docs/SECURITY_REVIEW.md`: limits and test evidence.

No individual new code file exceeds 250 lines. Inputs, algorithm versions and important assumptions are documented. The student personas share one account credential; real team collaboration requires individual accounts. Data security cannot be certified from static review alone.

## Scientific and commercial boundaries

The LBDD algorithm uses only one generated conformer and one alignment per ligand; SBDD currently provides candidate proximity features rather than complete validated interaction profiling. AutoDock Vina predicts docking poses but not experimentally confirmed binding affinity. **Do not publish conclusions without independent controls, parameter documentation, expert review and validation.**

Check upstream software licenses (especially Primer3), patents and other IP, dependency SBOM and attribution before distributing commercially. The app does not inherit Benchling's name, code, or enterprise security/compliance attestations.
