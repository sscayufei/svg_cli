import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import type { SvgReadPort } from '@svgframe/core';
import type { Command } from '@svgframe/core';

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
