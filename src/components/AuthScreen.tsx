'use client';
import {useState} from 'react';
import {client,isConfigured} from '@/lib/supabase';
export default function AuthScreen({onSignIn}:{onSignIn:()=>void}){
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');
  const [register,setRegister]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError('');
    try{
      if(!isConfigured())throw new Error('Supabase is not configured. Use .env.example and Vercel environment variables.');
      const db=client();
      if(register){
        const {error}=await db.auth.signUp({email,password});if(error)throw error;
        setError('Check your email to verify the account before signing in.');
      }else{
        const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;
        onSignIn();
      }
    }catch(err){setError(err instanceof Error?err.message:'Authentication failed.');}
    finally{setBusy(false);}
  }
  return <div className="hl-auth"><div className="hl-auth-card">
    <div className="brandMark">HL</div><h1>HelixLab Research</h1>
    <p>Scientific workspaces built for research teams, using the original OpenLab UI foundation.</p>
    <form onSubmit={submit} className="hl-form">
      <label>Email<input type="email" autoComplete="email" value={email} required onChange={e=>setEmail(e.target.value)}/></label>
      <label>Password<input type="password" autoComplete={register?'new-password':'current-password'} minLength={8} value={password} required onChange={e=>setPassword(e.target.value)}/></label>
      <button className="primaryButton" disabled={busy||!isConfigured()}>{busy?'Working…':register?'Create account':'Sign in'}</button>
    </form>
    {error&&<p role="status" className="hl-note">{error}</p>}
    <button className="hl-link" onClick={()=>{setRegister(!register);setError('');}}>{register?'Already have an account? Sign in':'Create a new account'}</button>
    <p className="hl-muted">Up to five visual student profiles per account. Group collaborators should sign in with separate accounts.</p>
  </div></div>;
}
