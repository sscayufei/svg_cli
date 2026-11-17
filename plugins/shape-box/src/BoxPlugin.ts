import type { Plugin, PluginContext } from '@svgframe/core';
import { BoxShapeProvider } from './BoxShapeProvider.js';
import { BoxFillHandler } from './BoxFillHandler.js';
import { BoxLabelHandler } from './BoxLabelHandler.js';
import { BoxTypeDecorator } from './BoxTypeDecorator.js';

export class BoxPlugin implements Plugin {
  public activate(context: Pick<PluginContext, 'shapes' | 'shapeProviders' | 'attributes' | 'decorators'>): void {
    context.shapeProviders.register(new BoxShapeProvider(context.shapes));
    context.attributes.register(new BoxFillHandler());
    context.attributes.register(new BoxLabelHandler());
    context.decorators.register(new BoxTypeDecorator());
  }
}
