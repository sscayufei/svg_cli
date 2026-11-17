import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const root=resolve(import.meta.dirname,'../..'); const temporary=resolve(root,'.tmp/phase2'); mkdirSync(temporary,{recursive:true});
const make=(name:string)=>mkdtempSync(resolve(temporary,name));
function node(script:string,args:string[]=[],cwd=root) {return spawnSync(process.execPath,[resolve(root,script),...args],{cwd,encoding:'utf8',timeout:120_000});}
function write(directory:string,path:string,content:string) { const target=resolve(directory,path);mkdirSync(resolve(target,'..'),{recursive:true});writeFileSync(target,content); }
const url=(path:string)=>pathToFileURL(resolve(root,path)).href;

describe('Framework verification tools',()=>{
  it('measures token-aware code lines, independent nested functions and top-level decisions from actual ASTs',()=>{
    const directory=make('metrics-sample-');
    const source=['// comment','const url = "http://example/*literal*/";','/* block',' comment */','const template = `alpha','// data','${true ? "//literal" : "/*literal*/"}','omega`;','function outer(x:number){',' if(x && true) return () => x ? 1 : 0;',' return 0;','}','const regex = /https?:\\/\\/[^/]+/;',''].join('\n');
    write(directory,'sample.ts',source); write(directory,'empty.ts',''); write(directory,'tsconfig.json',JSON.stringify({compilerOptions:{target:'ESNext',noLib:true},include:['*.ts']}));
    write(directory,'run.mjs',`import {measureFiles} from ${JSON.stringify(url('scripts/lib/source-metrics.mjs'))}; console.log(JSON.stringify(measureFiles(${JSON.stringify([resolve(directory,'sample.ts'),resolve(directory,'empty.ts')])},${JSON.stringify(directory)})));`);
    const result=node(resolve(directory,'run.mjs'));expect(result.status,result.stderr).toBe(0); const [sample,empty]=JSON.parse(result.stdout);
    expect(sample).toMatchObject({physicalLines:13,codeLines:10,functionCount:2,functionComplexity:5,topLevelDecisions:1});
    expect(sample.functions.map((fn:{complexity:number})=>fn.complexity)).toEqual([3,2]);
    expect(empty).toMatchObject({physicalLines:0,codeLines:0,functionCount:0,functionComplexity:0,topLevelDecisions:0});
  });
  it('compares code/config assembly through the same compiled bootstrap including options, stderr and generated SVG bytes',()=>{
    const directory=make('assembly-fixture-');
    write(directory,'plugin/package.json',JSON.stringify({name:'fixture-assembly',type:'module',exports:{'.':'./entry.js'},contributes:{commands:['fixture']}}));
    write(directory,'plugin/entry.js',`export default class {activate(ctx, options){ctx.commands.register(new class {name='fixture';syntax='fixture';description='fixture';build(){return {kind:'query',execute(){return {kind:'lines',lines:[options.message]}}}}});}}`);
    write(directory,'code.mjs',`import Plugin from './plugin/entry.js'; import {runApplication} from ${JSON.stringify(url('dist/host/bootstrap.js'))}; await runApplication({codePlugins:[{module:${JSON.stringify(resolve(directory,'plugin'))},plugin:new Plugin(),options:{message:'same options'}}]});`);
    write(directory,'config.json',JSON.stringify({plugins:[{module:'./plugin',options:{message:'same options'}}]}));
    write(directory,'input.txt','fixture\ninit 20 30\ncreate rect r 1 2 3 4\nsave output.svg\nunknown-fixture\n');
    write(directory,'plan.json',JSON.stringify({codeEntry:'./code.mjs',configEntry:resolve(root,'dist/host/main.js'),configPath:'./config.json',transcript:'./input.txt'}));
    const result=node('scripts/verify-assemblies.mjs',[resolve(directory,'plan.json')]);expect(result.status,result.stderr).toBe(0);
    const evidencePath=result.stdout.trim().split('Evidence: ')[1]!;const evidence=JSON.parse(readFileSync(resolve(evidencePath,'result.json'),'utf8'));
    expect(Object.keys(evidence.files)).toEqual(['output.svg']); expect(readFileSync(resolve(evidencePath,'code.stdout'),'utf8')).toContain('same options');
    expect(readFileSync(resolve(evidencePath,'code.stderr'),'utf8')).toBe('error: unknown command: unknown-fixture\n');
    write(directory,'config.json',JSON.stringify({plugins:[{module:'./plugin',options:{message:'different'}}]}));
    const different=node('scripts/verify-assemblies.mjs',[resolve(directory,'plan.json')]);expect(different.status).not.toBe(0);expect(different.stderr).toContain('assembly stdout differs');
  });
  it('discovers and topologically builds an unknown workspace package, then loads its compiled ESM entry',()=>{
    const directory=make('workspace-fixture-');
    write(directory,'package.json',JSON.stringify({private:true,type:'module',workspaces:['packages/*']}));
    write(directory,'tsconfig.json',JSON.stringify({compilerOptions:{target:'ESNext',rootDir:'src',outDir:'dist'},include:['src/**/*.ts']}));
    write(directory,'src/host.ts','export const ready = true;');
    for(const name of ['dependency','arbitrary-feature']) {
      write(directory,`packages/${name}/package.json`,JSON.stringify({name:`@fixture/${name}`,version:'1.0.0',type:'module',exports:{'.':{import:'./dist/entry.js'}},contributes:name==='arbitrary-feature'?{commands:['arbitrary']}:{},dependencies:name==='arbitrary-feature'?{'@fixture/dependency':'1.0.0'}:{},scripts:{build:'node build.mjs'}}));
      const body=name==='arbitrary-feature'?`export default {activate(ctx){ctx.commands.register(new class {name='arbitrary';syntax='arbitrary';description='fixture';build(){return {kind:'query',execute(){return {kind:'lines',lines:['discovered']}}}}});}};`:'export const dependency=true;';
      write(directory,`packages/${name}/build.mjs`,`import {mkdirSync,writeFileSync,existsSync} from 'node:fs'; ${name==='arbitrary-feature'?`if(!existsSync('../dependency/dist/entry.js'))throw new Error('dependency not built');`:''} mkdirSync('dist',{recursive:true});writeFileSync('dist/entry.js',${JSON.stringify(body)});`);
    }
    // npm runs workspace scripts without installing third-party dependencies in this isolated fixture.
    const result=node('scripts/build-workspaces.mjs',['--root',directory]); expect(result.status,result.stdout+result.stderr).toBe(0);
    write(directory,'config.json',JSON.stringify({plugins:[{module:'./packages/arbitrary-feature'}]}));
    const run=spawnSync(process.execPath,[resolve(root,'dist/host/main.js'),'--config',resolve(directory,'config.json')],{cwd:directory,input:'arbitrary\n',encoding:'utf8'});
    expect(run.status,run.stderr).toBe(0); expect(run.stderr).toBe('');expect(run.stdout).toContain('discovered');
  });
  it('validates actual Git trees, rejects existing runtime edits and checks peer plugin equality',()=>{
    const directory=make('diff-fixture-');
    const git=(args:string[])=>{const r=spawnSync('git',args,{cwd:directory,encoding:'utf8'});if(r.status)throw new Error(r.stderr);return r.stdout.trim();};
    git(['init','--quiet']);
    for(const path of ['src/core/public.ts','src/host/main.ts','src/host/loading/loader.ts','src/host/composition.ts','plugins/builtin/src/public.ts'])write(directory,path,'export const original=true;\n');
    write(directory,'plugins.config.json','{"plugins":[]}');
    write(directory,'package.json','{"private":true,"scripts":{"build":"unchanged"}}');
    const commit=()=>{git(['add','.']);git(['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','--quiet','-m','isolated fixture']);return git(['rev-parse','HEAD']);};
    const baseline=commit();write(directory,'plugins/new-feature/package.json','{"name":"new-feature"}');write(directory,'plugins/new-feature/src/public.ts','export const feature=true;');write(directory,'plugins.config.json','{"plugins":[{"module":"./plugins/new-feature"}]}');const good=commit();
    const command=[baseline,good,'--plugin','plugins/new-feature','--mode','config','--repo',directory];
    const accepted=node('scripts/verify-plugin-diff.mjs',command);expect(accepted.status,accepted.stderr).toBe(0);expect(JSON.parse(accepted.stdout).violations).toEqual([]);
    write(directory,'src/host/loading/loader.ts','export const changed=true;');const bad=commit();
    const rejected=node('scripts/verify-plugin-diff.mjs',[baseline,bad,...command.slice(2)]);expect(rejected.status).toBe(1);expect(rejected.stdout).toContain('src/host/loading/loader.ts');
    write(directory,'plugins/new-feature/src/public.ts','export const changedFeature=true;');const peer=commit();
    const unequal=node('scripts/verify-plugin-diff.mjs',[...command,'--peer',peer]);expect(unequal.status).toBe(1);expect(unequal.stdout).toContain('peer implementation differs');
    write(directory,'package.json','{"private":true,"scripts":{"build":"hidden runtime change"}}');const metadata=commit();
    const hidden=node('scripts/verify-plugin-diff.mjs',[baseline,metadata,...command.slice(2)]);expect(hidden.status).toBe(1);expect(hidden.stdout).toContain('non-dependency root manifest changes: scripts');
    const missing=node('scripts/verify-plugin-diff.mjs',[baseline,good,'--plugin','plugins/nonexistent','--mode','config','--repo',directory]);expect(missing.status).not.toBe(0);
  });
});
