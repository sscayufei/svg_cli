import { describe, expect, it } from 'vitest';
import { ChangeSet, CommandExecutor, NodeEditCommand, type AttributeEdits, type AttributeHandler, type AttributeTarget,
  type CommandResult, type SvgNode } from '@svgframe/core';
import { CreateCommand, SetAttributeCommand } from '@svgframe/builtin-commands';
import { createDefaultContext } from '../../src/host/composition.js';
import { FixtureProvider } from './fixtures/composite.js';

class PairHandler implements AttributeHandler {
  public readonly name = 'pair-color';
  public calls = 0;
  public retained: AttributeEdits | undefined;
  public failure: 'none' | 'throw' | 'output' = 'none';
  public handles(target: AttributeTarget, attribute: string) { return target.semanticType === 'fixture' && attribute === 'pair-color'; }
  public apply(target: AttributeTarget, _attribute: string, value: string | number, edits: AttributeEdits) {
    this.calls++; this.retained = edits;
    expect(Object.isFrozen(target)).toBe(true);
    expect(Object.isFrozen(target.attributes)).toBe(true);
    expect(Object.isFrozen(target.children)).toBe(true);
    expect(Object.keys(edits).sort()).toEqual(['read', 'setAttribute']);
    const previous = edits.read(`${target.id}-a`).attributes.fill;
    edits.setAttribute(`${target.id}-a`, 'fill', value);
    if (this.failure === 'throw') throw new Error('handler failed');
    edits.setAttribute(`${target.id}-b`, 'fill', value);
    return { applied: [this.failure === 'output' ? 'bad\nline' : `paint ${value}`], undone: [`restore ${previous ?? 'absent'}`] };
  }
}
function fixture() {
  const context = createDefaultContext();
  context.shapeProviders.register(new FixtureProvider());
  const handler = new PairHandler(); context.attributes.register(handler);
  const executor = new CommandExecutor(context.history);
  const document = context.session.initialize();
  const create = executor.execute(new CreateCommand(context.session, 'fixture', 'p', []));
  if (!create.ok) throw new Error(create.error);
  return { context, handler, executor, document, set: (value: string) => new SetAttributeCommand(context.session, 'p', 'pair-color', value) };
}

