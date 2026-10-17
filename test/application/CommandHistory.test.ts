import { describe, expect, it } from 'vitest';
import { CommandHistory } from '../../src/application/CommandHistory.js';
import { CommandExecutor } from '../../src/application/CommandExecutor.js';
import { EditorSession } from '../../src/application/EditorSession.js';
import { CreateCommand } from '../../src/application/commands/CreateCommand.js';
import { CommandDispatcher } from '../../src/cli/CommandDispatcher.js';
import type { SvgNode } from '../../src/domain/SvgNode.js';

function harness() {
  const session = new EditorSession();
  const history = new CommandHistory();
  const executor = new CommandExecutor(history);
  const dispatcher = new CommandDispatcher(session, history, {
    save: () => { throw new Error('unexpected file write'); }, read: () => { throw new Error('unexpected file read'); },
  });
  const run = (line: string) => {
    const command = dispatcher.parse(line);
    if (command === null) throw new Error('test requires a command');
    return executor.execute(command);
  };
  const ok = (line: string) => { expect(run(line), line).toMatchObject({ ok: true }); };
  const snapshot = () => {
    const document = session.requireDocument();
    document.verifyInvariants();
    return {
      size: [document.width, document.height], roots: document.children.map(node => node.id),
      nodes: [...document].map(node => ({
        id: node.id, type: node.type, attributes: node.getAttributes(),
        parent: node.parent !== null && 'id' in node.parent ? node.parent.id : null,
        children: node.children.map(child => child.id),
      })),
    };
  };
  return { session, history, executor, dispatcher, run, ok, snapshot };
}

