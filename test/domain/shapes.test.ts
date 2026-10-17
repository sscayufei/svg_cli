import { describe, expect, it } from 'vitest';
import { CircleShape } from '../../src/domain/CircleShape.js';
import { EllipseShape } from '../../src/domain/EllipseShape.js';
import { LineShape } from '../../src/domain/LineShape.js';
import { RectShape } from '../../src/domain/RectShape.js';
import { SvgGroup } from '../../src/domain/SvgGroup.js';
import type { SvgNode } from '../../src/domain/SvgNode.js';
import { TextShape } from '../../src/domain/TextShape.js';

describe('encapsulated SVG nodes', () => {
  it('exposes geometry polymorphically for all six node types', () => {
    const nodes: SvgNode[] = [
      new RectShape('r', -1.5, 2, 3, 4),
      new CircleShape('c', 1, 2, 3),
      new EllipseShape('e', 1, 2, 3, 4),
      new LineShape('l', -1, 2, 3, -4),
      new TextShape('t', 1, 2, '中文 & <text>'),
      new SvgGroup('g'),
    ];

    expect(nodes.map(node => node.type)).toEqual(['rect', 'circle', 'ellipse', 'line', 'text', 'g']);
    expect(nodes.map(node => node.getGeometry())).toEqual([
      { x: -1.5, y: 2, width: 3, height: 4 },
      { cx: 1, cy: 2, r: 3 },
      { cx: 1, cy: 2, rx: 3, ry: 4 },
      { x1: -1, y1: 2, x2: 3, y2: -4 },
      { x: 1, y: 2 },
      {},
    ]);
    for (const node of nodes) {
      expect(node.parent).toBeNull();
      expect(node.document).toBeNull();
      expect(node.children).toEqual([]);
      expect([...node]).toEqual([node]);
    }
    expect(nodes[4]?.getAttributes()).toEqual({ x: 1, y: 2, text: '中文 & <text>' });
  });

  it('preserves absent styles and copies explicitly supplied styles', () => {
    const style = { fill: '#abc', stroke: 'red', 'stroke-width': 0.5 };
    const rect = new RectShape('r', 1, 2, 3, 4, style);
    style.fill = 'blue';

    expect(rect.getAttributes()).toEqual({
      x: 1, y: 2, width: 3, height: 4,
      fill: '#abc', stroke: 'red', 'stroke-width': 0.5,
    });
    expect(new CircleShape('c', 0, 0, 1).getAttributes()).toEqual({ cx: 0, cy: 0, r: 1 });
    expect(new SvgGroup('g', { fill: 'green' }).getAttributes()).toEqual({ fill: 'green' });
  });

  it('returns immutable attribute and geometry snapshots', () => {
    const rect = new RectShape('r', 1, 2, 3, 4);
    expect(Reflect.set(rect.getGeometry(), 'x', 999)).toBe(false);
    expect(Reflect.set(rect.getAttributes(), 'fill', 'red')).toBe(false);
    expect(Reflect.set(rect, 'id', 'other')).toBe(false);
    expect(rect.id).toBe('r');
    expect(rect.getGeometry().x).toBe(1);
    expect(rect.getAttributes()).not.toHaveProperty('fill');
  });

  it('rejects extra style fields that could shadow geometry in attribute snapshots', () => {
    // Structural typing permits this variable as SvgStyle without a cast.
    const style = { fill: 'red', x: 999 };
    expect(() => new RectShape('r', 1, 2, 3, 4, style)).toThrow('unknown attribute: x');
  });

  it('accepts zero dimensions and radii', () => {
    expect(new RectShape('r', 0, 0, 0, 0).getGeometry()).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(new CircleShape('c', 0, 0, 0).getGeometry().r).toBe(0);
    expect(new EllipseShape('e', 0, 0, 0, 0).getGeometry().rx).toBe(0);
  });

  it.each([
    () => new RectShape('r', NaN, 0, 1, 1),
    () => new CircleShape('c', 0, Infinity, 1),
    () => new EllipseShape('e', 0, 0, 1, -Infinity),
    () => new LineShape('l', 0, 0, NaN, 1),
    () => new TextShape('t', Infinity, 0, 'text'),
    () => new RectShape('r', 0, 0, -1, 1),
    () => new CircleShape('c', 0, 0, -1),
    () => new EllipseShape('e', 0, 0, 1, -1),
    () => new SvgGroup('g', { 'stroke-width': -1 }),
    () => new SvgGroup('g', { 'stroke-width': Infinity }),
    () => new SvgGroup(''),
  ])('rejects invalid model values %#', create => {
    expect(create).toThrow();
  });
});
