import type { Plugin, PluginContext } from '@svgframe/core';
import { BuiltinCommandCatalog } from './BuiltinCommandCatalog.js';

export class BuiltinCommandsPlugin implements Plugin {
  public activate(context: PluginContext): void {
    new BuiltinCommandCatalog(context.session, context.history, context.store, context).register();
  }
}
