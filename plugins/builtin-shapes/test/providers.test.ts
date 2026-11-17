import { describe, expect, it } from 'vitest';
import { ExtensionRegistry, ShapeFactory, type ShapeProvider } from '@svgframe/core';
import { BuiltinShapesPlugin } from '../src/BuiltinShapesPlugin.js';

describe('built-in shapes without host or command plugins', () => {
  it('registers all providers and restores SVG defaults/styles/text', () => {
    const registry = new ExtensionRegistry<ShapeProvider>('shapes');
    new BuiltinShapesPlugin().activate({ shapeProviders: registry });
    expect(registry.values().map(provider => provider.name)).toEqual(['rect','circle','ellipse','line','text','g']);
    const factory = new ShapeFactory(registry);
    expect(factory.fromAttributes('rect', 'r', { fill: 'red' }).getAttributes()).toEqual({ x:0, y:0, width:0, height:0, fill:'red' });
    expect(factory.fromAttributes('text', 't', {}, '中文')).toMatchObject({ id: 't', type: 'text' });
    expect(factory.fromAttributes('text', 't', {}, '中文').getAttributes().text).toBe('中文');
    expect(factory.create('g', 'empty', []).isContainer).toBe(true);
  });
  it('preserves strict parameter and attribute validation in providers', () => {
    const registry = new ExtensionRegistry<ShapeProvider>('shapes'); new BuiltinShapesPlugin().activate({ shapeProviders: registry });
    const factory = new ShapeFactory(registry);
    expect(() => factory.create('circle', 'c', ['0','0','-1'])).toThrow('r must be non-negative');
    expect(() => factory.create('rect', 'r', ['1'])).toThrow('invalid parameters for shape type: rect');
    expect(() => factory.fromAttributes('rect', 'r', { label:'bad' })).toThrow('unknown attribute: label');
  });
});
