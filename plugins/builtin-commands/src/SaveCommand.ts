import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import type { SvgSavePort } from '@svgframe/core';
import type { Command } from '@svgframe/core';

export class SaveCommand implements Command {
  public readonly lifecycleEvent = 'save';
  public readonly kind = 'document';
  public constructor(
    private readonly session: EditorSession,
    private readonly store: SvgSavePort,
    private readonly path?: string,
  ) {}

  public execute(): CommandResult {
    const document = this.session.requireDocument();
    const path = this.path ?? this.session.sourcePath;
    if (path === null) throw new Error("no source path. use 'save <file.svg>'");
    try {
      this.store.save(document, path);
    } catch {
      throw new Error(`cannot write file: ${path}`);
    }
    return Object.freeze({ kind: 'saved', path, count: document.size });
  }
}
