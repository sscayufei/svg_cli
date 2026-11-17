import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DirectoryEntry, DirectoryPort } from '@svgframe/core';

export class NodeDirectoryAdapter implements DirectoryPort {
  public readonly path: string;
  public constructor(path = process.cwd()) { this.path = resolve(path); }
  public read(): readonly DirectoryEntry[] {
    try {
      return Object.freeze(readdirSync(this.path, { withFileTypes: true }).map(entry => Object.freeze({ name: entry.name,
        kind: entry.isSymbolicLink() ? 'link' as const : entry.isDirectory() ? 'directory' as const : entry.isFile() ? 'file' as const : 'other' as const,
      })));
    } catch { throw new Error(`cannot read directory: ${this.path}`); }
  }
}
