'use client';
import {useState} from 'react';
import type {StudentProfile} from '@/lib/types';
import {addProfile} from '@/lib/cloud';
export default function ProfileScreen({workspaceId,profiles,onChoose,onReload}:{workspaceId:string;profiles:StudentProfile[];onChoose:(p:StudentProfile)=>void;onReload:()=>Promise<void>}){
 const [name,setName]=useState('');const [error,setError]=useState('');
 async function add(){try{await addProfile(workspaceId,profiles,name||`Researcher ${profiles.length+1}`);setName('');await onReload();}catch(e){setError(e instanceof Error?e.message:'Profile creation failed');}}
 return <main className="hl-persona"><h1>Who is researching?</h1><p>Choose your personal workspace view</p>
 <div className="hl-persona-list">{profiles.map(p=><button key={p.id} onClick={()=>onChoose(p)}><span style={{background:p.color}}>{p.display_name.slice(0,2).toUpperCase()}</span><b>{p.display_name}</b></button>)}
 {profiles.length<5&&<button onClick={add} aria-label="Add a student profile"><span className="hl-add">+</span><b>Add profile</b></button>}</div>
 {profiles.length<5&&<input className="hl-profile-input" value={name} onChange={e=>setName(e.target.value)} placeholder="New profile name (optional)" maxLength={60}/>}
 <p className="hl-muted">Profiles share the same email login and permissions. They are not independently secured identities.</p>{error&&<p role="alert">{error}</p>}</main>;
}
