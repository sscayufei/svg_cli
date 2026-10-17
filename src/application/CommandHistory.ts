import type { CommandResult } from './CommandResult.js';
import type { EditCommand } from './commands/EditCommand.js';

/** Owns history state; each command retains its own minimal reversible record. */
export class CommandHistory {
  readonly #undo: EditCommand[] = [];
  readonly #redo: EditCommand[] = [];
  #blocked = false;

  public get status(): Readonly<{ undoCount: number; redoCount: number; blocked: boolean }> {
    return Object.freeze({ undoCount: this.#undo.length, redoCount: this.#redo.length, blocked: this.#blocked });
  }

  /** Invoked only after an edit has completed successfully. */
  public recordExecuted(command: EditCommand): void {
    this.#undo.push(command);
    this.#redo.length = 0;
    this.#blocked = false;
  }

  /** Successful document commands discard references into the old history. */
  public barrier(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#blocked = true;
  }

  public undo(): CommandResult {
    this.checkAllowed();
    const command = this.#undo.at(-1);
    if (command === undefined) throw new Error('nothing to undo');
    const result = command.undo();
    this.#undo.pop();
    this.#redo.push(command);
    return result;
  }

  public redo(): CommandResult {
    this.checkAllowed();
    const command = this.#redo.at(-1);
    if (command === undefined) throw new Error('nothing to redo');
    const result = command.redo();
    this.#redo.pop();
    this.#undo.push(command);
    return result;
  }

  private checkAllowed(): void {
    if (this.#blocked) throw new Error('undo not allowed after io command');
  }
}
