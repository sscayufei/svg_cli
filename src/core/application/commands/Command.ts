import type { CommandResult } from '../CommandResult.js';
import type { DocumentEventKind } from '../SessionEvents.js';

export interface Command {
  readonly kind: 'document' | 'query' | 'edit' | 'history';
  readonly lifecycleEvent?: DocumentEventKind;
  execute(): CommandResult;
}

export interface ReversibleCommand extends Command {
  undo(): CommandResult;
  redo(): CommandResult;
}
export function isReversibleCommand(command: Command): command is ReversibleCommand {
  return 'undo' in command && typeof command.undo === 'function' && 'redo' in command && typeof command.redo === 'function';
}
