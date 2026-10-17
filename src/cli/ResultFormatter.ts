import type { CommandResult } from '../application/CommandResult.js';
import { NodeFormatter } from './NodeFormatter.js';

export class ResultFormatter {
  readonly #nodes = new NodeFormatter();

  public format(result: CommandResult): readonly string[] {
    switch (result.kind) {
      case 'saved': return [`saved to ${result.path} (${result.count} elements)`];
      case 'canvas': {
        const suffix = result.operation === 'queried' ? '' : ` ${result.operation}`;
        return [`canvas ${result.width}x${result.height}${suffix}`];
      }
      case 'created':
        return [`${this.#nodes.reference(result.node)} created${result.parent === null ? '' : ` in ${this.#nodes.reference(result.parent)}`}`];
      case 'deleted': return [`${this.#nodes.reference(result.node)} deleted`];
      case 'grouped': return [`${this.#nodes.reference(result.node)} created with ${result.count} children`];
      case 'ungrouped': return [`${this.#nodes.reference(result.node)} ungrouped`];
      case 'reparented': return [`${this.#nodes.reference(result.node)} moved into ${result.parent === null ? 'svg' : this.#nodes.reference(result.parent)}`];
      case 'ordered': return [`${this.#nodes.reference(result.node)} ${result.undo ? 'order restored' : `moved to ${result.direction}`}`];
      case 'restored': return [`${this.#nodes.reference(result.node)} restored into ${result.parent === null ? 'svg' : this.#nodes.reference(result.parent)}`];
      case 'moved': {
        const direction = result.undo ? 'moved back' : 'moved';
        const destination = result.position === null ? `by (${result.dx},${result.dy})` : `to (${result.position.x},${result.position.y})`;
        return [`${this.#nodes.reference(result.node)} ${direction} ${destination}`];
      }
      case 'scaled': return [`${this.#nodes.reference(result.node)} ${result.undo ? 'scale restored' : `scaled by ${result.factor}`}`];
      case 'updated': {
        const value = result.attribute === 'text' ? JSON.stringify(result.value) : String(result.value);
        return [`${this.#nodes.reference(result.node)} updated: ${result.attribute}${result.value === undefined ? ' removed' : `=${value}`}`];
      }
      case 'tree': return this.#nodes.tree(result.snapshot);
      case 'show': return this.#nodes.show(result.node);
      case 'help': return [
        ...result.entries.map(entry => `${entry.syntax} — ${entry.description}`),
        'EOF — exit (Ctrl+Z then Enter on Windows; Ctrl+D on Unix).',
        `Not implemented in M6: ${result.pending.join('; ')}`,
      ];
    }
  }
}
