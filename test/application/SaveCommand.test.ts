import { describe, expect, it, vi } from 'vitest';
import { EditorSession } from '../../src/application/EditorSession.js';
import { CommandExecutor } from '../../src/application/CommandExecutor.js';
import { CommandHistory } from '../../src/application/CommandHistory.js';
import { SaveCommand } from '../../src/application/commands/SaveCommand.js';
import { CreateCommand } from '../../src/application/commands/CreateCommand.js';
import { InitCommand } from '../../src/application/commands/InitCommand.js';

describe('SaveCommand and the history boundary', () => {
  const scene = () => {
    const session = new EditorSession(); const history = new CommandHistory(); const executor = new CommandExecutor(history);
    executor.execute(new InitCommand(session)); executor.execute(new CreateCommand(session, 'g', 'g', []));
    executor.execute(new CreateCommand(session, 'text', 't', ['1', '2', '中文'], 'g')); history.undo();
    return { session, history, executor };
  };

  it('requires a document before validating the save target', () => {
    const save = vi.fn();
    expect(() => new SaveCommand(new EditorSession(), { save }).execute()).toThrow("no document. use 'init' or 'read' first");
    expect(save).not.toHaveBeenCalled();
  });

  it('writes through the port, counts groups and clears history only after success', () => {
    const { session, history, executor } = scene(); const document = session.requireDocument(); const group = document.requireById('g');
    const save = vi.fn(() => {
      expect(history.status).toEqual({ undoCount: 1, redoCount: 1, blocked: false });
    });
    expect(executor.execute(new SaveCommand(session, { save }, 'relative path.svg'))).toEqual({
      ok: true, result: { kind: 'saved', path: 'relative path.svg', count: 1 },
    });
    expect(save).toHaveBeenCalledExactlyOnceWith(document, 'relative path.svg');
    expect(history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    expect(() => history.undo()).toThrow('undo not allowed after io command');
    expect(() => history.redo()).toThrow('undo not allowed after io command');
    expect(session.requireDocument()).toBe(document); expect(document.requireById('g')).toBe(group);
    document.verifyInvariants();
  });

  it('preserves the document and both stacks when the writer fails', () => {
    const { session, history, executor } = scene(); const document = session.requireDocument();
    const status = history.status; const group = document.requireById('g');
    const result = executor.execute(new SaveCommand(session, { save: () => { throw new Error('disk full'); } }, 'bad.svg'));
    expect(result).toEqual({ ok: false, error: 'cannot write file: bad.svg' });
    expect(history.status).toEqual(status); expect(session.requireDocument()).toBe(document);
    expect(document.requireById('g')).toBe(group); history.redo();
    expect(document.requireById('t').parent).toBe(group); document.verifyInvariants();
  });

  it('does not establish a default path after an explicit save', () => {
    const { session, history, executor } = scene(); const save = vi.fn();
    expect(executor.execute(new SaveCommand(session, { save }, 'a.svg')).ok).toBe(true);
    executor.execute(new CreateCommand(session, 'g', 'fresh', [])); const status = history.status;
    expect(executor.execute(new SaveCommand(session, { save }))).toEqual({
      ok: false, error: "no source path. use 'save <file.svg>'",
    });
    expect(save).toHaveBeenCalledTimes(1); expect(history.status).toEqual(status);
    history.undo(); expect(session.requireDocument().findById('fresh')).toBeUndefined();
  });
});
