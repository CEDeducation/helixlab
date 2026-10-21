import type {SequenceRecord} from './types';
import {validateDna} from './strict-dna';
export function asFasta(record:SequenceRecord):string {
  const dna=validateDna(record.sequence);
  const header=record.name.replace(/[\r\n>]/g,' ').trim()||'unnamed';
  return `>${header}\n${dna.match(/.{1,70}/g)?.join('\n')}\n`;
}
/** Export simple GenBank without inventing accession IDs or study metadata. */
export function asGenBank(record:SequenceRecord):string {
  const seq=validateDna(record.sequence);
  const locus=record.name.replace(/[^A-Za-z0-9_-]/g,'_').slice(0,16)||'HELIXLAB';
  const date=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).replace(/ /g,'-').toUpperCase();
  const head=`LOCUS       ${locus.padEnd(16)} ${String(seq.length).padStart(7)} bp    DNA     ${record.topology.toLowerCase().padEnd(8)} ${date}\nDEFINITION  HelixLab export; annotations retained as simple ranges.\nFEATURES             Location/Qualifiers\n`;
  const features=record.features.map(f=>{
    if(f.start<0||f.end>=seq.length||f.start>f.end) throw new Error('Invalid feature coordinates; export blocked.');
    const range=`${f.start+1}..${f.end+1}`;
    const loc=f.direction===-1?`complement(${range})`:range;
    return `     ${f.type.slice(0,15).padEnd(16)}${loc}\n                     /label="${f.name.replace(/["\r\n]/g,"'")}"\n`;
  }).join('');
  const origin=seq.toLowerCase().match(/.{1,60}/g)?.map((line,i)=>`${String(i*60+1).padStart(9)} ${line.match(/.{1,10}/g)?.join(' ')}`).join('\n');
  return `${head}${features}ORIGIN\n${origin}\n//\n`;
}
export function downloadString(name:string,contents:string,mime='text/plain'){
  const blob=new Blob([contents],{type:mime});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name.replace(/[^a-zA-Z0-9._-]/g,'_');a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
