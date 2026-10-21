'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
const KetcherCanvas=dynamic(()=>import('./KetcherCanvas'),{ssr:false});
type MoleculeData={formula:string;exact_mass:number;molecular_weight:number;logp:number;tpsa:number;hbd:number;hba:number;rotatable_bonds:number;smiles:string;lipinski_violations:number;method:string;rdkit_version:string};
export default function ChemistryStudio(){
 const [smiles,setSmiles]=useState('CC(=O)Oc1ccccc1C(=O)O');
 const [result,setResult]=useState<MoleculeData|null>(null);
 const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);
 async function calculate(){
  setBusy(true);setResult(null);setMessage('');
  try{
   const response=await fetch('/api/science/molecule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({smiles})});
   const data=await response.json() as MoleculeData&{error?:string};
   if(!response.ok)throw new Error(data.error||`Engine returned HTTP ${response.status}`);
   setResult(data);
  }catch(e){setMessage(e instanceof Error?e.message:'Calculation failed.');}
  finally{setBusy(false);}
 }
 return <div className="pageBody"><div className="pageHeading"><div><span className="sectionEyebrow">COMPUTATIONAL CHEMISTRY</span><h1>Chemistry & pharmacophore lab</h1><p>RDKit molecular descriptors through an optional validated backend.</p></div></div>
 <KetcherCanvas onSmiles={setSmiles}/>
 <div className="hl-overview-grid"><section className="surfaceCard hl-panel"><h2>SMILES molecular properties</h2><div className="hl-form"><label>SMILES<input value={smiles} onChange={e=>setSmiles(e.target.value)} maxLength={5000}/></label><button className="primaryButton" disabled={busy||!smiles.trim()} onClick={()=>void calculate()}>{busy?'Calculating…':'Calculate using RDKit'}</button></div>
 {result&&<div className="hl-result"><p><b>Canonical SMILES</b> {result.smiles}</p><p><b>Formula</b> {result.formula}</p><p><b>Exact mass</b> {result.exact_mass} Da</p><p><b>Average molecular weight</b> {result.molecular_weight} g/mol</p><p><b>Crippen logP</b> {result.logp}</p><p><b>TPSA</b> {result.tpsa} Å²</p><p><b>H-bond donors / acceptors</b> {result.hbd} / {result.hba}</p><p><b>Rotatable bonds</b> {result.rotatable_bonds}</p><p><b>Lipinski violations</b> {result.lipinski_violations} (heuristic)</p><small>{result.method} · RDKit {result.rdkit_version}</small></div>}
 {message&&<p className="hl-alert hl-error" role="alert">{message}</p>}</section>
 <section className="surfaceCard hl-panel"><h2>Connected scientific tools</h2><p>Use the Ketcher editor above to draw a chemical structure and transfer SMILES to RDKit.</p><p className="hl-muted">The sidebar contains separate Primer3, Mol*, docking, and pharmacophore modules. Calculations require the configured private scientific compute service.</p></section></div></div>;
}
