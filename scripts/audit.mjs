/** Architecture guard: fail CI for oversize files, hardcoded secrets or broken local imports. */
import {readdirSync,readFileSync,statSync,existsSync} from 'node:fs';
import {join,dirname,resolve,extname} from 'node:path';
const violations=[];
const roots=['src','science-service','scripts','tests','supabase'];
const checked=new Set(['.ts','.tsx','.mjs','.py','.sql','.css']);
function walk(path){for(const entry of readdirSync(path)){
 const full=join(path,entry);if(entry.startsWith('.')||entry==='__pycache__')continue;
 if(statSync(full).isDirectory()){walk(full);continue;}
 if(!checked.has(extname(entry)))continue;
 const text=readFileSync(full,'utf8'),lines=text.split(/\r?\n/);
 if(lines.length>250)violations.push(`${full}: ${lines.length} lines exceeds 250`);
 if(/(?:sk_test_|sk_live_|sb_secret_)[a-zA-Z0-9]{12,}/.test(text))violations.push(`${full}: looks like an embedded secret`);
 if(full.endsWith('.ts')||full.endsWith('.tsx')){
  for(const match of text.matchAll(/(?:from\s*|import\s*\()\s*['"](@\/[^'"]+|\.\.?\/[^'"]+)['"]/g)){
   const ref=match[1];const base=ref.startsWith('@/')?join('src',ref.slice(2)):resolve(dirname(full),ref);
   if(!['.ts','.tsx','.mjs','.js','/index.ts','/index.tsx'].some(ext=>existsSync(base+ext))&&!existsSync(base))violations.push(`${full}: unresolved ${ref}`);
  }
 }
}}
for(const root of roots)if(existsSync(root))walk(root);
if(violations.length){console.error(violations.join('\n'));process.exitCode=1;}
else console.log('Architecture audit passed: <=250 lines per source, no detected secrets, local imports resolve.');
