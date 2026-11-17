import type { CommandDefinition, CommandToken, EditorSession } from '@svgframe/core';
import { StatsCommand } from './StatsCommand.js';

export class StatsCommandDefinition implements CommandDefinition {
  public readonly name = 'stats';
  public readonly syntax = 'stats';
  public readonly description = 'count leaf shapes by type and containers';
  public constructor(private readonly session: Pick<EditorSession, 'requireDocument'>) {}
  public build(args: readonly CommandToken[]): StatsCommand {
    if (args.length !== 0) throw new Error('usage: stats');
    return new StatsCommand(this.session);
  }
}
