'use client';
import {useEffect,useRef,useState} from 'react';

type Format='pdb'|'mmcif';
export default function ProteinViewer({contents,format}:{contents:string;format:Format}){
 const host=useRef<HTMLDivElement|null>(null);
 const [error,setError]=useState('');const [loading,setLoading]=useState(false);
 useEffect(()=>{
  if(!contents||!host.current)return;
  let cancelled=false;
  let cleanup:(()=>void)|undefined;
  setLoading(true);setError('');
  async function load(){
   try{
    const {Viewer}=await import('molstar/lib/apps/viewer/app');
    if(cancelled||!host.current)return;
    host.current.innerHTML='';
    const viewer=await Viewer.create(host.current,{
     layoutIsExpanded:false,layoutShowControls:true,layoutShowSequence:true,
     layoutShowLog:false,viewportShowAnimation:true
    });
    if(cancelled){viewer.plugin.dispose();return;}
    cleanup=()=>viewer.plugin.dispose();
    await viewer.loadStructureFromData(contents,format);
   }catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Mol* could not load this structure.');}
   finally{if(!cancelled)setLoading(false);}
  }
  void load();
  return ()=>{cancelled=true;cleanup?.();};
 },[contents,format]);
 return <div className="science-molstar-wrap">
  {loading&&<p className="hl-muted">Loading Mol* 3D structure…</p>}
  {error&&<p role="alert" className="hl-alert hl-error">{error}</p>}
  <div className="science-molstar" ref={host} aria-label="Interactive macromolecular viewer"/>
 </div>;
}
