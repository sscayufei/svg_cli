import type { Command, CommandResult, DirectoryEntry, DirectoryPort } from '@svgframe/core';

const order = Object.freeze({ directory: 0, file: 1, link: 2, other: 3 });
const labels = Object.freeze({ directory: '[DIR]', file: '[FILE]', link: '[LINK]', other: '[OTHER]' });

/** A query over a supplied directory service; no document or Node dependency. */
export class DirCommand implements Command {
  public readonly kind = 'query';
  public constructor(private readonly directory: DirectoryPort) {}

  public execute(): CommandResult {
    let entries: readonly DirectoryEntry[];
    try { entries = this.directory.read(); }
    catch { throw new Error(`cannot read directory: ${this.directory.path}`); }
    const sorted = entries.filter(entry => entry.name !== '.' && entry.name !== '..').toSorted((left, right) => order[left.kind] - order[right.kind]
      || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0));
    const lines = sorted.length === 0 ? ['(empty directory)'] : sorted.map(entry => `${labels[entry.kind]}  ${entry.name}`);
    return Object.freeze({ kind: 'lines', lines: Object.freeze(lines) });
  }
}
