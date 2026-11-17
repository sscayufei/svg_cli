import type { CommandResult } from '../CommandResult.js';
import type { Command } from './Command.js';

/** A reversible request; stack management belongs to CommandHistory. */
export abstract class EditCommand implements Command {
  public get kind(): 'edit' { return 'edit'; }
  public abstract execute(): CommandResult;
  public abstract undo(): CommandResult;
  public abstract redo(): CommandResult;
}
