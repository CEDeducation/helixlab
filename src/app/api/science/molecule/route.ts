import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';
export const dynamic='force-dynamic';
/** Protected server-only proxy. Backend secret is never exposed to the browser. */
export async function POST(request:NextRequest){
 const url=process.env.SCIENCE_SERVICE_URL;
 const secret=process.env.SCIENCE_SERVICE_SECRET;
 if(!url||!secret)return NextResponse.json({error:'Scientific calculation service is not configured.'},{status:503});
 if(Number(request.headers.get('content-length')||0)>10_000)return NextResponse.json({error:'Request too large'},{status:413});
 const cookieStore=await cookies();
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{
  cookies:{getAll(){return cookieStore.getAll()},setAll(){} }
 });
 const {data:{user},error}=await supabase.auth.getUser();
 if(error||!user)return NextResponse.json({error:'Authentication required.'},{status:401});
 let data:unknown;
 try{data=await request.json();}catch{return NextResponse.json({error:'Malformed JSON'},{status:400});}
 if(!data||typeof data!=='object'||typeof (data as {smiles?:unknown}).smiles!=='string'||(data as {smiles:string}).smiles.length>5000){
  return NextResponse.json({error:'SMILES input is invalid or too long'},{status:400});
 }
 try{
  const response=await fetch(`${url.replace(/\/$/,'')}/v1/molecule`,{
   method:'POST',headers:{'Content-Type':'application/json','X-Helix-Token':secret},
   body:JSON.stringify(data),signal:AbortSignal.timeout(20000),cache:'no-store'
  });
  const payload=await response.json();
  return NextResponse.json(payload,{status:response.status,headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Scientific service unavailable.'},{status:503});}
}
