import type { Plugin, PluginContext } from '@svgframe/core';
import { RectProvider } from './RectProvider.js';
import { CircleProvider } from './CircleProvider.js';
import { EllipseProvider } from './EllipseProvider.js';
import { LineProvider } from './LineProvider.js';
import { TextProvider } from './TextProvider.js';
import { GroupProvider } from './GroupProvider.js';

export class BuiltinShapesPlugin implements Plugin {
  public activate(context: Pick<PluginContext, 'shapeProviders'>): void {
    for (const provider of [new RectProvider(), new CircleProvider(), new EllipseProvider(), new LineProvider(), new TextProvider(), new GroupProvider()]) context.shapeProviders.register(provider);
  }
}
