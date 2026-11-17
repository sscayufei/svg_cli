import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CommandExecutor, SceneQuery, type AttributeHandler, type PluginContext } from '@svgframe/core';
import { StatsPlugin } from '@svgframe/command-stats';
import { DirPlugin } from '@svgframe/command-dir';
import { BoxPlugin, BoxShape, BoxShapeProvider, BoxFillHandler, BoxLabelHandler, BoxTypeDecorator } from '@svgframe/shape-box';
import { createApplication } from '../../src/host/composition.js';
import { CommandDispatcher } from '../../src/host/cli/CommandDispatcher.js';
import { ResultFormatter } from '../../src/host/cli/ResultFormatter.js';
import { SvgReader } from '../../src/host/svg/SvgReader.js';
import { SvgWriter } from '../../src/host/svg/SvgWriter.js';

const root=resolve(import.meta.dirname,'../..');const tempRoot=resolve(root,'.tmp/phase2');mkdirSync(tempRoot,{recursive:true});
const boxConfig=resolve(root,'doc/transcript/inputs/box.plugins.json');
const noOptional=resolve(root,'test/fixtures/entries/no-optional.json');
const args=['10','20','30','40','title'];
const xml=(body:string)=>`<svg width="100" height="200">${body}</svg>`;
const valid='<g id="p" data-kind="box"><rect id="p-rect"/><text id="p-label">title</text></g>';
async function app(mode:'code'|'config'='code',plugin:unknown=new BoxPlugin()) {
  const application=mode==='config'?await createApplication({args:['--config',boxConfig]}):await createApplication({codePlugins:[
    {module:'@svgframe/command-stats',plugin:new StatsPlugin()},{module:'@svgframe/command-dir',plugin:new DirPlugin()},{module:'@svgframe/shape-box',plugin},
  ]});
  expect(application.diagnostics).toEqual([]);
  const ctx=application.context;const dispatcher=new CommandDispatcher(ctx.commands);const executor=new CommandExecutor(ctx.history);
  const execute=(line:string)=>executor.execute(dispatcher.parse(line)!);
  const run=(line:string)=>{const result=execute(line);if(!result.ok)throw new Error(result.error);return result.result;};
  return {...application,ctx,dispatcher,execute,run};
}

