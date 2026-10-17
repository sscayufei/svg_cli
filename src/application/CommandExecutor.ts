import type { ExecutionResult } from './CommandResult.js';
import type { Command } from './commands/Command.js';
import { EditCommand } from './commands/EditCommand.js';
import type { CommandHistory } from './CommandHistory.js';

/** Invoker: execute first, then commit history bookkeeping on success. */
export class CommandExecutor {
  public constructor(private readonly history: CommandHistory) {}

  public execute(command: Command): ExecutionResult {
    try {
      if (command.kind === 'edit' && !(command instanceof EditCommand)) {
        throw new Error('edit command must implement the undo protocol');
      }
      const result = command.execute();
      if (command instanceof EditCommand) this.history.recordExecuted(command);
      else if (command.kind === 'document') this.history.barrier();
      return Object.freeze({ ok: true, result });
    } catch (error) {
      return Object.freeze({ ok: false, error: error instanceof Error ? error.message : 'command failed' });
    }
  }
}
