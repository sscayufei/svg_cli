import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import type { SvgSavePort } from '../ports/SvgSavePort.js';
import type { Command } from './Command.js';

export class SaveCommand implements Command {
  public readonly kind = 'document';
  public constructor(
    private readonly session: EditorSession,
    private readonly store: SvgSavePort,
    private readonly path?: string,
  ) {}

  public execute(): CommandResult {
    const document = this.session.requireDocument();
    // M7 will resolve an omitted path from the successful read source.
    if (this.path === undefined) throw new Error("no source path. use 'save <file.svg>'");
    try {
      this.store.save(document, this.path);
    } catch {
      throw new Error(`cannot write file: ${this.path}`);
    }
    return Object.freeze({ kind: 'saved', path: this.path, count: document.size });
  }
}
