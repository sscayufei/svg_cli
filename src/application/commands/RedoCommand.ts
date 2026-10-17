import type { CommandHistory } from '../CommandHistory.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import type { Command } from './Command.js';

export class RedoCommand implements Command {
  public readonly kind = 'history';
  public constructor(private readonly session: EditorSession, private readonly history: CommandHistory) {}

  public execute(): CommandResult {
    this.session.requireDocument();
    return this.history.redo();
  }
}
