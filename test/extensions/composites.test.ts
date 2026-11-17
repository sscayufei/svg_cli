import { describe, expect, it } from 'vitest';
import { CommandExecutor, SceneQuery, SubtreeBuilder, SvgDocument, SvgGroup } from '@svgframe/core';
import { AddToCommand, BackCommand, CreateCommand, DeleteCommand, FrontCommand, GroupCommand, MoveCommand,
  ReadCommand, ScaleCommand, UngroupCommand } from '@svgframe/builtin-commands';
import { createDefaultContext } from '../../src/host/composition.js';
import { SvgReader } from '../../src/host/svg/SvgReader.js';
import { SvgWriter } from '../../src/host/svg/SvgWriter.js';
import { FixtureComposite, FixtureLeaf, FixtureProvider } from './fixtures/composite.js';

function context() {
  const ctx = createDefaultContext(); ctx.shapeProviders.register(new FixtureProvider()); ctx.session.initialize();
  const executor = new CommandExecutor(ctx.history);
  const run = (command: Parameters<CommandExecutor['execute']>[0]) => {
    const result = executor.execute(command); if (!result.ok) throw new Error(result.error); return result.result;
  };
  run(new CreateCommand(ctx.session, 'g', 'outer', []));
  run(new CreateCommand(ctx.session, 'fixture', 'p', [], 'outer'));
  run(new CreateCommand(ctx.session, 'rect', 'other', ['1','2','3','4']));
  return { ...ctx, executor, run };
}
const wrap = (body: string) => `<svg width="400" height="300">${body}</svg>`;
const valid = '<g id="p" data-kind="fixture"><rect id="p-a"/><rect id="p-b"/></g>';