describe('Scoped attribute transactions and failure atomicity', () => {
  it('records two edits as one unit, restores absent attributes and reuses the record on redo', () => {
    const { context, handler, executor, document, set } = fixture();
    const before = context.session.snapshot();
    expect(executor.execute(set('red'))).toMatchObject({ ok: true, result: { kind: 'lines', lines: ['paint red'] } });
    expect(context.history.status.undoCount).toBe(2);
    expect(document.requireById('p-a').getAttributes().fill).toBe('red');
    expect(document.requireById('p-b').getAttributes().fill).toBe('red');
    expect(context.history.undo()).toEqual({ kind: 'lines', lines: ['restore absent'] });
    expect(context.session.snapshot()).toEqual(before);
    handler.failure = 'throw';
    expect(context.history.redo()).toEqual({ kind: 'lines', lines: ['paint red'] });
    expect(handler.calls).toBe(1);
    expect(() => handler.retained!.setAttribute('p-a', 'fill', 'late')).toThrow('transaction is closed');
    expect(() => handler.retained!.read('p-a')).toThrow('transaction is closed');
  });

  it.each(['throw', 'output', 'invariant'] as const)('rolls back %s failure and preserves source, identities, index and existing redo', mode => {
    const { context, handler, executor, document, set } = fixture();
    context.session.load(document, '/original.svg');
    expect(executor.execute(set('blue')).ok).toBe(true); context.history.undo();
    const status = context.history.status; const before = context.session.snapshot();
    const references = [...document];
    handler.failure = mode === 'invariant' ? 'none' : mode;
    const result = executor.execute(set(mode === 'invariant' ? 'invalid' : 'red'));
    expect(result).toMatchObject({ ok: false });
    expect(context.session.snapshot()).toEqual(before);
    expect(context.history.status).toEqual(status);
    expect([...document]).toEqual(references);
    for (const node of references) { expect(document.findById(node.id)).toBe(node); expect(node.document).toBe(document); }
    document.verifyInvariants();
    expect(() => handler.retained!.read('p-a')).toThrow('transaction is closed');
    context.history.redo(); expect(document.requireById('p-b').getAttributes().fill).toBe('blue');
    expect(handler.calls).toBe(2);
  });

  it('rolls back when the second requested attribute is invalid', () => {
    const { context, executor, document } = fixture();
    context.attributes.register({ name: 'bad-second', handles: (_target, name) => name === 'bad-second',
      apply: (_target, _name, _value, edits) => { edits.setAttribute('p-a', 'fill', 'red'); edits.setAttribute('p-b', 'unsupported', 'x'); } });
    const before = context.session.snapshot(); const status = context.history.status;
    expect(executor.execute(new SetAttributeCommand(context.session, 'p', 'bad-second', 'x')).ok).toBe(false);
    expect(context.session.snapshot()).toEqual(before); expect(context.history.status).toEqual(status); document.verifyInvariants();
  });

  it('validates invariants after undo and redo, restoring the prior state when checks fail', () => {
    const { context, executor, document, set, handler } = fixture();
    executor.execute(set('red'));
    const node = document.requireById('p') as import('./fixtures/composite.js').FixtureComposite;
    const original = node.verifyStructure.bind(node);
    let forbidden: string | undefined;
    node.verifyStructure = () => { original(); if (document.requireById('p-a').getAttributes().fill === forbidden) throw new Error('test invariant'); };
    forbidden = undefined;
    const applied = context.session.snapshot(); const appliedStatus = context.history.status;
    expect(() => context.history.undo()).toThrow('test invariant');
    expect(context.session.snapshot()).toEqual(applied); expect(context.history.status).toEqual(appliedStatus);
    forbidden = 'other'; context.history.undo();
    const undone = context.session.snapshot(); const undoneStatus = context.history.status;
    forbidden = 'red';
    expect(() => context.history.redo()).toThrow('test invariant');
    expect(context.session.snapshot()).toEqual(undone); expect(context.history.status).toEqual(undoneStatus);
    forbidden = 'other'; context.history.redo(); expect(handler.calls).toBe(1); document.verifyInvariants();
  });
});

class FragileResult extends NodeEditCommand {
  public fail = true;
  public constructor(session: ReturnType<typeof createDefaultContext>['session']) { super(session, 'r'); }
  protected plan(node: SvgNode): ChangeSet { return node.planSetAttribute('fill', 'red'); }
  protected result(): CommandResult { if (this.fail) throw new Error('result failed'); return { kind: 'lines', lines: ['ok'] }; }
}
describe('Command result failures', () => {
  it('keeps execute, undo and redo retryable without changing history or document', () => {
    const ctx = createDefaultContext(); ctx.session.initialize();
    const executor = new CommandExecutor(ctx.history);
    executor.execute(new CreateCommand(ctx.session, 'rect', 'r', ['0','0','10','10']));
    const command = new FragileResult(ctx.session);
    const before = ctx.session.snapshot(); const status = ctx.history.status;
    expect(executor.execute(command)).toMatchObject({ ok: false, error: 'result failed' });
    expect(ctx.session.snapshot()).toEqual(before); expect(ctx.history.status).toEqual(status);
    command.fail = false; expect(executor.execute(command).ok).toBe(true);
    const applied = ctx.session.snapshot(); const appliedStatus = ctx.history.status;
    command.fail = true; expect(() => ctx.history.undo()).toThrow('result failed');
    expect(ctx.session.snapshot()).toEqual(applied); expect(ctx.history.status).toEqual(appliedStatus);
    command.fail = false; ctx.history.undo(); const undoneStatus = ctx.history.status;
    command.fail = true; expect(() => ctx.history.redo()).toThrow('result failed');
    expect(ctx.session.snapshot()).toEqual(before); expect(ctx.history.status).toEqual(undoneStatus);
    command.fail = false; ctx.history.redo(); expect(ctx.session.snapshot()).toEqual(applied);
  });
});
