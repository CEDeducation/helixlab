'use client';
import {useState} from 'react';
import dynamic from 'next/dynamic';
import {downloadResearch} from '@/lib/science-client';
const Viewer=dynamic(()=>import('./ProteinViewer'),{ssr:false});
export default function ProteinStudio(){
 const [content,setContent]=useState('');const [format,setFormat]=useState<'pdb'|'mmcif'>('pdb');
 const [name,setName]=useState('');const [error,setError]=useState('');
 async function open(file:File){
  setError('');if(file.size>5_000_000){setError('Protein structure must be under 5 MB.');return;}
  const suffix=file.name.toLowerCase();
  if(!/\.(pdb|ent|cif|mmcif)$/.test(suffix)){setError('Import PDB or mmCIF structures only.');return;}
  const text=await file.text();if(!text.trim()){setError('Empty structure file.');return;}
  const detected=/\.(cif|mmcif)$/.test(suffix)?'mmcif':'pdb';
  if(detected==='pdb'&&!/(^|\n)(ATOM  |HETATM|HEADER|MODEL )/.test(text)){
   setError('PDB text contains no recognized structural records.');return;
  }
  setContent(text);setFormat(detected);setName(file.name);
 }
 return <div className="pageBody"><div className="pageHeading"><div><span className="sectionEyebrow">STRUCTURAL BIOLOGY</span><h1>3D protein studio</h1><p>Mol* macromolecular visualization from your original PDB/mmCIF file.</p></div>
 <label className="ghostButton hl-upload">↑ Import protein<input type="file" accept=".pdb,.ent,.cif,.mmcif" onChange={e=>{const f=e.target.files?.[0];if(f)void open(f);}}/></label></div>
 {error&&<p className="hl-alert hl-error">{error}</p>}
 <section className="surfaceCard hl-panel"><div className="science-row"><h2>{name||'No protein loaded'}</h2>{content&&<button className="ghostButton" onClick={()=>downloadResearch(name||'structure.pdb',content,'text/plain')}>↓ Export original</button>}</div>
 {content?<Viewer contents={content} format={format}/>:<div className="science-empty">Upload your own .pdb or .cif to rotate, zoom and inspect a real molecular structure. No external data is fetched automatically.</div>}
 <p className="hl-muted">Structural visualization does not validate biological function, stereochemistry or experimental quality.</p></section></div>;
}
