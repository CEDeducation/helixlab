'use client';
import {useMemo,useRef,useState} from 'react';
import {Editor} from 'ketcher-react';
import {StandaloneStructServiceProvider} from 'ketcher-standalone';
import {downloadResearch} from '@/lib/science-client';

type KetcherBridge={getSmiles:(extended?:boolean)=>Promise<string>;
 getMolfile:(format?:'v2000'|'v3000')=>Promise<string>;
 setMolecule:(text:string)=>Promise<void>};
export default function KetcherCanvas({onSmiles}:{onSmiles:(s:string)=>void}){
 const service=useMemo(()=>new StandaloneStructServiceProvider(),[]);
 const editor=useRef<KetcherBridge|null>(null);const [smiles,setSmiles]=useState('');
 const [message,setMessage]=useState('');const [importText,setImportText]=useState('');
 async function capture(){
  try{if(!editor.current)throw Error('Chemical editor is initializing.');
   const value=await editor.current.getSmiles();if(!value)throw Error('Draw a molecule first.');
   setSmiles(value);onSmiles(value);setMessage('Structure transferred to RDKit input.');
  }catch(e){setMessage(e instanceof Error?e.message:'Cannot read molecule.');}
 }
 async function exportMol(){try{if(!editor.current)throw Error('Editor initializing.');
  downloadResearch('molecule.mol',await editor.current.getMolfile('v2000'),'chemical/x-mdl-molfile');
 }catch(e){setMessage(e instanceof Error?e.message:'Export failed.');}}
 async function load(){try{if(!editor.current)throw Error('Editor initializing.');
  if(!importText.trim()||importText.length>100000)throw Error('Provide a valid, reasonably sized MOL/SMILES.');
  await editor.current.setMolecule(importText);setMessage('Structure loaded into Ketcher.');
 }catch(e){setMessage(e instanceof Error?e.message:'Could not import structure.');}}
 return <section className="surfaceCard hl-panel science-wide"><div className="science-row"><div><h2>Ketcher molecular sketcher</h2><p className="hl-muted">Full atom/bond editing from EPAM Ketcher, using its standalone WASM engine.</p></div><div className="hl-actions"><button className="ghostButton" onClick={()=>void capture()}>Use molecule in analysis</button><button className="ghostButton" onClick={()=>void exportMol()}>↓ MOL export</button></div></div>
 <div className="science-ketcher"><Editor staticResourcesUrl="/ketcher-assets" structServiceProvider={service} onInit={instance=>{editor.current=instance;}}/></div>
 <div className="science-row"><input aria-label="Paste SMILES or MOL" value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Paste SMILES or MOL to load"/><button className="ghostButton" onClick={()=>void load()}>Load</button>
 <label className="ghostButton hl-upload">↑ MOL file<input type="file" accept=".mol,.sdf,.smi,.smiles" onChange={async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>100000){setMessage('File exceeds 100 KB');return;}setImportText(await file.text());}}/></label></div>
 {smiles&&<p className="hl-muted">Last extracted SMILES: <code>{smiles}</code></p>}{message&&<p className="hl-muted" role="status">{message}</p>}</section>;
}
