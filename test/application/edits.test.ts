import { describe, expect, it } from 'vitest';
import { EditorSession } from '../../src/application/EditorSession.js';
import { InitCommand } from '../../src/application/commands/InitCommand.js';
import { CreateCommand } from '../../src/application/commands/CreateCommand.js';
import { MoveCommand } from '../../src/application/commands/MoveCommand.js';
import { ScaleCommand } from '../../src/application/commands/ScaleCommand.js';
import { SetAttributeCommand } from '../../src/application/commands/SetAttributeCommand.js';
import { DeleteCommand } from '../../src/application/commands/DeleteCommand.js';

describe('M3 edit command records', () => {
  const scene = () => {
    const session = new EditorSession();
    new InitCommand(session).execute();
    new CreateCommand(session, 'g', 'g', []).execute();
    new CreateCommand(session, 'rect', 'r', ['0.1', '0.2', '3', '4'], 'g').execute();
    new CreateCommand(session, 'text', 't', ['1', '2', 'original'], 'g').execute();
    return session;
  };

  it('undoes a sequence exactly without document snapshots or a history stack', () => {
    const session = scene(); const document = session.requireDocument();
    const before = [...document].map(node => ({ id: node.id, attributes: node.getAttributes(), parent: node.parent }));
    const commands = [new MoveCommand(session, 'g', 0.2, -0.3), new ScaleCommand(session, 'g', 0.1),
      new SetAttributeCommand(session, 'r', 'fill', 'red'), new SetAttributeCommand(session, 't', 'text', 'new'),
      new DeleteCommand(session, 'g')];
    for (const command of commands) command.execute();
    expect(document.size).toBe(0);
    for (const command of commands.toReversed()) command.undo();
    expect([...document].map(node => ({ id: node.id, attributes: node.getAttributes(), parent: node.parent }))).toEqual(before);
    for (const command of commands) command.redo();
    expect(document.size).toBe(0);
    document.verifyInvariants();
  });

  it('restores a deleted child at its precise parent and sibling position', () => {
    const session = scene(); const document = session.requireDocument();
    const r = document.requireById('r'); const parent = document.requireById('g');
    const command = new DeleteCommand(session, 'r');
    command.execute(); expect(parent.children.map(node => node.id)).toEqual(['t']);
    command.undo(); expect(parent.children.map(node => node.id)).toEqual(['r', 't']);
    expect(document.requireById('r')).toBe(r);
    document.verifyInvariants();
  });

  it('keeps the deletion record usable after failed restoration', () => {
    const session = scene(); const document = session.requireDocument();
    const original = document.requireById('g');
    const command = new DeleteCommand(session, 'g'); command.execute();
    new CreateCommand(session, 'g', 'g', []).execute();
    expect(() => command.undo()).toThrow('id already exists: g');
    document.remove('g'); command.undo();
    expect(document.requireById('g')).toBe(original);
    expect(document.requireById('r').parent).toBe(original);
    document.verifyInvariants();
  });

  it('leaves failed commands unexecuted and rejects stale undo after init', () => {
    const session = scene(); const document = session.requireDocument();
    const invalid = new SetAttributeCommand(session, 'r', 'label', 'bad');
    expect(() => invalid.execute()).toThrow('unknown attribute: label');
    expect(() => invalid.undo()).toThrow();
    const move = new MoveCommand(session, 'r', 1, 2); move.execute();
    const before = document.requireById('r').getGeometry();
    new InitCommand(session).execute();
    expect(() => move.undo()).toThrow('different document');
    expect(document.requireById('r').getGeometry()).toEqual(before);
  });

  it('rejects duplicate execution and invalid undo/redo transitions without repeating edits', () => {
    const session = scene(); const document = session.requireDocument();
    const move = new MoveCommand(session, 'r', 1, 2);
    expect(() => move.redo()).toThrow();
    move.execute(); const moved = document.requireById('r').getGeometry();
    expect(() => move.execute()).toThrow('already been executed');
    expect(() => move.redo()).toThrow();
    expect(document.requireById('r').getGeometry()).toEqual(moved);
    move.undo(); const original = document.requireById('r').getGeometry();
    expect(() => move.undo()).toThrow();
    expect(document.requireById('r').getGeometry()).toEqual(original);
    move.redo(); expect(document.requireById('r').getGeometry()).toEqual(moved);
  });
});
