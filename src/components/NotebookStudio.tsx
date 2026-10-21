'use client';
import {useEffect,useState} from 'react';
import {listRecords,saveRecord} from '@/lib/cloud';
import type {ScientificRecord} from '@/lib/types';
/** Notebook references scientific records by stable UUID, not screenshots. */
export default function NotebookStudio({workspaceId}:{workspaceId:string}){
 const [records,setRecords]=useState<ScientificRecord[]>([]);
 const [name,setName]=useState('Experiment notes');const [body,setBody]=useState('');
 const [linkId,setLinkId]=useState('');const [current,setCurrent]=useState('');const [error,setError]=useState('');
 async function refresh(){try{setRecords(await listRecords(workspaceId));}catch(e){setError(e instanceof Error?e.message:'Load failed');}}
 useEffect(()=>{void refresh();},[workspaceId]);
 const notebooks=records.filter(r=>r.type==='notebook');
 const scientific=records.filter(r=>r.type==='sequence'||r.type==='chemical'||r.type==='structure');
 function choose(item:ScientificRecord){setCurrent(item.id);setName(item.name);setBody(String(item.content.body||''));setLinkId(String(item.content.linkedRecord||''));}
 async function save(){
  try{
   setError('');await saveRecord(workspaceId,name||'Untitled experiment','notebook',{
    body,linkedRecord:linkId,method:'Manual researcher notes',source:'Researcher authored'
   },current||undefined);await refresh();
  }catch(e){setError(e instanceof Error?e.message:'Save failed');}
 }
 return <div className="pageBody"><div className="pageHeading"><div><span className="sectionEyebrow">RESEARCH NOTEBOOK</span><h1>Electronic Lab Notebook</h1><p>Experiment notes with persistent scientific-object references.</p></div><button className="primaryButton" onClick={()=>void save()}>Save notebook</button></div>
 <div className="hl-notebook"><aside className="surfaceCard hl-note-list"><h3>Experiments</h3><button className="ghostButton" onClick={()=>{setCurrent('');setName('New experiment');setBody('');setLinkId('');}}>+ New experiment</button>{notebooks.map(n=><button key={n.id} onClick={()=>choose(n)} className={current===n.id?'hl-selected':''}>▤ {n.name}</button>)}</aside>
 <div className="surfaceCard hl-note-editor"><label>Experiment title<input value={name} onChange={e=>setName(e.target.value)} maxLength={160}/></label><label>Research notes<textarea value={body} onChange={e=>setBody(e.target.value)} placeholder="Objective, method, observations, and results…" rows={14}/></label>
 <label>Link scientific object<select value={linkId} onChange={e=>setLinkId(e.target.value)}><option value="">No object linked</option>{scientific.map(r=><option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}</select></label>
 {linkId&&<div className="hl-linked">Linked record ID: <code>{linkId}</code><p>The link stays associated with the saved scientific record, even if its name changes.</p></div>}
 <p className="hl-muted">This notebook presently supports plain text and record references. TipTap rich-text embeds and simultaneous editing are not yet implemented.</p></div></div>
 {error&&<p className="hl-alert hl-error" role="alert">{error}</p>}</div>;
}