describe('CommandHistory through the shared invoker', () => {
  it('restores every prefix, node identity and subtree index across all editing commands', () => {
    const h = harness(); h.ok('init');
    const lines = [
      'create g outer', 'create g dest', 'create rect a 0.1 0.2 3 4 in outer',
      'create circle b 5 6 7 in outer', 'create text t 8 9 "原文" in outer',
      'create ellipse e 1 2 3 4', 'create line l 1 2 3 4',
      'group g b e a', 'move g 0.2 0.3', 'scale outer 0.3',
      'set g fill red', 'set t text "新内容"', 'set a stroke-width 2',
      'addto dest g', 'front e', 'back l', 'ungroup g',
      'create g inner in dest', 'create text deep 1 2 "深层" in inner', 'delete dest',
    ];
    const snapshots = [h.snapshot()];
    const identities = new Map<string, SvgNode>();
    for (const [index, line] of lines.entries()) {
      h.ok(line); snapshots.push(h.snapshot());
      for (const node of h.session.requireDocument()) identities.set(node.id, node);
      expect(h.history.status).toEqual({ undoCount: index + 1, redoCount: 0, blocked: false });
    }
    for (let index = lines.length - 1; index >= 0; index--) {
      h.ok('undo'); expect(h.snapshot()).toEqual(snapshots[index]);
      for (const node of h.session.requireDocument()) expect(node).toBe(identities.get(node.id));
      expect(h.history.status).toEqual({ undoCount: index, redoCount: lines.length - index, blocked: false });
    }
    expect(h.run('undo')).toEqual({ ok: false, error: 'nothing to undo' });
    for (let index = 0; index < lines.length; index++) {
      h.ok('redo'); expect(h.snapshot()).toEqual(snapshots[index + 1]);
      for (const node of h.session.requireDocument()) expect(node).toBe(identities.get(node.id));
    }
    expect(h.run('redo')).toEqual({ ok: false, error: 'nothing to redo' });
    h.ok('undo'); h.ok('redo'); expect(h.snapshot()).toEqual(snapshots.at(-1));
  });

  it('keeps redo across failures and queries, and clears it after a successful new edit', () => {
    const h = harness(); h.ok('init'); h.ok('create rect a 1 2 3 4');
    h.ok('set a fill red'); h.ok('undo');
    const before = h.snapshot(); const status = h.history.status;
    for (const line of ['tree', 'show a', 'canvas', 'help']) h.ok(line);
    for (const line of ['move missing 1 2', 'scale a 0', 'set a width -1', 'create rect a 0 0 1 1']) {
      expect(h.run(line).ok, line).toBe(false);
      expect(h.snapshot()).toEqual(before); expect(h.history.status).toEqual(status);
    }
    expect(() => h.dispatcher.parse('move a')).toThrow('usage:');
    expect(h.history.status).toEqual(status);
    h.ok('redo'); expect(h.session.requireDocument().requireById('a').getAttributes().fill).toBe('red');
    h.ok('undo'); h.ok('move a 0 0');
    expect(h.history.status).toEqual({ undoCount: 2, redoCount: 0, blocked: false });
    expect(h.run('redo')).toEqual({ ok: false, error: 'nothing to redo' });
  });

  it('retains both stacks when a real undo or redo fails and allows retry', () => {
    const h = harness(); h.ok('init'); h.ok('create g g'); h.ok('delete g');
    const document = h.session.requireDocument();
    new CreateCommand(h.session, 'g', 'g', []).execute(); // Simulate an external mutation.
    let before = h.snapshot(); let status = h.history.status;
    expect(h.run('undo').ok).toBe(false);
    expect(h.snapshot()).toEqual(before); expect(h.history.status).toEqual(status);
    document.remove('g'); h.ok('undo'); h.ok('undo');
    new CreateCommand(h.session, 'g', 'g', []).execute();
    before = h.snapshot(); status = h.history.status;
    expect(h.run('redo').ok).toBe(false);
    expect(h.snapshot()).toEqual(before); expect(h.history.status).toEqual(status);
    document.remove('g'); h.ok('redo'); h.ok('redo');
    expect(document.findById('g')).toBeUndefined();
    document.verifyInvariants();
  });

  it('rejects an edit without an undo protocol before it can execute', () => {
    const h = harness(); h.ok('init');
    let executed = false;
    expect(h.executor.execute({ kind: 'edit', execute: () => {
      executed = true;
      return { kind: 'canvas', operation: 'queried', width: 1, height: 1 };
    } }).ok).toBe(false);
    expect(executed).toBe(false);
    expect(h.history.status.undoCount).toBe(0);
  });

  it('checks document availability and enforces zero-argument history syntax', () => {
    const h = harness();
    for (const line of ['undo', 'redo']) {
      expect(h.run(line)).toEqual({ ok: false, error: "no document. use 'init' or 'read' first" });
      expect(() => h.dispatcher.parse(`${line} extra`)).toThrow(`usage: ${line}`);
    }
  });

  it.each(['init 400 300', 'canvas 400 300'])('makes %s a barrier until a successful edit', boundary => {
    const h = harness(); h.ok('init'); h.ok('create g g'); h.ok('create g other'); h.ok('undo');
    h.ok(boundary);
    expect(h.history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    const before = h.snapshot();
    for (const line of ['tree', 'canvas', 'help']) h.ok(line);
    for (const line of ['move missing 1 2', 'create box box', 'init -1 300', 'canvas 400 0']) {
      expect(h.run(line).ok).toBe(false);
      expect(h.snapshot()).toEqual(before);
      expect(h.history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    }
    for (const line of ['undo', 'redo']) {
      expect(h.run(line)).toEqual({ ok: false, error: 'undo not allowed after io command' });
    }
    h.ok('create g fresh'); h.ok('undo');
    expect(h.snapshot()).toEqual(before);
    expect(h.run('undo')).toEqual({ ok: false, error: 'nothing to undo' });
    h.ok('redo'); expect(h.session.requireDocument().findById('fresh')).toBeDefined();
  });

  it('preserves an active redo branch and document identity after failed document commands', () => {
    const h = harness(); h.ok('init'); h.ok('create g g'); h.ok('undo');
    const document = h.session.requireDocument(); const before = h.snapshot(); const status = h.history.status;
    for (const line of ['init 0 600', 'canvas 800 -1']) {
      expect(h.run(line).ok).toBe(false);
      expect(h.session.requireDocument()).toBe(document);
      expect(h.snapshot()).toEqual(before); expect(h.history.status).toEqual(status);
    }
    h.ok('redo'); expect(document.findById('g')).toBeDefined();
  });

  it('guards a command retained across an external document replacement without dropping it', () => {
    const h = harness(); h.ok('init'); h.ok('create g g');
    h.session.initialize();
    const before = h.snapshot(); const status = h.history.status;
    expect(h.run('undo').ok).toBe(false);
    expect(h.snapshot()).toEqual(before); expect(h.history.status).toEqual(status);
  });

  it('matches a cursor-based timeline under repeated undo, redo, failure and branching', () => {
    const h = harness(); h.ok('init');
    // A document-state timeline is the test oracle, not the production undo strategy.
    const timeline = [h.snapshot()]; let cursor = 0; let blocked = true;
    const actions = [
      'create circle c 0.1 0.2 3', 'move c 0.2 0.3', 'undo', 'tree', 'redo',
      'undo', 'scale c 0', 'redo', 'set c fill red', 'undo', 'set c stroke blue', 'redo',
      'undo', 'undo', 'undo', 'undo', 'redo', 'redo', 'help', 'canvas', 'redo',
    ];
    for (const line of [...actions, ...actions.slice(1), ...actions.slice(1)]) {
      const result = h.run(line);
      if (line === 'undo') {
        if (cursor === 0) expect(result.ok).toBe(false);
        else { expect(result.ok).toBe(true); cursor--; }
      } else if (line === 'redo') {
        if (cursor === timeline.length - 1) expect(result.ok).toBe(false);
        else { expect(result.ok).toBe(true); cursor++; }
      } else if (!['tree', 'help', 'canvas'].includes(line) && result.ok) {
        timeline.splice(cursor + 1); timeline.push(h.snapshot()); cursor++; blocked = false;
      }
      expect(h.snapshot(), line).toEqual(timeline[cursor]);
      expect(h.history.status, line).toEqual({ undoCount: cursor, redoCount: timeline.length - cursor - 1, blocked });
    }
  });

  it('keeps a compound undo on its stack after partial rollback and retries it as one unit', () => {
    const h = harness(); h.ok('init');
    for (const line of ['create g A', 'create g B', 'create g x in A', 'create g y in A',
      'create rect a 1 2 3 4 in A', 'create circle c 5 6 7 in B']) h.ok(line);
    const original = h.snapshot(); h.ok('group g c a');
    const document = h.session.requireDocument(); const A = document.requireById('A');
    const x = document.remove('x'); const y = document.remove('y');
    const before = h.snapshot(); const status = h.history.status;
    expect(h.run('undo')).toEqual({ ok: false, error: 'invalid child index' });
    expect(h.snapshot()).toEqual(before); expect(h.history.status).toEqual(status);
    document.insert(x, 0, A); document.insert(y, 1, A);
    h.ok('undo'); expect(h.snapshot()).toEqual(original);
    expect(h.history.status.undoCount).toBe(status.undoCount - 1);
    h.ok('redo'); expect(document.requireById('g').children.map(node => node.id)).toEqual(['a', 'c']);
  });
});
