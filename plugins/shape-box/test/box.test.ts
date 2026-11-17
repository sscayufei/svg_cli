import { describe, expect, it } from 'vitest';
import { CommandExecutor, CommandHistory, EditTransaction, ExtensionRegistry, SceneQuery, ShapeFactory, SubtreeBuilder, SvgDocument, SvgGroup,
  type AttributeHandler, type ShapeProvider, type TreeDecorator } from '@svgframe/core';
import { BoxShape } from '../src/BoxShape.js';
import { BoxShapeProvider } from '../src/BoxShapeProvider.js';
import { BoxFillHandler } from '../src/BoxFillHandler.js';
import { BoxLabelHandler } from '../src/BoxLabelHandler.js';
import { BoxTypeDecorator } from '../src/BoxTypeDecorator.js';
import { BoxPlugin } from '../src/BoxPlugin.js';
import { context, SetProbe, StubConstruction, StubRect, StubText } from './support.js';

describe('box with only public core and basic-shape test doubles', () => {
  it('creates the fixed detached template and separates semantic/display/XML identity', () => {
    const provider = new BoxShapeProvider(new StubConstruction()); const box = provider.create('n',['120','100','160','60','开始']);
    expect(box.type).toBe('box'); expect(box.displayType).toBe('g'); expect(box.isContainer).toBe(true);
    expect(box.parent).toBeNull(); expect(box.document).toBeNull(); expect(box.getPosition()).toBeNull();
    expect(box.children.map(child => child.id)).toEqual(['n-rect','n-label']);
    expect(box.children[0]!.getAttributes()).toEqual({ x:120, y:100, width:160, height:60, fill:'#4a90d9' });
    expect(box.children[1]!.getAttributes()).toEqual({ x:140, y:135, text:'开始' });
    expect(box.children.every(child => child.parent === box && child.document === null)).toBe(true);
    expect(box.describeSvg()).toEqual({ tag:'g', attributes:{'data-kind':'box'}, text:undefined });
    expect(provider.creationFeedback(box,null)).toEqual(['box#n created (g#n + rect#n-rect + text#n-label)']);
    expect(provider.creationFeedback(box,new SvgGroup('outer'))[0]).toContain(' in g#outer');
  });
  it('supports zero dimensions and an empty title using the same fixed offset', () => {
    const box = new BoxShapeProvider(new StubConstruction()).create('n',['0','0','0','0','']);
    expect(box.children[0]!.getGeometry()).toEqual({ x:0,y:0,width:0,height:0 });
    expect(box.children[1]!.getAttributes()).toEqual({ x:20,y:35,text:'' }); box.verifyStructure();
  });
  it.each([
    [], ['0','0','1','1'], ['0','0','1','1','x','extra'], ['NaN','0','1','1','x'],
    ['0','0','-1','1','x'], ['0','0','1','-1','x'], ['0px','0','1','1','x'],
  ].map(args => ({args})))('rejects malformed creation arguments %j', ({args}) => {
    expect(() => new BoxShapeProvider(new StubConstruction()).create('p',args)).toThrow();
  });
  it('reports missing basic construction capability without attaching anything', () => {
    const rect = new StubRect('p-rect');
    const provider = new BoxShapeProvider({ create: (type) => { if (type === 'rect') return rect; throw new Error('text unavailable'); } });
    expect(() => provider.create('p',['0','0','1','1','x'])).toThrow('text unavailable');
    expect(rect.parent).toBeNull(); expect(rect.document).toBeNull();
  });
  it('rejects a malformed basic provider result and rolls back offline parent links', () => {
    const bad = new StubText('p-rect'); const label = new StubText('p-label');
    const provider = new BoxShapeProvider({ create: type => type === 'rect' ? bad : label });
    expect(() => provider.create('p',['0','0','1','1','x'])).toThrow('invalid box structure: p');
    expect(bad.parent).toBeNull(); expect(label.parent).toBeNull();
  });
  it('preflights a derived ID collision before registering any part', () => {
    const doc = new SvgDocument(); const existing = new StubRect('p-label'); doc.append(existing);
    const box = new BoxShapeProvider(new StubConstruction()).create('p',['0','0','1','1','x']);
    expect(() => doc.append(box)).toThrow('id already exists: p-label'); expect(doc.size).toBe(1);
    expect(doc.findById('p')).toBeUndefined(); expect(doc.findById('p-rect')).toBeUndefined(); expect(doc.findById('p-label')).toBe(existing);
    expect(box.document).toBeNull(); expect(box.parent).toBeNull(); doc.verifyInvariants();
  });
  it('registers shape, handlers and label through the injected core shape service', () => {
    const providers = new ExtensionRegistry<ShapeProvider>('shapes'); const construction = new StubConstruction();
    for (const name of ['rect','text']) providers.register({ name, help:{ syntax:`create ${name}`,description:'stub' }, create:(id,args)=>construction.create(name,id,args), fromAttributes:()=>{ throw new Error('unused'); } });
    const shapes = new ShapeFactory(providers); const attributes = new ExtensionRegistry<AttributeHandler>('attributes'); const decorators = new ExtensionRegistry<TreeDecorator>('decorators');
    new BoxPlugin().activate({ shapes, shapeProviders:providers, attributes, decorators });
    expect(providers.values().map(p=>p.name)).toEqual(['rect','text','box']); expect(attributes.values().map(p=>p.name)).toEqual(['box-fill','box-label']); expect(decorators.values().map(p=>p.name)).toEqual(['box-type-label']);
    expect(shapes.create('box','p',['0','0','1','1','x']).children).toHaveLength(2);
  });
  it('restores complete subtrees with ordinary styles, nested boxes and extra children', () => {
    const provider = new BoxShapeProvider(new StubConstruction()); const children = [new StubRect('p-rect'),new StubText('p-label'),provider.create('nested',['0','0','2','3','']),new StubRect('extra')];
    const box = provider.restore({ tag:'g', id:'p', attributes:{fill:'red',stroke:'black','stroke-width':' 2 '},content:'\n ',children });
    expect(box.children).toEqual(children); expect(box.getAttributes()).toEqual({ fill:'red',stroke:'black','stroke-width':2 }); box.verifyStructure();
    expect(() => provider.fromAttributes('p')).toThrow('box restore requires a complete subtree: p');
  });
  it.each(['missing','wrong-type','nested-part'] as const)('rejects %s when restoring required direct children', mode => {
    const children = mode === 'missing' ? [new StubRect('p-rect')] : mode === 'wrong-type' ? [new StubText('p-rect'),new StubText('p-label')]
      : [SubtreeBuilder.assemble(new SvgGroup('nested'),[new StubRect('p-rect')]),new StubText('p-label')];
    expect(() => new BoxShapeProvider(new StubConstruction()).restore({tag:'g',id:'p',attributes:{},content:'',children})).toThrow('invalid box structure: p');
    expect(children.every(child=>child.parent===null)).toBe(true);
  });
  it.each([{ attributes:{transform:'translate(1)'},content:'' },{attributes:{},content:'unexpected'}])('rejects unsupported serialized data %j', input => {
    expect(() => new BoxShapeProvider(new StubConstruction()).restore({ tag:'g',id:'p',children:[new StubRect('p-rect'),new StubText('p-label')],...input })).toThrow();
  });
  it('protects required components while allowing optional children and same-parent order changes', () => {
    const ctx = context(); const box = ctx.node as BoxShape; const extra = new StubRect('extra'); ctx.document.append(extra,box);
    for (const id of ['p-rect','p-label']) {
      expect(() => ctx.document.remove(id)).toThrow(`cannot remove required component: ${id}`);
      expect(() => ctx.document.planRelocate(id,null,0)).toThrow(`cannot remove required component: ${id}`);
    }
    expect(() => box.assertCanUngroup()).toThrow('cannot ungroup composite shape: p');
    const order = ctx.document.planRelocate('p-label',box,0); order.apply(); box.verifyStructure(); order.revert();
    ctx.document.remove('extra'); ctx.document.verifyInvariants();
  });
  it('moves/scales the whole template with exact reversible child geometry', () => {
    const ctx = context(); const before = ctx.session.snapshot(); const moved = ctx.node.move(10,20); const scaled = ctx.node.scale(2);
    expect(ctx.document.requireById('p-rect').getGeometry()).toEqual({x:260,y:240,width:320,height:120});
    expect(ctx.document.requireById('p-label').getGeometry()).toEqual({x:300,y:310});
    scaled.revert(); moved.revert(); expect(ctx.session.snapshot()).toEqual(before); ctx.document.verifyInvariants();
  });
});

