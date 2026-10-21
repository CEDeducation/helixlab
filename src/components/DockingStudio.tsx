'use client';
import {useState} from 'react';
import {downloadResearch,runScience} from '@/lib/science-client';
type DockResult={poses_pdbqt:string;engine:string;version:string;settings:Record<string,unknown>;interpretation:string};
export default function DockingStudio(){
 const [receptor,setReceptor]=useState('');const [ligand,setLigand]=useState('');
 const [center,setCenter]=useState('0, 0, 0');const [size,setSize]=useState('20, 20, 20');
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 const [result,setResult]=useState<DockResult|null>(null);
 async function add(file:File,target:'receptor'|'ligand'){
  if(!file.name.toLowerCase().endsWith('.pdbqt')||file.size>(target==='receptor'?2_000_000:100_000)){
   setError('Only prepared PDBQT files within limits are supported.');return;
  }
  const value=await file.text();if(target==='receptor')setReceptor(value);else setLigand(value);
  setError('');
 }
 function triple(value:string):number[]{
  const result=value.split(',').map(s=>Number(s.trim()));
  if(result.length!==3||result.some(v=>!Number.isFinite(v)))throw Error('Provide three numeric X,Y,Z coordinates.');
  return result;
 }
 async function dock(){
  setBusy(true);setResult(null);setError('');
  try{const response=await runScience<DockResult>('dock',{
   receptor_pdbqt:receptor,ligand_pdbqt:ligand,center:triple(center),
   box_size:triple(size),seed:2026,exhaustiveness:4});setResult(response);
  }catch(e){setError(e instanceof Error?e.message:'Docking failed.');}
  finally{setBusy(false);}
 }
 return <div className="pageBody"><div className="pageHeading"><div><span className="sectionEyebrow">MOLECULAR DOCKING</span><h1>AutoDock Vina</h1><p>Computational docking with explicit grid, random seed, and prepared PDBQT structures.</p></div></div>
 <div className="hl-overview-grid"><section className="surfaceCard hl-panel"><h2>Docking setup</h2><div className="hl-form">
 <label>Prepared receptor PDBQT<input type="file" accept=".pdbqt" onChange={e=>{const f=e.target.files?.[0];if(f)void add(f,'receptor');}}/></label>
 <label>Prepared ligand PDBQT<input type="file" accept=".pdbqt" onChange={e=>{const f=e.target.files?.[0];if(f)void add(f,'ligand');}}/></label>
 <div className="science-grid"><label>Box center X,Y,Z (Å)<input value={center} onChange={e=>setCenter(e.target.value)}/></label><label>Dimensions X,Y,Z (Å)<input value={size} onChange={e=>setSize(e.target.value)}/></label></div>
 <p className="hl-muted">Requires correctly protonated, charged, hydrogenated and torsion-defined PDBQT inputs. Do not treat predicted docking scores as measured affinities.</p>
 <button className="primaryButton" disabled={busy||!receptor||!ligand} onClick={()=>void dock()}>{busy?'Running Vina…':'Run docking'}</button></div>{error&&<p role="alert" className="hl-alert hl-error">{error}</p>}</section>
 <section className="surfaceCard hl-panel"><h2>Predicted poses</h2>{result?<><p className="hl-muted">{result.engine} {result.version}. {result.interpretation}</p>
 <p className="hl-result">Search completed, returning a real Vina PDBQT pose ensemble.</p>
 <button className="ghostButton" onClick={()=>downloadResearch('vina-docked-poses.pdbqt',result.poses_pdbqt,'chemical/x-pdbqt')}>↓ Download predicted poses (.pdbqt)</button>
 <button className="ghostButton" onClick={()=>downloadResearch('vina-method.json',JSON.stringify(result.settings,null,2))}>↓ Download parameters</button></>:<p className="hl-muted">A private Vina worker must be installed. This interface never fabricates energies or docking poses.</p>}</section></div></div>;
}
