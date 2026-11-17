import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
if (process.argv.length !== 3) throw new Error('usage: verify:assemblies <plan.json>');
const path = resolve(process.argv[2]); const base = dirname(path); const plan = JSON.parse(readFileSync(path,'utf8'));
for (const key of ['codeEntry','configEntry','configPath','transcript']) if (typeof plan[key] !== 'string') throw new Error(`invalid assembly plan: ${key}`);
const parent = resolve(root, '.tmp/phase2'); mkdirSync(parent,{recursive:true}); const output=mkdtempSync(resolve(parent,'assemblies-')); const cwd=resolve(output,'cwd');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
function files(directory, prefix='') {
  return Object.fromEntries(readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name < b.name ? -1 : 1).flatMap(entry => {
    const name=prefix+entry.name; if (entry.isSymbolicLink()) return [[name, `link:${hash(readlinkSync(resolve(directory,entry.name)))}`]];
    return entry.isDirectory() ? Object.entries(files(resolve(directory,entry.name),name+'/')) : [[name,hash(readFileSync(resolve(directory,entry.name)))]];
  }));
}
const input=readFileSync(resolve(base,plan.transcript));
function replay(entry,args,label) {
  const local=relative(output,cwd); if (!local || isAbsolute(local) || local==='..' || local.startsWith(`..${sep}`)) throw new Error('assembly cwd outside generated run');
  rmSync(cwd,{recursive:true,force:true}); mkdirSync(cwd);
  if (plan.fixtureDirectory) cpSync(resolve(base,plan.fixtureDirectory),cwd,{recursive:true,verbatimSymlinks:true});
  const command=[resolve(base,entry),...args]; const result=spawnSync(process.execPath,command,{cwd,input,maxBuffer:32*1024*1024,timeout:120_000});
  if (result.error) throw result.error; if (result.status!==0) throw new Error(`${label} exited ${result.status}: ${result.stderr}`);
  for (const stream of ['stdout','stderr']) writeFileSync(resolve(output,`${label}.${stream}`),result[stream]);
  const generated=files(cwd); cpSync(cwd,resolve(output,`${label}.files`),{recursive:true});
  return {command,result,files:generated};
}
const a=replay(plan.codeEntry,[],'code'); const b=replay(plan.configEntry,['--config',resolve(base,plan.configPath)],'config');
for (const stream of ['stdout','stderr']) if (!a.result[stream].equals(b.result[stream])) throw new Error(`assembly ${stream} differs; evidence: ${output}`);
if (JSON.stringify(a.files)!==JSON.stringify(b.files)) throw new Error(`assembly generated files differ; evidence: ${output}`);
const evidence={node:process.version,cwd,inputSha256:hash(input),codeCommand:a.command,configCommand:b.command,
  stdoutSha256:hash(a.result.stdout),stderrSha256:hash(a.result.stderr),files:a.files};
writeFileSync(resolve(output,'result.json'),JSON.stringify(evidence,null,2)+'\n'); console.log(`PASS: A/B raw streams and generated files match. Evidence: ${output}`);
