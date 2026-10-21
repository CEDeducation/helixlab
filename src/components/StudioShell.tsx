'use client';
import {useCallback,useEffect,useState} from 'react';
import {client,isConfigured} from '@/lib/supabase';
import {getProfiles,listWorkspaces} from '@/lib/cloud';
import type {LabWorkspace,StudentProfile} from '@/lib/types';
import AuthScreen from './AuthScreen';
import ProfileScreen from './ProfileScreen';
import ResearchLayout from './ResearchLayout';
import WorkspacePicker from './WorkspacePicker';
export default function StudioShell(){
 const [signedIn,setSignedIn]=useState(false);const [checking,setChecking]=useState(true);
 const [workspace,setWorkspace]=useState<LabWorkspace|null>(null);
 const [available,setAvailable]=useState<LabWorkspace[]>([]);
 const [chooseWorkspace,setChooseWorkspace]=useState(true);
 const [profiles,setProfiles]=useState<StudentProfile[]>([]);
 const [active,setActive]=useState<StudentProfile|null>(null);const [error,setError]=useState('');
 const reload=useCallback(async()=>{
   if(!isConfigured())return;
   try{
    const all=await listWorkspaces();setAvailable(all);
    if(workspace&&all.some(w=>w.id===workspace.id)){setProfiles(await getProfiles(workspace.id));}
    else if(all.length===1){setWorkspace(all[0]);setProfiles(await getProfiles(all[0].id));setChooseWorkspace(false);}
    else setChooseWorkspace(true);
    setError('');
   }
   catch(e){setError(e instanceof Error?e.message:'Unable to load the workspace.');}
 },[workspace]);
 useEffect(()=>{
   if(!isConfigured()){setChecking(false);return;}
   const db=client();
   db.auth.getUser().then(({data})=>{setSignedIn(Boolean(data.user));setChecking(false);});
   const {data:{subscription}}=db.auth.onAuthStateChange((_event,session)=>{
     setSignedIn(Boolean(session?.user));if(!session?.user){setActive(null);setWorkspace(null);}
   });return ()=>subscription.unsubscribe();
 },[]);
 useEffect(()=>{if(signedIn)void reload();},[signedIn,reload]);
 async function signOut(){await client().auth.signOut();setActive(null);setSignedIn(false);}
 if(checking)return <div className="hl-center">Loading HelixLab…</div>;
 if(!signedIn)return <AuthScreen onSignIn={()=>setSignedIn(true)}/>;
 if(error)return <div className="hl-center" role="alert">{error}<button className="primaryButton" onClick={()=>void reload()}>Retry</button></div>;
 if(chooseWorkspace||!workspace)return <WorkspacePicker workspaces={available} onPick={async ws=>{setWorkspace(ws);setProfiles(await getProfiles(ws.id));setActive(null);setChooseWorkspace(false);}}/>;
 if(!active)return <ProfileScreen workspaceId={workspace.id} profiles={profiles} onReload={reload} onChoose={setActive}/>;
 return <ResearchLayout workspace={workspace} profile={active} onChooseWorkspace={()=>{setChooseWorkspace(true);setActive(null);void reload();}} onChooseProfile={()=>setActive(null)} onSignOut={signOut}/>;
}