describe('Generic composite construction and structural policy', () => {
  it('uses the public construction port with registered basic shapes, rejecting missing capabilities before attachment', () => {
    const ctx = createDefaultContext(); const provider = new FixtureProvider(ctx.shapes);
    ctx.shapeProviders.register(provider); ctx.session.initialize();
    expect(new CommandExecutor(ctx.history).execute(new CreateCommand(ctx.session, 'fixture', 'p', [])).ok).toBe(true);
    expect(ctx.session.requireDocument().requireById('p-a').getGeometry()).toEqual({ x: 1, y: 2, width: 10, height: 20 });
    const broken = new FixtureProvider({ create: () => { throw new Error('basic shape unavailable'); } });
    expect(() => broken.create('q')).toThrow('basic shape unavailable'); expect(ctx.session.requireDocument().findById('q')).toBeUndefined();
  });
  it('assembles offline and restores child roots on validation failure', () => {
    const node = new FixtureComposite('p'); const child = new FixtureLeaf('p-a');
    expect(() => SubtreeBuilder.assemble(node, [child])).toThrow('invalid fixture structure');
    expect(node.children).toEqual([]); expect(child.parent).toBeNull(); expect(child.document).toBeNull();
    const second = new FixtureLeaf('p-b'); SubtreeBuilder.assemble(node, [child, second]);
    expect(child.parent).toBe(node); expect(node.document).toBeNull();
    expect(() => SubtreeBuilder.assemble(node, [])).toThrow('container is not empty and detached');
  });
  it('preflights repeated IDs and attached children without altering any parent', () => {
    const first = new FixtureLeaf('same'); const second = new FixtureLeaf('same'); const root = new SvgGroup('root');
    expect(() => SubtreeBuilder.assemble(root, [first, second])).toThrow('id already exists: same');
    expect(first.parent).toBeNull(); expect(second.parent).toBeNull(); expect(root.children).toEqual([]);
    const doc = new SvgDocument(); doc.append(first);
    expect(() => SubtreeBuilder.assemble(root, [first])).toThrow('child is not detached'); doc.verifyInvariants();
  });
  it('rejects a derived subtree ID collision before registering the root or any child', () => {
    const ctx = context();
    ctx.run(new CreateCommand(ctx.session, 'rect', 'q-b', ['0','0','1','1']));
    const before = ctx.session.snapshot(); const status = ctx.history.status;
    expect(ctx.executor.execute(new CreateCommand(ctx.session, 'fixture', 'q', []))).toMatchObject({ ok: false, error: 'id already exists: q-b' });
    expect(ctx.session.snapshot()).toEqual(before); expect(ctx.history.status).toEqual(status);
    expect(ctx.session.requireDocument().findById('q')).toBeUndefined(); expect(ctx.session.requireDocument().findById('q-a')).toBeUndefined();
  });
  it('protects required parts through delete, addto, group, ungroup and direct aggregate operations', () => {
    const ctx = context(); const doc = ctx.session.requireDocument(); const p = doc.requireById('p');
    const before = ctx.session.snapshot(); const status = ctx.history.status;
    for (const command of [new DeleteCommand(ctx.session, 'p-a'), new AddToCommand(ctx.session, 'outer', 'p-a'),
      new GroupCommand(ctx.session, 'stolen', ['p-a','other']), new UngroupCommand(ctx.session, 'p')]) {
      expect(ctx.executor.execute(command)).toMatchObject({ ok: false });
      expect(ctx.session.snapshot()).toEqual(before); expect(ctx.history.status).toEqual(status);
    }
    expect(() => doc.remove('p-a')).toThrow('required component');
    expect(() => doc.planRelocate('p-a', null, 0)).toThrow('required component');
    ctx.run(new CreateCommand(ctx.session, 'rect', 'forbidden', ['0','0','1','1']));
    expect(ctx.executor.execute(new AddToCommand(ctx.session, 'p', 'forbidden'))).toMatchObject({ ok: false, error: 'component rejected' });
    ctx.run(new DeleteCommand(ctx.session, 'forbidden'));
    expect(ctx.executor.execute(new CreateCommand(ctx.session, 'rect', 'forbidden', ['0','0','1','1'], 'p'))).toMatchObject({ ok: false, error: 'component rejected' });
    expect(doc.requireById('p')).toBe(p); doc.verifyInvariants();
  });
  it('allows nesting, extra children and ordering while undo/redo preserves complete subtree identity', () => {
    const ctx = context(); const doc = ctx.session.requireDocument(); const p = doc.requireById('p'); const part = doc.requireById('p-a');
    ctx.run(new CreateCommand(ctx.session, 'fixture', 'q', [], 'p'));
    ctx.run(new AddToCommand(ctx.session, 'p', 'other'));
    const before = ctx.session.snapshot();
    for (const command of [new FrontCommand(ctx.session, 'p-a'), new BackCommand(ctx.session, 'p-a'),
      new MoveCommand(ctx.session, 'p', 10, -2), new ScaleCommand(ctx.session, 'p', 2),
      new DeleteCommand(ctx.session, 'p')]) {
      ctx.run(command); const applied = ctx.session.snapshot(); ctx.history.undo(); ctx.history.redo();
      expect(ctx.session.snapshot()).toEqual(applied); ctx.history.undo();
      expect(ctx.session.snapshot()).toEqual(before); expect(doc.requireById('p')).toBe(p); expect(doc.requireById('p-a')).toBe(part);
      doc.verifyInvariants();
    }
    ctx.run(new CreateCommand(ctx.session, 'rect', 'sibling', ['0','0','1','1'], 'outer'));
    ctx.run(new GroupCommand(ctx.session, 'wrapper', ['p','sibling']));
    expect(p.parent).toBe(doc.requireById('wrapper')); ctx.history.undo(); expect(p.parent).toBe(doc.requireById('outer'));
    ctx.history.redo(); expect(doc.requireById('p-a')).toBe(part); doc.verifyInvariants();
  });
  it('rejects invalid offline subtrees before document insertion', () => {
    const doc = new SvgDocument(); const node = new FixtureComposite('p');
    expect(() => doc.append(node)).toThrow('invalid fixture structure'); expect(doc.size).toBe(0); expect(node.parent).toBeNull();
    const parent = new SvgGroup('parent');
    expect(() => SubtreeBuilder.assemble(parent, [node])).toThrow('invalid fixture structure');
    expect(parent.children).toEqual([]); expect(node.parent).toBeNull();
  });
});

