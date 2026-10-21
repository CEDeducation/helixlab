/** Typed client for authenticated scientific services; never invent outputs. */
export async function runScience<T>(engine:string,input:Record<string,unknown>):Promise<T>{
 const response=await fetch(`/api/science/${engine}`,{method:'POST',
  headers:{'Content-Type':'application/json'},body:JSON.stringify(input),cache:'no-store'});
 const payload:unknown=await response.json();
 if(!response.ok){
  const message=payload&&typeof payload==='object'&&'detail' in payload?
   String(payload.detail):payload&&typeof payload==='object'&&'error' in payload?
   String(payload.error):`Scientific engine returned HTTP ${response.status}`;
  throw new Error(message);
 }
 return payload as T;
}
/** Download raw analysis output, including the scientific method and warnings. */
export function downloadResearch(name:string,contents:string,mime='application/json'){
 const url=URL.createObjectURL(new Blob([contents],{type:mime}));
 const element=document.createElement('a');element.href=url;element.download=name;
 document.body.appendChild(element);element.click();element.remove();
 setTimeout(()=>URL.revokeObjectURL(url),500);
}
