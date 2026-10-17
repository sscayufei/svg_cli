import type { CommandResult } from '../application/CommandResult.js';
import { NodeFormatter } from './NodeFormatter.js';

export class ResultFormatter {
  readonly #nodes = new NodeFormatter();

  public format(result: CommandResult): readonly string[] {
    switch (result.kind) {
      case 'canvas': {
        const suffix = result.operation === 'queried' ? '' : ` ${result.operation}`;
        return [`canvas ${result.width}x${result.height}${suffix}`];
      }
      case 'created':
        return [`${this.#nodes.reference(result.node)} created${result.parent === null ? '' : ` in ${this.#nodes.reference(result.parent)}`}`];
      case 'deleted': return [`${this.#nodes.reference(result.node)} deleted`];
      case 'tree': return this.#nodes.tree(result.snapshot);
      case 'show': return this.#nodes.show(result.node);
      case 'help': return [
        ...result.entries.map(entry => `${entry.syntax} — ${entry.description}`),
        'EOF — exit (Ctrl+Z then Enter on Windows; Ctrl+D on Unix).',
        `Not implemented in M2: ${result.pending.join('; ')}`,
      ];
    }
  }
}
