'use client';
import {useEffect,useState} from 'react';
import {acceptInvite,inviteCollaborator,listMembers} from '@/lib/cloud';
import type {LabMember} from '@/lib/types';
export default function GroupStudio({workspaceId,onInviteAccepted}:{workspaceId:string;onInviteAccepted:()=>void}){
 const [members,setMembers]=useState<LabMember[]>([]);const [email,setEmail]=useState('');
 const [role,setRole]=useState<'editor'|'viewer'>('editor');
 const [inviteId,setInviteId]=useState('');const [status,setStatus]=useState('');const [error,setError]=useState('');
 async function refresh(){try{setMembers(await listMembers(workspaceId));}catch(e){setError(e instanceof Error?e.message:'Members load failed');}}
 useEffect(()=>{void refresh();},[workspaceId]);
 async function invite(){try{setError('');const id=await inviteCollaborator(workspaceId,email,role);setStatus(`Invitation created. Securely share this invitation UUID with ${email}: ${id}. Automated email delivery is not configured.`);setEmail('');}catch(e){setError(e instanceof Error?e.message:'Invite failed');}}
 async function accept(){try{setError('');await acceptInvite(inviteId.trim());setStatus('Invite accepted. Opening workspace selector.');await refresh();onInviteAccepted();}catch(e){setError(e instanceof Error?e.message:'Could not accept invite');}}
 return <div className="pageBody"><div className="pageHeading"><div><span className="sectionEyebrow">COLLABORATION</span><h1>Research group</h1><p>Separate authenticated identities with role-based access to shared scientific records.</p></div></div>
 <div className="hl-overview-grid"><section className="surfaceCard hl-panel"><h2>Members ({members.length}/5)</h2>{members.map(m=><p key={m.user_id} className="hl-member"><b>{m.user_id.slice(0,8)}…</b><span>{m.role}</span></p>)}<p className="hl-muted">Owners and editors can modify records. Viewers can read shared records.</p></section>
 <section className="surfaceCard hl-panel"><h2>Invite a collaborator</h2><div className="hl-form"><label>Verified email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@university.edu"/></label><label>Role<select value={role} onChange={e=>setRole(e.target.value as 'editor'|'viewer')}><option value="editor">Editor</option><option value="viewer">Viewer</option></select></label><button className="primaryButton" onClick={()=>void invite()} disabled={!email.includes('@')}>Create invitation</button></div></section>
 <section className="surfaceCard hl-panel"><h2>Accept an invitation</h2><div className="hl-form"><label>Invite UUID<input value={inviteId} onChange={e=>setInviteId(e.target.value)} placeholder="Paste invitation identifier"/></label><button className="ghostButton" onClick={()=>void accept()} disabled={!inviteId}>Accept invite</button></div></section></div>
 {status&&<p className="hl-alert" role="status">{status}</p>}{error&&<p className="hl-alert hl-error" role="alert">{error}</p>}</div>;
}
