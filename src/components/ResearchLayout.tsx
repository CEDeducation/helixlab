'use client';
import {useState} from 'react';
import type {LabWorkspace,StudentProfile} from '@/lib/types';
import DnaStudio from './DnaStudio';
import NotebookStudio from './NotebookStudio';
import GroupStudio from './GroupStudio';
import ChemistryStudio from './ChemistryStudio';
import Overview from './Overview';
import PrimerStudio from './PrimerStudio';
import ProteinStudio from './ProteinStudio';
import PharmacophoreStudio from './PharmacophoreStudio';
import DockingStudio from './DockingStudio';
type Tab='overview'|'dna'|'notebook'|'group'|'chemistry'|'primers'|'protein'|'pharmacophore'|'docking';
const nav:{id:Tab;title:string;icon:string}[]=[
 {id:'overview',title:'Research overview',icon:'▦'},
 {id:'dna',title:'DNA & plasmids',icon:'◎'},
 {id:'chemistry',title:'Molecule editor & RDKit',icon:'⬡'},
 {id:'primers',title:'Primer3 designer',icon:'◉'},
 {id:'protein',title:'3D protein viewer',icon:'◈'},
 {id:'pharmacophore',title:'Pharmacophore modeling',icon:'✧'},
 {id:'docking',title:'Vina docking',icon:'⌁'},
 {id:'notebook',title:'Lab notebook',icon:'▤'},
 {id:'group',title:'Group collaboration',icon:'♧'}
];
export default function ResearchLayout({workspace,profile,onChooseProfile,onChooseWorkspace,onSignOut}:{workspace:LabWorkspace;profile:StudentProfile;onChooseProfile:()=>void;onChooseWorkspace:()=>void;onSignOut:()=>Promise<void>}){
 const [tab,setTab]=useState<Tab>('overview');
 const navigate=(to:Tab)=>setTab(to);
 const heading=nav.find(n=>n.id===tab)?.title||'Research';
 return <div className="shell"><aside className="sidebar"><div className="brand"><div className="brandMark">HL</div><div><strong>HelixLab</strong><span>Research workspace</span></div></div>
 <button className="workspaceSwitcher" onClick={onChooseProfile}><div className="avatar" style={{background:profile.color,color:'#fff'}}>{profile.display_name.slice(0,2).toUpperCase()}</div><div><strong>{workspace.name}</strong><span>{profile.display_name}</span></div><span>⌄</span></button>
 <nav className="nav" aria-label="Scientific navigation"><span className="navLabel">WORKSPACES</span>{nav.map(n=><button key={n.id} onClick={()=>navigate(n.id)} className={`navItem hl-nav ${tab===n.id?'active':''}`}><span className="hl-nav-icon">{n.icon}</span><span>{n.title}</span></button>)}</nav>
 <div className="sidebarBottom"><button className="ghostButton" onClick={onChooseWorkspace}>Switch lab</button><div className="sandboxBadge">◉ <span>Private Supabase workspace</span><b>RLS required</b></div><button className="ghostButton" onClick={()=>void onSignOut()}>Sign out</button></div></aside>
 <div className="main"><header className="topbar"><div className="topbarContext"><span>HelixLab</span><b>/</b><strong>{heading}</strong></div><div className="hl-search-subtitle">Scientific tools & shared records</div><div className="topActions"><span className="securityPill">Private workspace</span><button className="topAvatar" onClick={onChooseProfile} style={{background:profile.color}} title="Switch student profile">{profile.display_name.slice(0,2).toUpperCase()}</button></div></header>
 <main className="content">{tab==='overview'?<Overview navigate={navigate}/>:
 tab==='dna'?<DnaStudio workspaceId={workspace.id}/>:
 tab==='notebook'?<NotebookStudio workspaceId={workspace.id}/>:
 tab==='group'?<GroupStudio workspaceId={workspace.id} onInviteAccepted={onChooseWorkspace}/>:tab==='primers'?<PrimerStudio/>:
 tab==='protein'?<ProteinStudio/>:tab==='pharmacophore'?<PharmacophoreStudio/>:
 tab==='docking'?<DockingStudio/>:<ChemistryStudio/>}</main></div></div>;
}
