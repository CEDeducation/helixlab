'use client';
import {useEffect,useState} from 'react';
import CircularSequenceMap from './CircularSequenceMap';
import type {ParsedSequence,ScientificRecord,SequenceFeature,SequenceRecord} from '@/lib/types';
import {parseSequenceUpload} from '@/lib/imports';
import {asFasta,asGenBank,downloadString} from '@/lib/exports';
import {validateDna,gcKnownBases} from '@/lib/strict-dna';
import {restrictionSites,translateDna,reverseComplement,digestFragments} from '@/lib/sequence';
import {archiveOriginal,listRecords,saveRecord} from '@/lib/cloud';
const palette=['#7257c7','#d56d82','#d8942f','#2f9d76','#4b8fb6'];
function asSequence(r:ScientificRecord):SequenceRecord {
 const content=r.content;
 return {id:r.id,name:r.name,sequence:String(content.sequence||''),topology:content.topology==='Circular'?'Circular':'Linear',
 features:(Array.isArray(content.features)?content.features:[]) as SequenceFeature[],primers:[]};
}
export default function DnaStudio({workspaceId}:{workspaceId:string}){
 const [records,setRecords]=useState<ScientificRecord[]>([]);const [selected,setSelected]=useState('');
 const [error,setError]=useState('');const [notice,setNotice]=useState('');
 const [draft,setDraft]=useState('');const [name,setName]=useState('');
 const [features,setFeatures]=useState<SequenceFeature[]>([]);
 const [topology,setTopology]=useState<'Circular'|'Linear'>('Circular');
 const [rotation,setRotation]=useState(0);const [zoom,setZoom]=useState(1);
 const [selectedFeatureId,setSelectedFeatureId]=useState('');const [showRestriction,setShowRestriction]=useState(true);
 const [mode,setMode]=useState<'map'|'enzymes'|'translation'>('map');
 async function refresh(){try{const all=(await listRecords(workspaceId)).filter(r=>r.type==='sequence');setRecords(all);if(!selected&&all.length)setSelected(all[0].id);}catch(e){setError(e instanceof Error?e.message:'Load failed.');}}
 useEffect(()=>{void refresh();},[workspaceId]); // refresh on workspace selection
 useEffect(()=>{
  const r=records.find(x=>x.id===selected);
  if(!r)return;const item=asSequence(r);setName(item.name);setDraft(item.sequence);
  setFeatures(item.features);setTopology(item.topology);
 },[records,selected]);
 const current=records.find(r=>r.id===selected);
 const valid=(()=>{try{return validateDna(draft);}catch{return '';}})();
 const model:SequenceRecord={id:selected,name:name||'Untitled plasmid',sequence:valid,features,topology,primers:[]};
 const siteData=valid?restrictionSites(valid,topology==='Circular'):[];
 async function save(){
  try{
   setError('');const sequence=validateDna(draft);
   for(const f of features){
     if(!Number.isInteger(f.start)||!Number.isInteger(f.end)||f.start<0||f.end>=sequence.length||f.start>f.end)
       throw new Error(`Invalid feature coordinates for ${f.name}; save cancelled.`);
   }
   const nextId=await saveRecord(workspaceId,name||'Untitled DNA','sequence',{sequence,topology,features},selected||undefined);
   setSelected(nextId);setNotice('Saved scientific record');await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Could not save.');}
 }
 async function importFile(file:File){
  try{
   setError('');setNotice('');if(file.size>5_000_000)throw Error('Max 5 MB import file.');
   const text=await file.text();const imported=parseSequenceUpload(file.name,text);
   // Do not persist a partial batch if any record cannot be parsed.
   for(const item of imported)validateDna(item.sequence);
   const created:string[]=[];
   for(const item of imported){
    const id=await saveRecord(workspaceId,item.name,'sequence',{sequence:item.sequence,topology:item.topology,features:item.features,format:item.format});
    created.push(id);
   }
   // Archive raw input unchanged once; report archive failure instead of hiding it.
   if(created.length)await archiveOriginal(workspaceId,created[0],file);
   if(created[0])setSelected(created[0]);setNotice(`${imported.length} sequence(s) imported; original file archived.`);await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Import failed.');}
 }
 function newRecord(){setSelected('');setName('Untitled plasmid');setDraft('');setFeatures([]);setTopology('Circular');setSelectedFeatureId('');}
 function exportFile(format:'FASTA'|'GenBank'){
  try{
   if(!model.sequence)throw Error('Cannot export invalid DNA.');
   downloadString(`${model.name}.${format==='FASTA'?'fasta':'gb'}`,format==='FASTA'?asFasta(model):asGenBank(model));
  }catch(e){setError(e instanceof Error?e.message:'Export failed.');}
 }
 function addFeature(){
  if(!valid)return setError('Enter valid DNA before annotating.');
  const start=0,end=Math.min(valid.length-1,99);
  const item:SequenceFeature={id:crypto.randomUUID(),name:'New feature',type:'misc_feature',start,end,direction:1,color:palette[features.length%palette.length]};
  setFeatures([...features,item]);setSelectedFeatureId(item.id);
 }
 function patchFeature(key:string,value:string){
  setFeatures(prev=>prev.map(f=>f.id===selectedFeatureId?{...f,[key]:key==='start'||key==='end'?Number(value):value}:f));
 }
 const picked=features.find(f=>f.id===selectedFeatureId);
 const cuts=siteData.flatMap(s=>s.matches.filter(m=>m.cutTop!==null).map(m=>m.cutTop!));
 return <div className="hl-dna-page"><div className="pageHeading hl-dna-heading"><div><span className="sectionEyebrow">MOLECULAR BIOLOGY</span><h1>DNA & Plasmids</h1><p>Original OpenLab circular viewer · validated sequence import/export</p></div>
 <div className="hl-actions"><button className="ghostButton" onClick={newRecord}>+ New</button><label className="ghostButton hl-upload">↑ Import<input type="file" accept=".fasta,.fa,.fna,.fas,.gb,.gbk,.genbank,.txt,.dna" onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f);e.currentTarget.value='';}}/></label><button className="primaryButton" onClick={()=>void save()}>Save record</button></div></div>
 <div className="hl-editor-grid"><section className="surfaceCard hl-library"><h3>Research library</h3>{records.map(r=><button key={r.id} className={selected===r.id?'hl-selected':''} onClick={()=>setSelected(r.id)}>◎ <span>{r.name}</span><small>{String(r.content.sequence||'').length} bp</small></button>)}{!records.length&&<p>No sequences saved yet. Import or create one.</p>}</section>
 <section className="surfaceCard hl-map-editor"><div className="hl-editor-head"><input aria-label="Sequence name" value={name} onChange={e=>setName(e.target.value)} placeholder="Sequence name"/><span>{valid.length.toLocaleString()} bp · {valid?gcKnownBases(valid).toFixed(1):'0.0'}% known GC</span></div>
 <div className="hl-tabbar"><button className={mode==='map'?'active':''} onClick={()=>setMode('map')}>Plasmid map</button><button className={mode==='enzymes'?'active':''} onClick={()=>setMode('enzymes')}>Restriction digest</button><button className={mode==='translation'?'active':''} onClick={()=>setMode('translation')}>Translation</button></div>
 {mode==='map'?<><div className="hl-map-toolbar"><label>Topology <select value={topology} onChange={e=>setTopology(e.target.value as 'Circular'|'Linear')}><option>Circular</option><option>Linear</option></select></label><button onClick={()=>setRotation(0)}>Reset</button><button onClick={()=>setZoom(z=>Math.max(.6,z-.1))}>−</button><button onClick={()=>setZoom(z=>Math.min(2,z+.1))}>+</button><label><input type="checkbox" checked={showRestriction} onChange={e=>setShowRestriction(e.target.checked)}/> Enzymes</label></div>
 <CircularSequenceMap record={model} selectedFeatureId={selectedFeatureId} onSelectFeature={setSelectedFeatureId} rotation={rotation} onRotationChange={setRotation} zoom={zoom} onZoomChange={setZoom} showRestrictionSites={showRestriction}/></>:
 mode==='enzymes'?<div className="hl-analysis"><h3>Observed recognition motifs & predicted fragments</h3>{siteData.map(s=><p key={s.name}><strong>{s.name}</strong> · {s.matches.length} site(s), {s.matches.map(m=>m.position+1).join(', ')}</p>)}<p><strong>Predicted lengths:</strong> {digestFragments(valid.length,cuts,topology==='Circular').join(', ')} bp</p><small>Computed cuts, not an experimental gel or methylation-aware digest simulation.</small></div>:
 <div className="hl-analysis"><h3>Forward-frame translation</h3><code>{valid?translateDna(valid,0,1):'Enter valid DNA'}</code><p className="hl-muted">Table 1; frame +1. Not a gene or ORF call.</p></div>}
 <div className="hl-sequence-input"><label>DNA sequence (IUPAC)</label><textarea value={draft} onChange={e=>setDraft(e.target.value.toUpperCase())} placeholder="ATGCGT…" spellCheck={false}/></div>
 <div className="hl-export"><button className="ghostButton" onClick={()=>exportFile('FASTA')}>↓ Export FASTA</button><button className="ghostButton" onClick={()=>exportFile('GenBank')}>↓ Export GenBank</button><button className="ghostButton" onClick={()=>(()=>{
    const n=valid.length;
    setDraft(reverseComplement(valid));
    setFeatures(items=>items.map(f=>({...f,start:n-1-f.end,end:n-1-f.start,direction:f.direction===1?-1:1})));
   })()} disabled={!valid}>Reverse complement</button></div></section>
 <aside className="surfaceCard hl-inspector"><h3>Feature inspector</h3><button className="ghostButton" disabled={!valid} onClick={addFeature}>+ Add annotation</button>{picked?<div className="hl-form"><label>Label<input value={picked.name} onChange={e=>patchFeature('name',e.target.value)} /></label><label>Start (0-based)<input type="number" value={picked.start} min={0} max={valid.length-1} onChange={e=>patchFeature('start',e.target.value)}/></label><label>End (inclusive)<input type="number" value={picked.end} min={0} max={valid.length-1} onChange={e=>patchFeature('end',e.target.value)}/></label><label>Strand<select value={picked.direction} onChange={e=>setFeatures(old=>old.map(f=>f.id===picked.id?{...f,direction:Number(e.target.value) as 1|-1}:f))}><option value="1">Forward</option><option value="-1">Reverse</option></select></label><button onClick={()=>{setFeatures(fs=>fs.filter(f=>f.id!==picked.id));setSelectedFeatureId('');}}>Remove</button></div>:<p>Select an annotation on the map or add a new one.</p>}
 <p className="hl-muted">Coordinates are 0-based, inclusive internally. GenBank export uses 1-based coordinates.</p></aside></div>
 {notice&&<p className="hl-alert" role="status">{notice}</p>}{error&&<p className="hl-alert hl-error" role="alert">{error}</p>}</div>;
}
