import type { CommandResult } from '../CommandResult.js';
import type { Command } from './Command.js';

/** Edit protocol exists before M5; no history collection is implemented here. */
export abstract class EditCommand implements Command {
  public get kind(): 'edit' { return 'edit'; }
  public abstract execute(): CommandResult;
  public abstract undo(): CommandResult;
  public abstract redo(): CommandResult;
}
