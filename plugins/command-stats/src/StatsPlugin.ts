import type { Plugin, PluginContext } from '@svgframe/core';
import { StatsCommandDefinition } from './StatsCommandDefinition.js';

export class StatsPlugin implements Plugin {
  public activate(context: Pick<PluginContext, 'session' | 'commands'>): void {
    context.commands.register(new StatsCommandDefinition(context.session));
  }
}
