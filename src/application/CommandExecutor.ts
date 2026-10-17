import type { ExecutionResult } from './CommandResult.js';
import type { Command } from './commands/Command.js';

/** Invoker: the single execution/error boundary. History is added in M5. */
export class CommandExecutor {
  public execute(command: Command): ExecutionResult {
    try {
      return Object.freeze({ ok: true, result: command.execute() });
    } catch (error) {
      return Object.freeze({ ok: false, error: error instanceof Error ? error.message : 'command failed' });
    }
  }
}