describe('Semantic identity, display identity and SVG restore', () => {
  it('uses g for display and XML but retains semantic type, styles and complete nested restore', () => {
    const ctx = context(); ctx.run(new CreateCommand(ctx.session, 'fixture', 'q', [], 'p'));
    ctx.session.requireDocument().requireById('p').setAttribute('fill', 'red');
    const node = new SceneQuery().show(ctx.session.requireDocument(), 'p');
    expect(node).toMatchObject({ semanticType: 'fixture', displayType: 'g', isContainer: true });
    const writer = new SvgWriter(); const xml = writer.serialize(ctx.session.requireDocument());
    expect(xml).toContain('<g id="p" data-kind="fixture" fill="red">');
    const reader = new SvgReader(ctx.shapes); const parsed = reader.parse(xml);
    expect(parsed.document.requireById('p').type).toBe('fixture'); expect(parsed.document.requireById('q').type).toBe('fixture');
    expect(parsed.document.requireById('p-a').parent).toBe(parsed.document.requireById('p'));
    expect(writer.serialize(parsed.document)).toBe(xml); parsed.document.verifyInvariants();
  });
  it('downgrades unknown data-kind to an ordinary g while preserving descendants and styles', () => {
    const ctx = createDefaultContext(); const result = new SvgReader(ctx.shapes).parse(wrap(valid.replace('data-kind="fixture"','data-kind="uninstalled" fill="red"')));
    expect(result.document.requireById('p').type).toBe('g');
    expect(result.document.requireById('p').getAttributes()).toEqual({ fill: 'red' });
    expect([...result.document].map(node => node.id)).toEqual(['p','p-a','p-b']);
    expect(new SvgWriter().serialize(result.document)).not.toContain('data-kind');
  });
  it.each([true, false])('rejects duplicate IDs before restore or downgrade (registered=%s)', registered => {
    const ctx = createDefaultContext(); if (registered) ctx.shapeProviders.register(new FixtureProvider());
    expect(() => new SvgReader(ctx.shapes).parse(wrap(valid.replace('id="p-b"','id="p-a"')))).toThrow('id already exists: p-a');
  });
  it('rejects damaged registered composites and preserves active document, source path and redo', () => {
    const ctx = context(); const doc = ctx.session.requireDocument(); ctx.session.load(doc, '/original.svg'); ctx.history.undo();
    const status = ctx.history.status; const before = ctx.session.snapshot();
    const store = { read: () => ({ ...new SvgReader(ctx.shapes).parse(wrap('<g id="p" data-kind="fixture"><rect id="p-a"/></g>')), sourcePath: '/new.svg' }) };
    expect(ctx.executor.execute(new ReadCommand(ctx.session, store, '/new.svg'))).toMatchObject({ ok: false, error: 'invalid fixture structure: p' });
    expect(ctx.session.requireDocument()).toBe(doc); expect(ctx.session.snapshot()).toEqual(before); expect(ctx.history.status).toEqual(status);
    ctx.history.redo(); expect(doc.findById('other')).toBeDefined();
  });
  it('keeps strict validation for unrelated metadata and data-kind on leaves', () => {
    const ctx = createDefaultContext(); const reader = new SvgReader(ctx.shapes);
    expect(() => reader.parse(wrap('<g data-other="value"/>'))).toThrow('unknown attribute: data-other');
    expect(() => reader.parse(wrap('<rect data-kind="fixture"/>'))).toThrow('unknown attribute: data-kind');
  });
});
