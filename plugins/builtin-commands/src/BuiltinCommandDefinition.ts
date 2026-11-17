import type { CommandDefinition, CommandToken, Command } from '@svgframe/core';

export class BuiltinCommandDefinition implements CommandDefinition {
  public constructor(
    public readonly name: string,
    public readonly syntax: string,
    public readonly description: string,
    private readonly factory: (args: readonly CommandToken[]) => Command,
  ) {}
  public build(args: readonly CommandToken[]): Command { return this.factory(args); }
}
