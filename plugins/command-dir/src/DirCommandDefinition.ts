import type { CommandDefinition, CommandToken, DirectoryPort } from '@svgframe/core';
import { DirCommand } from './DirCommand.js';

export class DirCommandDefinition implements CommandDefinition {
  public readonly name = 'dir';
  public readonly syntax = 'dir';
  public readonly description = 'list the current working directory';
  public constructor(private readonly directory: DirectoryPort) {}
  public build(args: readonly CommandToken[]): DirCommand {
    if (args.length !== 0) throw new Error('usage: dir');
    return new DirCommand(this.directory);
  }
}
