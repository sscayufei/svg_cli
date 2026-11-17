import type { Plugin, PluginContext } from '@svgframe/core';
import { ModifiedStarDecorator } from './ModifiedStarDecorator.js';

export class TreeStarPlugin implements Plugin {
  public activate(context: PluginContext): void {
    const decorator = new ModifiedStarDecorator(context.session.snapshot());
    context.decorators.register(decorator);
    // The installer owns this staged subscription and releases it on failure or application exit.
    context.events.subscribe(event => decorator.observe(event));
  }
}
