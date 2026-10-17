import { describe, expect, it } from 'vitest';
import { EditorSession } from '../../src/application/EditorSession.js';
import { CommandExecutor } from '../../src/application/CommandExecutor.js';
import { CommandHistory } from '../../src/application/CommandHistory.js';
import { ReadCommand } from '../../src/application/commands/ReadCommand.js';
import { SaveCommand } from '../../src/application/commands/SaveCommand.js';
import { InitCommand } from '../../src/application/commands/InitCommand.js';
import { CreateCommand } from '../../src/application/commands/CreateCommand.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';

describe('ReadCommand atomic session replacement and source paths', () => {
  const candidate = (sourcePath = '/read/source.svg') => {
    const document = new SvgDocument(400, 300);
    document.append(new ShapeFactory().create('g', 'g', []));
    return { document, sourcePath, warnings: ['assigned id g to unnamed <g>'] };
  };

  it('can initialize an empty session and commits a validated candidate with warnings', () => {
    const session = new EditorSession(); const history = new CommandHistory(); const executor = new CommandExecutor(history);
    const input = candidate();
    expect(executor.execute(new ReadCommand(session, { read: () => input }, 'source.svg'))).toEqual({
      ok: true, result: { kind: 'read', path: 'source.svg', count: 1, warnings: input.warnings },
    });
    expect(session.requireDocument()).toBe(input.document); expect(session.sourcePath).toBe(input.sourcePath);
    expect(history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
  });

  it('preserves the old document, source and redo when a later read fails', () => {
    const session = new EditorSession(); const history = new CommandHistory(); const executor = new CommandExecutor(history);
    const first = candidate(); executor.execute(new ReadCommand(session, { read: () => first }, 'source.svg'));
    executor.execute(new CreateCommand(session, 'g', 'fresh', [])); history.undo();
    const before = history.status;
    expect(executor.execute(new ReadCommand(session, { read: () => { throw new Error('invalid SVG: later failure'); } }, 'bad.svg')))
      .toEqual({ ok: false, error: 'invalid SVG: later failure' });
    expect(session.requireDocument()).toBe(first.document); expect(session.sourcePath).toBe(first.sourcePath);
    expect(history.status).toEqual(before); history.redo();
    expect(first.document.findById('fresh')).toBeDefined();
  });

  it('saves by read source, preserves it after explicit save, and clears it only after successful init', () => {
    const session = new EditorSession(); const input = candidate();
    new ReadCommand(session, { read: () => input }, 'source.svg').execute();
    const targets: string[] = []; const store = { save: (_document: SvgDocument, path: string) => { targets.push(path); } };
    new SaveCommand(session, store, 'copy.svg').execute(); new SaveCommand(session, store).execute();
    expect(targets).toEqual(['copy.svg', input.sourcePath]);
    expect(() => new InitCommand(session, 0, 1).execute()).toThrow();
    expect(session.sourcePath).toBe(input.sourcePath); expect(session.requireDocument()).toBe(input.document);
    new InitCommand(session).execute(); expect(session.sourcePath).toBeNull();
    expect(() => new SaveCommand(session, store).execute()).toThrow('no source path');
  });

  it('releases prior history after a successful second read', () => {
    const session = new EditorSession(); const history = new CommandHistory(); const executor = new CommandExecutor(history);
    new InitCommand(session).execute(); executor.execute(new CreateCommand(session, 'g', 'old', [])); history.undo();
    const input = candidate('/new.svg'); executor.execute(new ReadCommand(session, { read: () => input }, 'new.svg'));
    expect(history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
    expect(() => history.redo()).toThrow('undo not allowed after io command');
    expect(session.requireDocument().findById('old')).toBeUndefined();
  });

  it('validates replacement metadata before changing the active document or history', () => {
    const session = new EditorSession(); const history = new CommandHistory(); const executor = new CommandExecutor(history);
    const original = candidate(); executor.execute(new ReadCommand(session, { read: () => original }, 'first.svg'));
    executor.execute(new CreateCommand(session, 'g', 'fresh', [])); const status = history.status;
    const invalid = candidate('');
    expect(executor.execute(new ReadCommand(session, { read: () => invalid }, 'invalid.svg')).ok).toBe(false);
    expect(session.requireDocument()).toBe(original.document); expect(session.sourcePath).toBe(original.sourcePath);
    expect(history.status).toEqual(status);
  });
});
