/** Exercise the actual TypeScript scientific modules, not separately reimplemented mock logic. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
const require=createRequire(import.meta.url);
const typescript=require('typescript');
require.extensions['.ts']=(module,filename)=>{
 const source=readFileSync(filename,'utf8');
 const output=typescript.transpileModule(source,{compilerOptions:{module:typescript.ModuleKind.CommonJS,target:typescript.ScriptTarget.ES2022}});
 module._compile(output.outputText,filename);
};
const {validateDna,gcKnownBases}=require('../src/lib/strict-dna.ts');
const {parseSequenceUpload,parseFasta,parseSimpleGenBank}=require('../src/lib/imports.ts');
const {asFasta,asGenBank}=require('../src/lib/exports.ts');
const {restrictionSites,reverseComplement,digestFragments,translateDna}=require('../src/lib/sequence.ts');
const record={id:'ref',name:'Reference',sequence:'ATGGAATTCTAA',topology:'Circular',features:[],primers:[]};
test('invalid IUPAC sequence rejected instead of silently stripped',()=>{
 assert.throws(()=>validateDna('ATGXYZ'),/character/);
 assert.throws(()=>validateDna('ATG U'),/character/);
 assert.equal(gcKnownBases('GCATNN'),50);
});
test('two FASTA records and original lengths',()=>{
 const result=parseFasta('>one\nATGC\n>two\nGATTACA\n');
 assert.deepEqual(result.map(r=>r.sequence.length),[4,7]);
 assert.equal(result[1].sequence,'GATTACA');
});
test('malformed FASTA and import extension fail closed',()=>{
 assert.throws(()=>parseFasta('ATGC\n'),/header/);
 assert.throws(()=>parseFasta('>bad\nATGXYZ\n'),/character/);
 assert.throws(()=>parseSequenceUpload('bad.exe','>one\nATGC'),/Unsupported file/);
});
test('FASTA and simple GenBank round-trip without sequence changes',()=>{
 const fasta=parseFasta(asFasta(record));
 assert.equal(fasta[0].sequence,record.sequence);
 const gb=parseSimpleGenBank(asGenBank(record));
 assert.equal(gb[0].sequence,record.sequence);
 assert.equal(gb[0].topology,'Circular');
});
test('complex GenBank feature location rejected, not approximated',()=>{
 const gb=asGenBank({...record,features:[{id:'a',name:'Example',type:'CDS',start:0,end:2,direction:1,color:'#fff'}]});
 const compound=gb.replace('1..3','join(1..2,5..6)');
 assert.throws(()=>parseSimpleGenBank(compound),/Unsupported/);
});
test('restriction cut and reverse complement',()=>{
 assert.equal(reverseComplement('ATGC'),'GCAT');
 const sites=restrictionSites('ATGGAATTCTAA',false);
 assert.equal(sites.find(e=>e.name==='EcoRI')?.positions[0],3);
 assert.deepEqual(digestFragments(12,[4],true),[12]);
});
test('standard translation reference',()=>assert.equal(translateDna('ATGGAATTCTAA',0,1),'MEF*'));
