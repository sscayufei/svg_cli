import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import type { SvgReadPort } from '../ports/SvgReadPort.js';
import type { Command } from './Command.js';

export class ReadCommand implements Command {
  public readonly kind = 'document';
  public constructor(private readonly session: EditorSession, private readonly store: SvgReadPort, private readonly path: string) {}

  public execute(): CommandResult {
    const candidate = this.store.read(this.path);
    const result: CommandResult = Object.freeze({
      kind: 'read', path: this.path, count: candidate.document.size, warnings: Object.freeze([...candidate.warnings]),
    });
    this.session.load(candidate.document, candidate.sourcePath);
    return result;
  }
}