describe('real box plugin through frozen framework and built-in shapes',()=>{
  it.each(['code','config'] as const)('creates, edits and undoes through %s assembly with dynamic help and type labels',async mode=>{
    const a=await app(mode);
    try {
      a.run('init');const result=a.run('create box p 10 20 30 40 "title"');
      expect(result).toEqual({kind:'lines',lines:['box#p created (g#p + rect#p-rect + text#p-label)']});
      const doc=a.ctx.session.requireDocument();expect(doc.requireById('p')).toBeInstanceOf(BoxShape);expect(doc.size).toBe(3);
      expect(a.run('help')).toMatchObject({entries:expect.arrayContaining([{syntax:'create box <id> <x> <y> <w> <h> "label"',description:'rectangle with a title; accepts in <containerId>'}])});
      const formatter=new ResultFormatter();expect(formatter.format(a.run('tree p'))).toEqual(['g#p (box)','├── rect#p-rect  x=10 y=20 w=30 h=40 fill=#4a90d9','└── text#p-label  (30,55) "title"']);
      a.run('set p fill red');a.run('set p label "updated"');expect(a.ctx.history.status.undoCount).toBe(3);
      expect(doc.requireById('p').getAttributes().fill).toBeUndefined();expect(doc.requireById('p-rect').getAttributes().fill).toBe('red');
      expect(formatter.format(a.run('undo'))).toEqual(['box#p label restored: "title"']);a.run('redo');expect(doc.requireById('p-label').getAttributes().text).toBe('updated');
      a.run('undo');a.run('undo');expect(doc.requireById('p-rect').getAttributes().fill).toBe('#4a90d9');doc.verifyInvariants();
    }finally{a.dispose();}
  });
  it.each(['p','p-rect','p-label'])('rejects whole-subtree ID collision with %s without clearing redo',async collision=>{
    const a=await app();try {
      a.run('init');a.run(`create rect ${collision} 0 0 1 1`);a.run(`set ${collision} fill red`);a.run('undo');
      const doc=a.ctx.session.requireDocument();const before=a.ctx.session.snapshot();const history=a.ctx.history.status;const existing=doc.requireById(collision);
      expect(a.execute('create box p 0 0 1 1 "x"')).toEqual({ok:false,error:`id already exists: ${collision}`});
      expect(a.ctx.session.snapshot()).toEqual(before);expect(a.ctx.history.status).toEqual(history);expect(doc.requireById(collision)).toBe(existing);expect(doc.size).toBe(1);
      a.run('redo');expect(existing.getAttributes().fill).toBe('red');doc.verifyInvariants();
    }finally{a.dispose();}
  });
  it('prevents delete/addto/group of either required part and rejects ungroup before root-level rules',async()=>{
    const a=await app();try {
      a.run('init');a.run('create g outer');a.run('create box p 10 20 30 40 "title" in outer');a.run('create g destination');a.run('create rect loose 0 0 1 1');a.run('set loose fill red');a.run('undo');
      const before=a.ctx.session.snapshot();const history=a.ctx.history.status;const doc=a.ctx.session.requireDocument();
      for(const id of ['p-rect','p-label'])for(const command of [`delete ${id}`,`addto destination ${id}`,`group stolen ${id} loose`]) {
        expect(a.execute(command)).toEqual({ok:false,error:`cannot remove required component: ${id}`});
        expect(a.ctx.session.snapshot()).toEqual(before);expect(a.ctx.history.status).toEqual(history);expect(doc.findById('stolen')).toBeUndefined();
      }
      expect(a.execute('ungroup p')).toEqual({ok:false,error:'cannot ungroup composite shape: p'});
      a.run('redo');expect(doc.requireById('loose').getAttributes().fill).toBe('red');
      a.run('create box top 0 0 0 0 ""');expect(a.execute('ungroup top')).toEqual({ok:false,error:'cannot ungroup composite shape: top'});doc.verifyInvariants();
    }finally{a.dispose();}
  });
  it('preserves nested subtrees, geometry and identities through whole-container operations and same-parent order changes',async()=>{
    const a=await app();try {
      for(const line of ['init','create g outer','create box p 10 20 30 40 "title" in outer','create box nested 1 2 3 4 "" in p','create circle extra 0 0 2 in p','create g destination','create rect loose 0 0 1 1'])a.run(line);
      const doc=a.ctx.session.requireDocument();const before=a.ctx.session.snapshot();const references=[...doc];
      for(const command of ['move p 10 20','scale p 2','front p-rect','back p-label','addto destination p','group wrapper p loose','delete p']) {
        a.run(command);const applied=a.ctx.session.snapshot();doc.verifyInvariants();a.run('undo');expect(a.ctx.session.snapshot()).toEqual(before);
        for(const node of references)expect(doc.findById(node.id)).toBe(node);
        a.run('redo');expect(a.ctx.session.snapshot()).toEqual(applied);a.run('undo');expect(a.ctx.session.snapshot()).toEqual(before);
      }
      a.run('set p-rect width 0');a.run('set p-label text "direct"');expect(doc.requireById('p-label').getAttributes().text).toBe('direct');doc.verifyInvariants();
      a.run('set p fill red');expect(doc.requireById('nested-rect').getAttributes().fill).toBe('#4a90d9');
      expect(a.run('stats')).toEqual({kind:'lines',lines:['rect: 3  text: 2  circle: 1  (total 6, containers 4)']});
    }finally{a.dispose();}
  });
  it('round-trips complete nested boxes, styles, escaped text and reordered components',async()=>{
    const a=await app('config');try {
      a.run('init');a.run('create box p 0 0 0 0 "A & <中文>"');a.run('create box nested 1 2 3 4 "child" in p');a.run('create g extra in p');a.run('front p-rect');a.run('set p stroke black');
      const doc=a.ctx.session.requireDocument();const writer=new SvgWriter();const serialized=writer.serialize(doc);
      expect(serialized).toContain('<g id="p" data-kind="box" stroke="black">');expect(serialized).toContain('A &amp; &lt;中文&gt;');expect(serialized).not.toContain('<box');
      const parsed=new SvgReader(a.ctx.shapes).parse(serialized);expect(new SceneQuery().scene(parsed.document)).toEqual(new SceneQuery().scene(doc));
      expect(writer.serialize(parsed.document)).toBe(serialized);expect(parsed.document.requireById('p')).toBeInstanceOf(BoxShape);parsed.document.verifyInvariants();
      const directory=mkdtempSync(resolve(tempRoot,'box-roundtrip-'));const path=resolve(directory,'box.svg');a.run(`save "${path}"`);a.run(`read "${path}"`);
      expect(writer.serialize(a.ctx.session.requireDocument())).toBe(serialized);expect(a.ctx.session.sourcePath).toBe(path);
    }finally{a.dispose();}
  });
  it('silently downgrades without the provider, preserving styles/children and rejecting unrelated metadata',async()=>{
    const application=await createApplication({args:['--config',noOptional]});try {
      const reader=new SvgReader(application.context.shapes);const parsed=reader.parse(xml(valid.replace('data-kind="box"','data-kind="box" fill="red"')));
      expect(parsed.document.requireById('p').type).toBe('g');expect(parsed.document.requireById('p').getAttributes()).toEqual({fill:'red'});expect(parsed.warnings).toEqual([]);
      expect([...parsed.document].map(node=>node.id)).toEqual(['p','p-rect','p-label']);expect(new SvgWriter().serialize(parsed.document)).not.toContain('data-kind');
      expect(()=>reader.parse(xml(valid.replace('id="p-label"','id="p-rect"')))).toThrow('id already exists: p-rect');
      expect(()=>reader.parse(xml('<g data-other="box"/>'))).toThrow('unknown attribute: data-other');
      const dispatcher=new CommandDispatcher(application.context.commands);expect(new CommandExecutor(application.context.history).execute(dispatcher.parse('init')!).ok).toBe(true);
      expect(new CommandExecutor(application.context.history).execute(dispatcher.parse('create box p 0 0 1 1 "x"')!)).toMatchObject({ok:false,error:'unknown shape type: box (is the plugin loaded?)'});
    }finally{application.dispose();}
  });
  it.each([
    '<g id="p" data-kind="box"><rect id="p-rect"/></g>',
    '<g id="p" data-kind="box"><circle id="p-rect"/><text id="p-label"/></g>',
    '<g id="p" data-kind="box"><g id="nested"><rect id="p-rect"/></g><text id="p-label"/></g>',
  ])('rejects damaged registered input without replacing document/path/history: %s',async body=>{
    const a=await app();try {
      a.run('init');a.run('create box original 0 0 1 1 "old"');a.ctx.session.load(a.ctx.session.requireDocument(),'/original.svg');a.run('set original label changed');a.run('undo');
      const before=a.ctx.session.snapshot();const history=a.ctx.history.status;const directory=mkdtempSync(resolve(tempRoot,'box-damaged-'));const path=resolve(directory,'bad.svg');writeFileSync(path,xml(body));
      expect(a.execute(`read "${path}"`)).toEqual({ok:false,error:'invalid box structure: p'});expect(a.ctx.session.snapshot()).toEqual(before);expect(a.ctx.history.status).toEqual(history);
      a.run('redo');expect(a.ctx.session.requireDocument().requireById('original-label').getAttributes().text).toBe('changed');
      expect(()=>new SvgReader(a.ctx.shapes).parse(xml(valid.replace('id="p-label"','id="p-rect"')))).toThrow('id already exists: p-rect');
    }finally{a.dispose();}
  });
  it('rejects conflicting box handlers before mutation',async()=>{
    const a=await app();try {
      a.run('init');a.run('create box p 0 0 1 1 "old"');a.run('set p label changed');a.run('undo');let calls=0;
      a.ctx.attributes.register({name:'conflicting-fill',handles:(target,name)=>new BoxFillHandler().handles(target,name),apply:()=>{calls++;}});
      const before=a.ctx.session.snapshot();const history=a.ctx.history.status;
      expect(a.execute('set p fill red')).toEqual({ok:false,error:'attribute handler conflict: box-fill, conflicting-fill'});expect(calls).toBe(0);expect(a.ctx.session.snapshot()).toEqual(before);expect(a.ctx.history.status).toEqual(history);a.run('redo');
    }finally{a.dispose();}
  });
  it('rolls back real rect/text changes after a handler fails halfway',async()=>{
    const broken={activate(ctx:PluginContext){
      ctx.shapeProviders.register(new BoxShapeProvider(ctx.shapes));ctx.attributes.register(new BoxLabelHandler());ctx.decorators.register(new BoxTypeDecorator());
      const failing:AttributeHandler={name:'box-fill',handles:(target,name)=>new BoxFillHandler().handles(target,name),apply:(target,name,value,edits)=>{
        new BoxFillHandler().apply(target,name,value,edits);edits.setAttribute(`${target.id}-label`,'text','partial');throw new Error('partial failure');
      }};ctx.attributes.register(failing);
    }};
    const a=await app('code',broken);try {
      a.run('init');a.run('create box p 0 0 1 1 "old"');a.ctx.session.load(a.ctx.session.requireDocument(),'/original.svg');a.run('set p label changed');a.run('undo');
      const before=a.ctx.session.snapshot();const history=a.ctx.history.status;const doc=a.ctx.session.requireDocument();const nodes=[...doc];
      expect(a.execute('set p fill red')).toEqual({ok:false,error:'partial failure'});expect(a.ctx.session.snapshot()).toEqual(before);expect(a.ctx.history.status).toEqual(history);
      for(const node of nodes)expect(doc.findById(node.id)).toBe(node);a.run('redo');expect(doc.requireById('p-label').getAttributes().text).toBe('changed');doc.verifyInvariants();
    }finally{a.dispose();}
  });
  it('replays section 6.1 B plus restore checks against manual expectations and raw A/B bytes',()=>{
    const result=spawnSync(process.execPath,[resolve(root,'scripts/verify-assemblies.mjs'),resolve(root,'doc/transcript/plans/box.json')],{cwd:root,encoding:'utf8',timeout:30_000});
    expect(result.status,result.stderr).toBe(0);const evidence=result.stdout.trim().split('Evidence: ')[1]!;
    const stdout=readFileSync(resolve(evidence,'code.stdout'));const stderr=readFileSync(resolve(evidence,'code.stderr'));
    expect(stdout.equals(readFileSync(resolve(evidence,'config.stdout')))).toBe(true);expect(stderr.equals(readFileSync(resolve(evidence,'config.stderr')))).toBe(true);
    expect(stdout.toString('utf8').replace(/\r\n/g,'\n').replace(/^(?:svg> )+/gm,'').trim()).toBe(readFileSync(resolve(root,'doc/transcript/expected/cli-2-box.stdout.txt'),'utf8').trim());
    expect(stderr.toString('utf8')).toBe(readFileSync(resolve(root,'doc/transcript/expected/cli-2-box.stderr.txt'),'utf8'));
    for(const name of ['flowchart-box.svg','roundtrip-box.svg'])expect(readFileSync(resolve(evidence,`code.files/${name}`)).equals(readFileSync(resolve(evidence,`config.files/${name}`)))).toBe(true);
    const svg=readFileSync(resolve(evidence,'code.files/roundtrip-box.svg'),'utf8');expect(svg).toContain('A &amp; &lt;中文&gt;');expect(svg.match(/data-kind="box"/g)).toHaveLength(2);
  });
});
