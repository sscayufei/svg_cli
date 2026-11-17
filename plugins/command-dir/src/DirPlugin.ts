import type { Plugin, PluginContext } from '@svgframe/core';
import { DirCommandDefinition } from './DirCommandDefinition.js';

export class DirPlugin implements Plugin {
  public activate(context: Pick<PluginContext, 'commands' | 'directory'>): void {
    context.commands.register(new DirCommandDefinition(context.directory));
  }
}