describe('box attributes and independent type label', () => {
  it('records fill and label as separate undo units and preserves geometry, root styles and exact feedback', () => {
    const ctx = context(); const history = new CommandHistory(ctx.session.events); const executor = new CommandExecutor(history); const geometry = ctx.document.requireById('p-label').getGeometry();
    expect(executor.execute(new SetProbe(ctx.session,'p','fill','#f5a623'))).toEqual({ok:true,result:{kind:'lines',lines:['box#p fill propagated to p-rect']}});
    expect(executor.execute(new SetProbe(ctx.session,'p','label','处理数据 v2'))).toEqual({ok:true,result:{kind:'lines',lines:['box#p label updated: "处理数据 v2"']}});
    expect(history.status.undoCount).toBe(2); expect(ctx.node.getAttributes().fill).toBeUndefined(); expect(ctx.document.requireById('p-label').getGeometry()).toEqual(geometry);
    expect(history.undo()).toEqual({kind:'lines',lines:['box#p label restored: "开始"']}); expect(ctx.document.requireById('p-rect').getAttributes().fill).toBe('#f5a623');
    history.redo(); expect(ctx.document.requireById('p-label').getAttributes().text).toBe('处理数据 v2'); history.undo(); history.undo();
    expect(ctx.document.requireById('p-rect').getAttributes().fill).toBe('#4a90d9'); ctx.document.verifyInvariants();
  });
  it('falls back to group styles when handlers are absent and still rejects label', () => {
    const ctx = context(false); const executor = new CommandExecutor(new CommandHistory());
    expect(executor.execute(new SetProbe(ctx.session,'p','fill','red')).ok).toBe(true);
    expect(ctx.node.getAttributes().fill).toBe('red'); expect(ctx.document.requireById('p-rect').getAttributes().fill).toBe('#4a90d9');
    expect(executor.execute(new SetProbe(ctx.session,'p','label','wrong'))).toMatchObject({ok:false,error:'unknown attribute: label'});
  });
  it('rejects conflicting handlers before mutation and preserves an existing redo branch', () => {
    const ctx = context(); const history = new CommandHistory(); const executor = new CommandExecutor(history);
    executor.execute(new SetProbe(ctx.session,'p','label','changed')); history.undo();
    ctx.attributes.register({name:'conflicting-fill',handles:(target,name)=>new BoxFillHandler().handles(target,name),apply:()=>{throw new Error('must not run');}});
    const before=ctx.session.snapshot(); const status=history.status;
    expect(executor.execute(new SetProbe(ctx.session,'p','fill','red'))).toMatchObject({ok:false,error:'attribute handler conflict: box-fill, conflicting-fill'});
    expect(ctx.session.snapshot()).toEqual(before); expect(history.status).toEqual(status); history.redo(); expect(ctx.document.requireById('p-label').getAttributes().text).toBe('changed');
  });
  it('rolls back partial multi-part failure and leaves source, identities and both stacks usable', () => {
    const ctx=context(false); ctx.session.load(ctx.document,'/source.svg'); ctx.attributes.register(new BoxLabelHandler());
    const history=new CommandHistory(); const executor=new CommandExecutor(history);
    executor.execute(new SetProbe(ctx.session,'p','label','changed')); history.undo();
    ctx.attributes.register({name:'failing-fill',handles:(target,name)=>new BoxFillHandler().handles(target,name),apply:(target,name,value,edits)=>{
      new BoxFillHandler().apply(target,name,value,edits); edits.setAttribute('p-label','text','partial'); throw new Error('deliberate failure');
    }});
    const before=ctx.session.snapshot(); const status=history.status; const nodes=[...ctx.document];
    expect(executor.execute(new SetProbe(ctx.session,'p','fill','red'))).toMatchObject({ok:false,error:'deliberate failure'});
    expect(ctx.session.snapshot()).toEqual(before); expect(history.status).toEqual(status); expect([...ctx.document]).toEqual(nodes);
    for(const node of nodes) expect(ctx.document.findById(node.id)).toBe(node);
    history.redo(); expect(ctx.document.requireById('p-label').getAttributes().text).toBe('changed'); ctx.document.verifyInvariants();
  });
  it('restores absent fill and escapes feedback for empty and multiline labels', () => {
    const ctx=context();
    // A restored SVG can legitimately omit a rect fill; use a fresh template with an unstyled test rect.
    const provider=new BoxShapeProvider(new StubConstruction()); const node=provider.restore({tag:'g',id:'q',attributes:{},content:'',children:[new StubRect('q-rect'),new StubText('q-label')]}); ctx.document.append(node);
    const history=new CommandHistory(); const executor=new CommandExecutor(history);
    executor.execute(new SetProbe(ctx.session,'q','fill','red')); history.undo(); expect(ctx.document.requireById('q-rect').getAttributes().fill).toBeUndefined();
    expect(executor.execute(new SetProbe(ctx.session,'q','label','line\n"quoted"'))).toMatchObject({ok:true,result:{lines:['box#q label updated: "line\\n\\"quoted\\""']}});
    history.undo(); expect(ctx.document.requireById('q-label').getAttributes().text).toBe('');
  });
  it('labels only semantic box rows while leaving root/ordinary groups unchanged', () => {
    const ctx=context(); const decorator=new BoxTypeDecorator(); const query=new SceneQuery(); const snapshot=query.show(ctx.document,'p');
    expect(decorator.decorate({node:snapshot,canvas:{width:800,height:600}})).toBe('(box)');
    expect(decorator.decorate({node:null,canvas:{width:800,height:600}})).toBeUndefined();
    expect(decorator.decorate({node:{...snapshot,semanticType:'g'},canvas:{width:800,height:600}})).toBeUndefined();
    ctx.decorators.register(decorator); ctx.decorators.register({name:'test-star',decorate:()=>'*'});
    const tree=new SceneQuery(ctx.decorators).tree(ctx.document);
    expect(tree.rootSuffixes).toEqual(['*']); expect(tree.entries[0]!.suffixes).toEqual(['(box)','*']); expect(tree.entries[1]!.suffixes).toEqual(['*']);
    expect(EditTransaction.view(ctx.node).semanticType).toBe('box');
  });
});
