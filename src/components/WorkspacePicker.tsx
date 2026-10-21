'use client';
import type {LabWorkspace} from '@/lib/types';
export default function WorkspacePicker({workspaces,onPick}:{workspaces:LabWorkspace[];onPick:(w:LabWorkspace)=>void}){
 return <main className="hl-persona"><h1>Choose a research laboratory</h1><p>Workspaces are protected by Supabase membership and role permissions.</p>
 <div className="hl-workspace-options">{workspaces.map(w=><button className="surfaceCard" key={w.id} onClick={()=>onPick(w)}><b>▦ {w.name}</b><small>{w.id.slice(0,8)}…</small></button>)}</div>
 {!workspaces.length&&<p>No available workspaces. Contact your group owner or verify your email.</p>}</main>;
}
