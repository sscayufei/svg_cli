import type { CommandHistory } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import type { Command } from '@svgframe/core';

export class UndoCommand implements Command {
  public readonly kind = 'history';
  public constructor(private readonly session: EditorSession, private readonly history: CommandHistory) {}

  public execute(): CommandResult {
    this.session.requireDocument();
    return this.history.undo();
  }
}
