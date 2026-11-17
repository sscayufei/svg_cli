import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args=process.argv.slice(2); const before=args.shift(); const after=args.shift(); const options={};
while(args.length) { const key=args.shift(); const value=args.shift(); if (!['--plugin','--mode','--repo','--peer'].includes(key)||!value||options[key]) throw new Error('invalid diff arguments'); options[key]=value; }
const plugin=options['--plugin']; const mode=options['--mode'];
if (!before||!after||!/^plugins\/[a-zA-Z0-9._-]+$/.test(plugin??'')||!['code','config'].includes(mode)) throw new Error('usage: verify:plugin-diff <before> <after> --plugin plugins/name --mode code|config [--peer revision] [--repo path]');
const root=options['--repo']?resolve(options['--repo']):fileURLToPath(new URL('../',import.meta.url));
function git(args) { const r=spawnSync('git',args,{cwd:root,maxBuffer:32*1024*1024});if(r.error)throw r.error;if(r.status)throw new Error(r.stderr.toString());return r.stdout.toString(); }
const a=git(['rev-parse','--verify',`${before}^{commit}`]).trim();const b=git(['rev-parse','--verify',`${after}^{commit}`]).trim();
const tree=revision=>git(['ls-tree','-r','--name-only','-z',revision]).split('\0').filter(Boolean);const previous=tree(a),current=tree(b);
for (const prefix of ['src/core/','src/host/','plugins/']) if(!previous.some(path=>path.startsWith(prefix)))throw new Error(`baseline source path missing: ${prefix}`);
if(previous.some(path=>path.startsWith(plugin+'/'))||!current.includes(plugin+'/package.json')||!current.some(path=>path.startsWith(plugin+'/src/')))throw new Error('plugin must be a genuinely new package with manifest and source');
const parts=git(['diff','--name-status','--no-renames','-z',a,b]).split('\0');parts.pop();const changes=[];for(let i=0;i<parts.length;i+=2)changes.push({status:parts[i],path:parts[i+1]});
const assembly=mode==='code'?'src/host/composition.ts':'plugins.config.json';
const allowed=path=>path.startsWith(plugin+'/')||path===assembly||['package.json','package-lock.json'].includes(path)||/^(?:test|doc|docs)\//.test(path);
const violations=changes.filter(change=>!allowed(change.path));
const ancestry=git(['rev-list','--parents','-n','1',b]).trim().split(' ');
if(ancestry.length!==2||ancestry[1]!==a)violations.push({path:b,status:'integration commit must have the baseline as its single parent'});
if(changes.some(change=>change.path==='package.json')) {
  const readManifest=revision=>previous.includes('package.json')||revision===b?JSON.parse(git(['show',`${revision}:package.json`])):{};
  const previousManifest=readManifest(a),nextManifest=readManifest(b);
  const dependencyKeys=['dependencies','devDependencies','optionalDependencies'];
  const changedKeys=[...new Set([...Object.keys(previousManifest),...Object.keys(nextManifest)])].filter(key=>!dependencyKeys.includes(key)&&JSON.stringify(previousManifest[key])!==JSON.stringify(nextManifest[key]));
  if(changedKeys.length)violations.push({path:'package.json',status:`non-dependency root manifest changes: ${changedKeys.sort().join(',')}`});
}
if(!changes.some(change=>change.path===assembly))violations.push({path:assembly,status:'required assembly change absent'});
if(options['--peer']) {
  const peer=git(['rev-parse','--verify',`${options['--peer']}^{commit}`]).trim();
  const parent=git(['rev-list','--parents','-n','1',peer]).trim().split(' ');
  if(parent.length!==2||parent[1]!==a)violations.push({path:peer,status:'peer must share the single baseline parent'});
  if(git(['diff','--name-only',b,peer,'--',plugin]).trim())violations.push({path:plugin,status:'peer implementation differs'});
}
const result={before:a,after:b,plugin,mode,changes,violations,metadataReview:'Review package.json/lock and test/docs changes for purpose; allowed paths alone do not prove semantic safety.'};
console.log(JSON.stringify(result,null,2));if(violations.length)process.exitCode=1;
