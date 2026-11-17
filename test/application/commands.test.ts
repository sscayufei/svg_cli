import { createBuiltinShapeFactory } from '../support/composition.js';
import { describe, expect, it } from 'vitest';
import { EditorSession } from '@svgframe/core';
import { CommandExecutor } from '@svgframe/core';
import { CommandHistory } from '@svgframe/core';
import { CanvasCommand } from '../../plugins/builtin-commands/src/CanvasCommand.js';
import { CreateCommand } from '../../plugins/builtin-commands/src/CreateCommand.js';
import { InitCommand } from '../../plugins/builtin-commands/src/InitCommand.js';

describe('Command requests and session receivers', () => {
  it('leaves the session untouched on failed initialization and resize', () => {
    const session = new EditorSession(createBuiltinShapeFactory());
    const executor = new CommandExecutor(new CommandHistory());
    expect(executor.execute(new InitCommand(session)).ok).toBe(true);
    const original = session.requireDocument();
    expect(executor.execute(new InitCommand(session, 'NaN', 300)).ok).toBe(false);
    expect(session.requireDocument()).toBe(original);
    expect(executor.execute(new CanvasCommand(session, [400, -1])).ok).toBe(false);
    expect([original.width, original.height]).toEqual([800, 600]);
  });

  it('classifies queries, documents and edits for the invoker', () => {
    const session = new EditorSession(createBuiltinShapeFactory());
    expect(new InitCommand(session).kind).toBe('document');
    expect(new CanvasCommand(session).kind).toBe('query');
    expect(new CanvasCommand(session, [400, 300]).kind).toBe('document');
    expect(new CreateCommand(session, 'g', 'g', []).kind).toBe('edit');
  });

  it('stores the minimal create record and restores the same node at the same position', () => {
    const session = new EditorSession(createBuiltinShapeFactory());
    new InitCommand(session).execute();
    new CreateCommand(session, 'g', 'parent', []).execute();
    const args = ['1', '2', '3', '4', '#abc'];
    const create = new CreateCommand(session, 'rect', 'r', args, 'parent');
    args[0] = '999';
    create.execute();
    const document = session.requireDocument();
    const node = document.requireById('r');
    const parent = document.requireById('parent');
    expect(node.getGeometry().x).toBe(1);
    create.undo();
    expect(document.findById('r')).toBeUndefined();
    expect(node.parent).toBeNull();
    create.redo();
    expect(document.requireById('r')).toBe(node);
    expect(parent.children).toEqual([node]);
    expect(node.parent).toBe(parent);
    document.verifyInvariants();
  });

  it('does not lose an undo record when redo fails on an ID collision', () => {
    const session = new EditorSession(createBuiltinShapeFactory());
    new InitCommand(session).execute();
    const create = new CreateCommand(session, 'g', 'g', []);
    expect(() => create.undo()).toThrow();
    create.execute();
    expect(() => create.execute()).toThrow();
    const document = session.requireDocument();
    const original = document.requireById('g');
    create.undo();
    new CreateCommand(session, 'g', 'g', []).execute();
    expect(() => create.redo()).toThrow('id already exists: g');
    document.remove('g');
    create.redo();
    expect(document.requireById('g')).toBe(original);
    document.verifyInvariants();
  });

  it('rejects stale edits after the session document changes', () => {
    const session = new EditorSession(createBuiltinShapeFactory());
    new InitCommand(session).execute();
    const create = new CreateCommand(session, 'g', 'g', []);
    create.execute();
    const oldDocument = session.requireDocument();
    new InitCommand(session, 400).execute();
    expect(() => create.undo()).toThrow('different document');
    expect(oldDocument.findById('g')).toBeDefined();
    expect(session.requireDocument().size).toBe(0);
  });
});
