import { describe, expect, it } from 'vitest';
import { CommandExecutor, type SessionEvent, type SessionSnapshot } from '@svgframe/core';
import { CanvasCommand, CreateCommand, InitCommand, ReadCommand, SaveCommand, SetAttributeCommand, TreeCommand } from '@svgframe/builtin-commands';
import { createDefaultContext } from '../../src/host/composition.js';
import { SvgReader } from '../../src/host/svg/SvgReader.js';

function fixture() {
  const ctx = createDefaultContext(); const executor = new CommandExecutor(ctx.history);
  let writeFails = false; let readFails = false;
  const store = {
    save: () => { if (writeFails) throw new Error('disk full'); },
    read: () => {
      if (readFails) throw new Error('bad read');
      return { ...new SvgReader(ctx.shapes).parse('<svg width="10" height="20"><g id="g"><rect id="r"/></g></svg>'), sourcePath: '/read.svg' };
    },
  };
  const run = (command: Parameters<CommandExecutor['execute']>[0]) => {
    const result = executor.execute(command); if (!result.ok) throw new Error(result.error); return result.result;
  };
  return { ...ctx, executor, run, store, failWrite: (flag: boolean) => { writeFails = flag; }, failRead: (flag: boolean) => { readFails = flag; } };
}

describe('Post-commit lifecycle notifications and immutable scenes', () => {
  it('emits all seven successful operation kinds after history bookkeeping, with no query or failure events', () => {
    const ctx = fixture(); const events: SessionEvent[] = []; const histories: unknown[] = [];
    const subscription = ctx.events.subscribe(event => { events.push(event); histories.push(ctx.history.status); });
    expect(ctx.session.snapshot()).toEqual({ document: null, sourcePath: null });
    ctx.run(new InitCommand(ctx.session));
    ctx.run(new CreateCommand(ctx.session, 'rect', 'r', ['1','2','3','4']));
    ctx.history.undo(); ctx.history.redo();
    ctx.run(new SaveCommand(ctx.session, ctx.store, '/save.svg'));
    ctx.run(new ReadCommand(ctx.session, ctx.store, '/read.svg'));
    ctx.run(new CanvasCommand(ctx.session, [30,40]));
    expect(events.map(event => event.kind)).toEqual(['init','edit','undo','redo','save','read','canvas']);
    expect(histories[1]).toEqual({ undoCount: 1, redoCount: 0, blocked: false });
    expect(histories[2]).toEqual({ undoCount: 0, redoCount: 1, blocked: false });
    expect(histories[4]).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    expect(events[5]!.snapshot.sourcePath).toBe('/read.svg');
    ctx.run(new CanvasCommand(ctx.session)); ctx.run(new TreeCommand(ctx.session));
    ctx.failWrite(true); expect(ctx.executor.execute(new SaveCommand(ctx.session, ctx.store, '/fail.svg')).ok).toBe(false);
    ctx.failRead(true); expect(ctx.executor.execute(new ReadCommand(ctx.session, ctx.store, '/fail.svg')).ok).toBe(false);
    expect(ctx.executor.execute(new SetAttributeCommand(ctx.session, 'r', 'bad', 'x')).ok).toBe(false);
    expect(ctx.executor.execute(new InitCommand(ctx.session, -1, 20)).ok).toBe(false);
    expect(events).toHaveLength(7);
    subscription.dispose(); subscription.dispose(); ctx.run(new InitCommand(ctx.session)); expect(events).toHaveLength(7);
  });

  it('freezes every projection and retains independent canvas, attributes, topology and geometry values', () => {
    const ctx = fixture(); ctx.run(new ReadCommand(ctx.session, ctx.store, '/read.svg'));
    const before = ctx.session.snapshot(); const scene = before.document!; const rect = scene.nodes[1]!;
    for (const value of [before, scene, scene.rootIds, scene.nodes, rect, rect.parent, rect.childIds, rect.geometry, rect.attributes, rect.description]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    if (rect.description.kind === 'properties') expect(Object.isFrozen(rect.description.values)).toBe(true);
    expect(scene.rootIds).toEqual(['g']); expect(scene.nodes[0]!.childIds).toEqual(['r']);
    expect(rect.parent).toEqual({ id: 'g', type: 'g' });
    expect(() => { (rect.attributes as Record<string, string>).fill = 'illegal'; }).toThrow();
    ctx.run(new SetAttributeCommand(ctx.session, 'r', 'fill', 'red'));
    ctx.run(new CanvasCommand(ctx.session, [30,40]));
    expect(scene.width).toBe(10); expect(rect.attributes.fill).toBeUndefined();
    expect(ctx.session.snapshot().document!.nodes[1]!.attributes.fill).toBe('red');
  });

  it('isolates failing observers and retains diagnostic messages after edit, undo, redo and actual successful save', () => {
    const ctx = fixture(); let observed = 0; let saved = 0;
    ctx.events.subscribe(() => { throw new Error('observer broken'); });
    ctx.events.subscribe(() => { observed++; });
    ctx.run(new InitCommand(ctx.session)); ctx.run(new CreateCommand(ctx.session, 'g', 'g', []));
    ctx.history.undo(); ctx.history.redo();
    ctx.run(new SaveCommand(ctx.session, { save: () => { saved++; } }, '/saved.svg'));
    expect(saved).toBe(1); expect(observed).toBe(5); expect(ctx.events.diagnostics).toEqual(Array(5).fill('observer broken'));
    expect(ctx.history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
  });

  it('supports a test-only saved-content observer across same-value edits, undo, redo, branches, save failure and canvas changes', () => {
    const ctx = fixture(); let baseline = ''; let dirty = false;
    const signature = (snapshot: SessionSnapshot) => JSON.stringify(snapshot.document);
    const subscription = ctx.events.subscribe(event => {
      if (['init','read','save'].includes(event.kind)) baseline = signature(event.snapshot);
      dirty = signature(event.snapshot) !== baseline;
    });
    ctx.decorators.register({ name: 'fixture-content-status', decorate: () => dirty ? '*' : undefined });
    ctx.run(new InitCommand(ctx.session)); expect(dirty).toBe(false);
    ctx.run(new CreateCommand(ctx.session, 'rect', 'r', ['1','2','3','4'])); expect(dirty).toBe(true);
    expect(ctx.run(new TreeCommand(ctx.session))).toMatchObject({ kind: 'tree', snapshot: { rootSuffixes: ['*'], entries: [{ suffixes: ['*'] }] } });
    ctx.run(new SaveCommand(ctx.session, ctx.store, '/saved.svg')); expect(dirty).toBe(false);
    ctx.run(new SetAttributeCommand(ctx.session, 'r', 'x', 1)); expect(dirty).toBe(false);
    ctx.run(new SetAttributeCommand(ctx.session, 'r', 'fill', 'red')); expect(dirty).toBe(true);
    ctx.history.undo(); expect(dirty).toBe(false); ctx.history.redo(); expect(dirty).toBe(true);
    ctx.history.undo(); ctx.run(new SetAttributeCommand(ctx.session, 'r', 'fill', 'blue')); expect(dirty).toBe(true); expect(ctx.history.status.redoCount).toBe(0);
    ctx.failWrite(true); ctx.executor.execute(new SaveCommand(ctx.session, ctx.store, '/bad.svg')); expect(dirty).toBe(true);
    ctx.failWrite(false); ctx.run(new SaveCommand(ctx.session, ctx.store, '/good.svg')); expect(dirty).toBe(false);
    ctx.run(new CanvasCommand(ctx.session, [900,600])); expect(dirty).toBe(true);
    ctx.run(new ReadCommand(ctx.session, ctx.store, '/read.svg')); expect(dirty).toBe(false);
    ctx.run(new InitCommand(ctx.session)); expect(dirty).toBe(false); subscription.dispose();
  });

  it('keeps subscriptions and diagnostics isolated between sessions', () => {
    const first = fixture(); const second = fixture(); let observed = 0;
    first.events.subscribe(() => { observed++; }); second.run(new InitCommand(second.session)); expect(observed).toBe(0);
    first.run(new InitCommand(first.session)); expect(observed).toBe(1); expect(second.events.diagnostics).toEqual([]);
  });
});
