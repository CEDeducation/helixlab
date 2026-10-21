import type { ParsedSequence,SequenceFeature } from './types';
import {parseOriginLines,validateDna} from './strict-dna';

/** Browser import accepts FASTA and simple GenBank locations only.
 * Complex GenBank joins require the independent Biopython service.
 * Never silently erase unsupported annotations or symbols. */
export function parseFasta(text:string):ParsedSequence[] {
  const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/);
  const result:ParsedSequence[]=[];
  let name='';let dna:string[]=[];
  function finish(){
    if(!name) return;
    const sequence=validateDna(dna.join('').replace(/\s+/g,''));
    result.push({name:name.slice(0,160),sequence,topology:'Linear',features:[],format:'FASTA',warnings:[]});
  }
  for(const line of lines){
    if(line.startsWith('>')){finish();name=line.slice(1).trim()||`Sequence ${result.length+1}`;dna=[];}
    else if(line.trim()){
      if(!name) throw new Error('FASTA content must begin with >header.');
      dna.push(line);
    }
  }
  finish();
  if(!result.length) throw new Error('No FASTA records found.');
  return result;
}
const palette=['#7257c7','#d56d82','#d8942f','#2f9d76','#4b8fb6'];
function parseFeatureLocation(raw:string,seqLength:number):[number,number,1|-1]{
  const reverse=raw.startsWith('complement(');
  const inner=reverse?raw.slice(11,-1):raw;
  const match=inner.match(/^(\d+)\.\.(\d+)$/);
  if(!match) throw new Error(`Unsupported GenBank feature location ${raw}; requires full Biopython parser.`);
  const start=Number(match[1]),end=Number(match[2]);
  if(start<1||end>seqLength||start>end) throw new Error(`Invalid GenBank feature location ${raw}.`);
  return [start-1,end-1,reverse?-1:1];
}
export function parseSimpleGenBank(text:string):ParsedSequence[] {
  const chunks=text.split(/\/\/\s*(?:\r?\n|$)/).filter(s=>s.trim());
  const results:ParsedSequence[]=[];
  for(const chunk of chunks){
    const match=chunk.match(/^LOCUS\s+(\S+).*$/m);
    const origin=chunk.match(/^ORIGIN\s*\n([\s\S]*)$/m);
    if(!match||!origin) throw new Error('Malformed GenBank: LOCUS or ORIGIN missing.');
    const sequence=parseOriginLines(origin[1]);
    const header=match[0];
    const name=match[1].slice(0,160);
    const topology=/\bcircular\b/i.test(header)?'Circular':'Linear';
    const annotation=chunk.match(/^FEATURES\s+Location\/Qualifiers\s*\n([\s\S]*?)(?=^ORIGIN)/m);
    const features:SequenceFeature[]=[];
    if(annotation){
      for(const line of annotation[1].split(/\r?\n/)){
        const entry=line.match(/^\s{5}(\S+)\s+(.+?)\s*$/);
        if(entry){
          if(entry[1]==='source') continue;
          const [start,end,direction]=parseFeatureLocation(entry[2],sequence.length);
          features.push({id:crypto.randomUUID(),name:entry[1],type:entry[1],start,end,direction,color:palette[features.length%palette.length]});
        }else {
          const label=line.match(/^\s+\/(?:label|gene|product)="([^"]+)"/);
          if(label&&features.length) features[features.length-1].name=label[1].slice(0,160);
          else if(line.trim()&&!/^\s+\//.test(line)) throw new Error('Unsupported multiline GenBank annotation; use the full parser.');
        }
      }
    }
    results.push({name,sequence,topology,features,format:'GenBank',warnings:[]});
  }
  if(!results.length) throw new Error('No GenBank records found.');
  return results;
}
export function parseSequenceUpload(name:string,text:string):ParsedSequence[]{
  if(text.length>5_000_000) throw new Error('Text exceeds browser import limit (5 MB).');
  if(/\.(fasta|fa|fna|fas)$/i.test(name)) return parseFasta(text);
  if(/\.(gb|gbk|genbank)$/i.test(name)) return parseSimpleGenBank(text);
  if(/\.(txt|dna)$/i.test(name)) return [{name:name.slice(0,160),sequence:validateDna(text.replace(/\s+/g,'')),features:[],topology:'Linear',format:'DNA',warnings:[]}];
  throw new Error('Unsupported file type. Sequence files: FASTA, GenBank or TXT.');
}
