import type { CommandResult } from './CommandResult.js';
import type { ReversibleCommand } from './commands/Command.js';
import type { DocumentEventKind, SessionEvents } from './SessionEvents.js';

/** Owns history state; each command retains its own minimal reversible record. */
export class CommandHistory {
  public constructor(private readonly events?: SessionEvents) {}
  readonly #undo: ReversibleCommand[] = [];
  readonly #redo: ReversibleCommand[] = [];
  #blocked = false;

  public get status(): Readonly<{ undoCount: number; redoCount: number; blocked: boolean }> {
    return Object.freeze({ undoCount: this.#undo.length, redoCount: this.#redo.length, blocked: this.#blocked });
  }

  /** Invoked only after an edit has completed successfully. */
  public recordExecuted(command: ReversibleCommand): void {
    this.#undo.push(command);
    this.#redo.length = 0;
    this.#blocked = false;
    this.events?.publish('edit');
  }

  /** Successful document commands discard references into the old history. */
  public barrier(kind?: DocumentEventKind): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#blocked = true;
    if (kind !== undefined) this.events?.publish(kind);
  }

  public undo(): CommandResult {
    this.checkAllowed();
    const command = this.#undo.at(-1);
    if (command === undefined) throw new Error('nothing to undo');
    const result = command.undo();
    this.#undo.pop();
    this.#redo.push(command);
    this.events?.publish('undo');
    return result;
  }

  public redo(): CommandResult {
    this.checkAllowed();
    const command = this.#redo.at(-1);
    if (command === undefined) throw new Error('nothing to redo');
    const result = command.redo();
    this.#redo.pop();
    this.#undo.push(command);
    this.events?.publish('redo');
    return result;
  }

  private checkAllowed(): void {
    if (this.#blocked) throw new Error('undo not allowed after io command');
  }
}
