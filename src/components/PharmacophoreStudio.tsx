'use client';
import {useState} from 'react';
import {downloadResearch,runScience} from '@/lib/science-client';

type Feature={type:string;xyz_angstrom:number[];support_count?:number;nearby_protein_atoms?:{residue:string;atom:string;distance_angstrom:number}[]};
type PharmaResult={features:Feature[];status:string;method:string;warning:string;rdkit_version:string;aligned_molblocks?:string[];alignment_rmsd_angstrom?:number[];interpretation?:string};
export default function PharmacophoreStudio(){
 const [mode,setMode]=useState<'ligand'|'structure'>('ligand');
 const [smiles,setSmiles]=useState('CCO\nCCCO');
 const [protein,setProtein]=useState('');const [sdf,setSdf]=useState('');
 const [result,setResult]=useState<PharmaResult|null>(null);
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function upload(file:File,kind:'protein'|'ligand'){
  if(file.size>(kind==='protein'?2_000_000:300_000)){setMessage('File exceeds size limit.');return;}
  if(kind==='protein')setProtein(await file.text());else setSdf(await file.text());
  setMessage(`${kind} input loaded. Run analysis to compute features.`);
 }
 async function calculate(){
  setBusy(true);setResult(null);setMessage('');
  try{
   const data=mode==='ligand'?
    await runScience<PharmaResult>('pharmacophore-ligand',{smiles:smiles.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),radius:1.5,support:.67}):
    await runScience<PharmaResult>('pharmacophore-structure',{protein_pdb:protein,ligand_sdf:sdf,cutoff:4});
   setResult(data);
  }catch(e){setMessage(e instanceof Error?e.message:'Pharmacophore engine failed.');}
  finally{setBusy(false);}
 }
 return <div className="pageBody"><div className="pageHeading"><div><span className="sectionEyebrow">PHARMACOPHORE MODELING</span><h1>Structure- and ligand-based pharmacophores</h1><p>RDKit-generated coordinate hypotheses, with uncertainty and engine provenance.</p></div></div>
 <div className="hl-tabbar"><button className={mode==='ligand'?'active':''} onClick={()=>{setMode('ligand');setResult(null);}}>Ligand-based (LBDD)</button><button className={mode==='structure'?'active':''} onClick={()=>{setMode('structure');setResult(null);}}>Structure-based (SBDD)</button></div>
 <div className="hl-overview-grid"><section className="surfaceCard hl-panel"><h2>{mode==='ligand'?'Ligands and shared scaffold':'Protein–ligand complex'}</h2>
 {mode==='ligand'?<div className="hl-form"><label>2–12 related SMILES (one per line)<textarea className="science-textarea" value={smiles} spellCheck={false} onChange={e=>setSmiles(e.target.value)} /></label><p className="hl-muted">RDKit embeds 3D coordinates, aligns a shared core, and clusters supported chemical features. Unrelated ligands can be rejected.</p></div>:
 <div className="hl-form"><label>Protein PDB<input type="file" accept=".pdb,.ent" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,'protein');}}/></label><label>Bound ligand SDF (with 3D coordinates)<input type="file" accept=".sdf,.mol" onChange={e=>{const f=e.target.files?.[0];if(f)void upload(f,'ligand');}}/></label><p className="hl-muted">This calculates feature-to-protein proximity. It does not claim validated hydrogen-bond angles, protonation or binding affinity.</p></div>}
 <button className="primaryButton" disabled={busy||mode==='structure'&&(!protein||!sdf)} onClick={()=>void calculate()}>{busy?'Computing…':'Compute pharmacophore'}</button>
 {message&&<p className="hl-alert hl-error" role="alert">{message}</p>}</section>
 <section className="surfaceCard hl-panel"><div className="science-row"><h2>3D feature coordinates</h2>{result&&<button className="ghostButton" onClick={()=>downloadResearch(`pharmacophore-${mode}.json`,JSON.stringify(result,null,2))}>↓ Export JSON</button>}</div>
 {result?<><p className="hl-muted">{result.method} · RDKit {result.rdkit_version} · {result.status}</p><p className="hl-alert">{result.warning}</p>
 <div className="science-result-list">{result.features.slice(0,100).map((feat,i)=><div className="science-result" key={i}><strong>{feat.type}</strong><code>{feat.xyz_angstrom.map(v=>v.toFixed(2)).join(', ')} Å</code><small>{feat.support_count?`${feat.support_count} ligand(s)`: `${feat.nearby_protein_atoms?.length||0} nearby atoms`}</small></div>)}</div>
 {!result.features.length&&<p>No qualifying features detected under these settings.</p>}
 {result.alignment_rmsd_angstrom&&<p className="hl-muted">Aligned core RMSD (Å): {result.alignment_rmsd_angstrom.join(', ')}</p>}
 {result.aligned_molblocks&&<button className="ghostButton" onClick={()=>downloadResearch('aligned-ligands.sdf',result.aligned_molblocks!.map(s=>s+'\n$$$$\n').join(''),'chemical/x-mdl-sdfile')}>↓ Export aligned SDF</button>}</>:<p className="hl-muted">Run the engine to produce calculated molecular features. There are no pre-generated or mock coordinates.</p>}</section></div></div>;
}
