import type { CommandResult } from '../CommandResult.js';

export interface Command {
  readonly kind: 'document' | 'query' | 'edit';
  execute(): CommandResult;
}
