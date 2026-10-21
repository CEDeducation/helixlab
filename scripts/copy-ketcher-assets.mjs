/** Copy Ketcher's published static UI files into a Next public subdirectory. */
import {existsSync,mkdirSync,cpSync,readdirSync,statSync} from 'node:fs';
import {join} from 'node:path';
const root='node_modules/ketcher-react/dist';
const target='public/ketcher-assets';
if(!existsSync(root)){console.log('Ketcher package unavailable; asset copy skipped.');process.exit(0);}
mkdirSync(target,{recursive:true});
for(const item of readdirSync(root)){
 const path=join(root,item);
 if(statSync(path).isDirectory()){
  if(['static','assets','images','fonts','icons','templates'].includes(item))cpSync(path,join(target,item),{recursive:true,force:true});
 }else if(/\.(svg|woff2?|png|jpe?g|gif|wasm|json)$/.test(item)){
  cpSync(path,join(target,item),{force:true});
 }
}
console.log('Ketcher static assets prepared.');
