import { describe, expect, it } from 'vitest';
import { CommandExecutor, CommandHistory, EditorSession, ExtensionRegistry, NodeEditCommand, SubtreeBuilder, SvgGroup, SvgNode,
  type ChangeSet, type CommandDefinition, type CommandResult } from '@svgframe/core';
import { StatsCommand } from '../src/StatsCommand.js';
import { StatsCommandDefinition } from '../src/StatsCommandDefinition.js';
import { StatsPlugin } from '../src/StatsPlugin.js';

class StubLeaf extends SvgNode {
  public constructor(id: string, private readonly semanticType: string) { super(id); }
  public get type() { return this.semanticType; }
}
class StubComposite extends SvgGroup { public override get type() { return 'fixture-composite'; } }
class PaintCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string, private readonly color: string) { super(session, id); }
  protected plan(node: SvgNode): ChangeSet { return node.planSetAttribute('fill', this.color); }
  protected result(): CommandResult { return { kind: 'lines', lines: ['painted'] }; }
}
const leaf = (id: string, type: string) => new StubLeaf(id, type);

describe('stats plugin using only public core and test nodes', () => {
  it('registers its command and help through a minimal injected context', () => {
    const session = new EditorSession(); const commands = new ExtensionRegistry<CommandDefinition>('commands');
    new StatsPlugin().activate({ session, commands });
    expect(commands.values()).toHaveLength(1);
    expect(commands.get('stats')).toMatchObject({ name: 'stats', syntax: 'stats', description: 'count leaf shapes by type and containers' });
    expect(commands.get('stats')!.build([]).kind).toBe('query');
  });
  it('preserves the existing no-document error', () => {
    expect(() => new StatsCommand(new EditorSession()).execute()).toThrow("no document. use 'init' or 'read' first");
  });
  it.each([false, true])('rejects an extra argument (quoted=%s) before execution', quoted => {
    const definition = new StatsCommandDefinition(new EditorSession());
    expect(() => definition.build([{ value: '', quoted }])).toThrow('usage: stats');
  });
  it('excludes the SVG root and produces the exact empty output', () => {
    const session = new EditorSession(); session.initialize();
    expect(new StatsCommand(session).execute()).toEqual({ kind: 'lines', lines: ['(total 0, containers 0)'] });
  });
  it('counts empty ordinary and semantic containers without treating them as leaves', () => {
    const session = new EditorSession(); const document = session.initialize();
    document.append(new SvgGroup('empty')); document.append(new StubComposite('compound'));
    expect(new StatsCommand(session).execute()).toEqual({ kind: 'lines', lines: ['(total 0, containers 2)'] });
  });
  it('counts internal leaves through DFS and matches the required two-space summary', () => {
    const session = new EditorSession(); const document = session.initialize();
    const compound = SubtreeBuilder.assemble(new StubComposite('compound'), [leaf('c','circle'), leaf('r2','rect'), leaf('t','text')]);
    document.append(SubtreeBuilder.assemble(new SvgGroup('g'), [leaf('r1','rect'), compound, leaf('r3','rect')]));
    document.append(leaf('t2','text'));
    expect(new StatsCommand(session).execute()).toEqual({ kind: 'lines', lines: ['rect: 3  circle: 1  text: 2  (total 6, containers 2)'] });
  });
  it('orders types by first encounter rather than sorting names or counting by root breadth', () => {
    const session = new EditorSession(); const document = session.initialize();
    document.append(SubtreeBuilder.assemble(new SvgGroup('g'), [leaf('z','z-type'), leaf('a','a-type'), leaf('z2','z-type')]));
    document.append(leaf('b','b-type'));
    expect(new StatsCommand(session).execute()).toEqual({ kind: 'lines', lines: ['z-type: 2  a-type: 1  b-type: 1  (total 4, containers 1)'] });
    const relocation = document.planRelocate('b', null, 0); relocation.apply();
    expect(new StatsCommand(session).execute()).toMatchObject({ lines: ['b-type: 1  z-type: 2  a-type: 1  (total 4, containers 1)'] });
    relocation.revert(); document.verifyInvariants();
  });
  it('uses container capability rather than hardcoded semantic names', () => {
    const session = new EditorSession(); const document = session.initialize();
    document.append(new StubComposite('custom')); document.append(leaf('g-looking-leaf','g'));
    expect(new StatsCommand(session).execute()).toMatchObject({ lines: ['g: 1  (total 1, containers 1)'] });
  });
  it('keeps source, model identities, both stacks and observers unchanged across success and failure', () => {
    const session = new EditorSession(); const document = session.initialize(); const node = leaf('r','rect'); document.append(node);
    session.load(document, '/source.svg');
    const history = new CommandHistory(session.events); const executor = new CommandExecutor(history);
    expect(executor.execute(new PaintCommand(session,'r','red')).ok).toBe(true);
    expect(executor.execute(new PaintCommand(session,'r','blue')).ok).toBe(true); history.undo();
    const before = session.snapshot(); const status = history.status; let notifications = 0;
    const subscription = session.events.subscribe(() => { notifications++; });
    expect(executor.execute(new StatsCommand(session))).toMatchObject({ ok: true });
    const failing = new StatsCommand({ requireDocument: () => { throw new Error('receiver failed'); } });
    expect(executor.execute(failing)).toEqual({ ok: false, error: 'receiver failed' });
    expect(() => new StatsCommandDefinition(session).build([{ value: 'extra', quoted: false }])).toThrow('usage: stats');
    expect(session.snapshot()).toEqual(before); expect(history.status).toEqual(status);
    expect(document.requireById('r')).toBe(node); expect(node.parent).toBe(document); expect(node.document).toBe(document); expect(notifications).toBe(0);
    history.redo(); expect(node.getAttributes().fill).toBe('blue'); history.undo(); history.undo(); expect(node.getAttributes().fill).toBeUndefined();
    document.verifyInvariants(); subscription.dispose();
  });
  it('does not unlock a document-command history barrier', () => {
    const session = new EditorSession(); session.initialize(); const history = new CommandHistory(session.events); history.barrier('init');
    expect(new CommandExecutor(history).execute(new StatsCommand(session)).ok).toBe(true);
    expect(history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    expect(() => history.undo()).toThrow('undo not allowed after io command');
  });
});
