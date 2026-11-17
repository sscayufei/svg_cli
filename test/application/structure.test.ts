import { createBuiltinShapeFactory } from '../support/composition.js';
import { describe, expect, it } from 'vitest';
import { EditorSession } from '@svgframe/core';
import { InitCommand } from '../../plugins/builtin-commands/src/InitCommand.js';
import { CreateCommand } from '../../plugins/builtin-commands/src/CreateCommand.js';
import { GroupCommand } from '../../plugins/builtin-commands/src/GroupCommand.js';
import { UngroupCommand } from '../../plugins/builtin-commands/src/UngroupCommand.js';
import { AddToCommand } from '../../plugins/builtin-commands/src/AddToCommand.js';
import { FrontCommand } from '../../plugins/builtin-commands/src/FrontCommand.js';
import { BackCommand } from '../../plugins/builtin-commands/src/BackCommand.js';
import { MoveCommand } from '../../plugins/builtin-commands/src/MoveCommand.js';

describe('M4 concrete command records', () => {
  const scene = () => {
    const session = new EditorSession(createBuiltinShapeFactory()); new InitCommand(session).execute();
    new CreateCommand(session, 'g', 'outer', []).execute();
    new CreateCommand(session, 'rect', 'a', ['1', '2', '3', '4'], 'outer').execute();
    new CreateCommand(session, 'g', 'b', [], 'outer').execute();
    new CreateCommand(session, 'g', 'other', []).execute();
    return session;
  };

  it('composes group, move, ungroup, addto and order changes with exact reverse restoration', () => {
    const session = scene(); const document = session.requireDocument();
    const snapshot = () => [...document].map(node => ({ node, parent: node.parent, children: node.children, attrs: node.getAttributes() }));
    const before = snapshot();
    const commands = [new GroupCommand(session, 'g', ['b', 'a']), new MoveCommand(session, 'g', 2, 3),
      new UngroupCommand(session, 'g'), new AddToCommand(session, 'other', 'a'),
      new FrontCommand(session, 'outer'), new BackCommand(session, 'outer')];
    for (const command of commands) command.execute();
    const after = snapshot(); document.verifyInvariants();
    for (const command of commands.toReversed()) command.undo();
    expect(snapshot()).toEqual(before); expect(document.findById('g')).toBeUndefined();
    for (const command of commands) command.redo();
    expect(snapshot()).toEqual(after); document.verifyInvariants();
  });

  it('preserves a group record when redo fails on a name collision', () => {
    const session = scene(); const document = session.requireDocument();
    const ids = ['a', 'other']; const command = new GroupCommand(session, 'g', ids); ids.reverse();
    command.execute(); const group = document.requireById('g'); command.undo();
    new CreateCommand(session, 'g', 'g', []).execute();
    expect(() => command.redo()).toThrow('id already exists: g');
    expect(document.requireById('outer').children.map(node => node.id)).toEqual(['a', 'b']);
    document.remove('g'); command.redo(); expect(document.requireById('g')).toBe(group);
    expect(group.children.map(node => node.id)).toEqual(['a', 'other']);
    expect(group.parent).toBe(document.requireById('outer')); document.verifyInvariants();
  });

  it('keeps failed commands unexecuted and rejects stale group undo after init', () => {
    const session = scene(); const document = session.requireDocument();
    const bad = new GroupCommand(session, 'bad', ['a', 'outer']);
    expect(() => bad.execute()).toThrow('cannot group'); expect(() => bad.undo()).toThrow();
    expect(document.findById('bad')).toBeUndefined();
    const good = new GroupCommand(session, 'g', ['a', 'b']); good.execute();
    new InitCommand(session).execute(); expect(() => good.undo()).toThrow('different document');
    expect(document.requireById('g').children).toHaveLength(2);
  });
});
