import {NextRequest,NextResponse} from 'next/server';
import {createServerClient} from '@supabase/ssr';
import {cookies} from 'next/headers';

/** Private authenticated proxy; only predeclared scientific endpoints allowed. */
const routes:Record<string,string>={
 primers:'primers', 'pharmacophore-ligand':'pharmacophore/ligand',
 'pharmacophore-structure':'pharmacophore/structure',dock:'dock'
};
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:NextRequest,{params}:{params:Promise<{engine:string}>}){
 const {engine}=await params;
 const path=routes[engine];
 if(!path)return NextResponse.json({error:'Unknown engine.'},{status:404});
 const base=process.env.SCIENCE_SERVICE_URL,token=process.env.SCIENCE_SERVICE_SECRET;
 if(!base||!token||!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  return NextResponse.json({error:'Private scientific compute service is not configured.'},{status:503});
 const cookieStore=await cookies();
 const db=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{
  cookies:{getAll:()=>cookieStore.getAll(),setAll:()=>{}}
 });
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user)return NextResponse.json({error:'Sign in to run scientific analysis.'},{status:401});
 const max=engine==='dock'?2_600_000:engine==='pharmacophore-structure'?2_400_000:100_000;
 if(Number(request.headers.get('content-length')||0)>max)
  return NextResponse.json({error:'Scientific request exceeds size limit.'},{status:413});
 const body=await request.text();
 if(body.length>max)return NextResponse.json({error:'Scientific request exceeds size limit.'},{status:413});
 try{const parsed:unknown=JSON.parse(body);if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error();}
 catch{return NextResponse.json({error:'Invalid scientific JSON request.'},{status:400});}
 try{
  const upstream=await fetch(`${base.replace(/\/$/,'')}/v1/${path}`,{
   method:'POST',headers:{'Content-Type':'application/json','X-Helix-Token':token},
   body,cache:'no-store',signal:AbortSignal.timeout(engine==='dock'?115_000:45_000)
  });
  const text=await upstream.text();
  if(text.length>2_000_000)return NextResponse.json({error:'Response too large.'},{status:502});
  return new NextResponse(text,{status:upstream.status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Scientific compute service unavailable or timed out.'},{status:503});}
}
