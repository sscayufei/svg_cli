import { describe, expect, it } from 'vitest';
import { ChangeSet } from '../../src/domain/ChangeSet.js';
import { CircleShape } from '../../src/domain/CircleShape.js';
import { EllipseShape } from '../../src/domain/EllipseShape.js';
import { LineShape } from '../../src/domain/LineShape.js';
import { RectShape } from '../../src/domain/RectShape.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { SvgGroup } from '../../src/domain/SvgGroup.js';
import { TextShape } from '../../src/domain/TextShape.js';

describe('polymorphic geometry edits', () => {
  it.each([
    { make: () => new RectShape('r', 1, 2, 3, 4), moved: { x: 3, y: 1, width: 3, height: 4 }, scaled: { x: 1.5, y: 0.5, width: 1.5, height: 2 } },
    { make: () => new CircleShape('c', 1, 2, 3), moved: { cx: 3, cy: 1, r: 3 }, scaled: { cx: 1.5, cy: 0.5, r: 1.5 } },
    { make: () => new EllipseShape('e', 1, 2, 3, 4), moved: { cx: 3, cy: 1, rx: 3, ry: 4 }, scaled: { cx: 1.5, cy: 0.5, rx: 1.5, ry: 2 } },
    { make: () => new LineShape('l', 1, 2, 3, 4), moved: { x1: 3, y1: 1, x2: 5, y2: 3 }, scaled: { x1: 1.5, y1: 0.5, x2: 2.5, y2: 1.5 } },
    { make: () => new TextShape('t', 1, 2, 'text'), moved: { x: 3, y: 1 }, scaled: { x: 1.5, y: 0.5 } },
  ])('moves/scales all coordinates and dimensions for $moved', ({ make, moved, scaled }) => {
    const node = make();
    node.move(2, -1);
    expect(node.getGeometry()).toEqual(moved);
    node.scale(0.5);
    expect(node.getGeometry()).toEqual(scaled);
  });

  it('recursively edits a nested Composite while keeping unrelated nodes and styles intact', () => {
    const document = new SvgDocument();
    const outer = new SvgGroup('outer');
    const inner = new SvgGroup('inner');
    const rect = new RectShape('r', 1, 2, 3, 4, { 'stroke-width': 2 });
    const text = new TextShape('t', 5, 6, 'label');
    const other = new CircleShape('other', 9, 9, 1);
    document.append(outer); document.append(inner, outer);
    document.append(rect, inner); document.append(text, outer); document.append(other);
    const before = [...outer].map(node => node.getAttributes());
    const move = outer.move(2, 3);
    const scale = outer.scale(2);
    expect(rect.getGeometry()).toEqual({ x: 6, y: 10, width: 6, height: 8 });
    expect(text.getAttributes()).toEqual({ x: 14, y: 18, text: 'label' });
    expect(rect.getAttributes()['stroke-width']).toBe(2);
    expect(other.getGeometry()).toEqual({ cx: 9, cy: 9, r: 1 });
    scale.revert(); move.revert();
    expect([...outer].map(node => node.getAttributes())).toEqual(before);
    document.verifyInvariants();
  });

  it('prevalidates all descendants so a later overflow leaves earlier siblings unchanged', () => {
    const document = new SvgDocument();
    const group = new SvgGroup('g');
    const first = new RectShape('first', 1, 2, 3, 4);
    const last = new CircleShape('last', Number.MAX_VALUE, 0, 1);
    document.append(group); document.append(first, group); document.append(last, group);
    const before = [...document].map(node => node.getAttributes());
    expect(() => group.move(Number.MAX_VALUE, 0)).toThrow();
    expect([...document].map(node => node.getAttributes())).toEqual(before);
    expect(() => group.scale(2)).toThrow();
    expect([...document].map(node => node.getAttributes())).toEqual(before);
    document.verifyInvariants();
  });

  it.each([0, -1, NaN, Infinity])('rejects invalid scale factors even on an empty group: %s', factor => {
    expect(() => new SvgGroup('g').scale(factor)).toThrow();
  });

  it('restores exact floating point values through repeated undo/redo', () => {
    const node = new CircleShape('c', 0.1, 0.2, 0.3);
    const original = node.getAttributes();
    const change = node.move(0.2, 0.3);
    const moved = node.getAttributes();
    for (let index = 0; index < 10; index++) {
      change.revert(); expect(node.getAttributes()).toEqual(original);
      change.apply(); expect(node.getAttributes()).toEqual(moved);
    }
  });

  const fields = [
    { make: () => new RectShape('r', 1, 2, 3, 4), fields: ['x', 'y', 'width', 'height'] },
    { make: () => new CircleShape('c', 1, 2, 3), fields: ['cx', 'cy', 'r'] },
    { make: () => new EllipseShape('e', 1, 2, 3, 4), fields: ['cx', 'cy', 'rx', 'ry'] },
    { make: () => new LineShape('l', 1, 2, 3, 4), fields: ['x1', 'y1', 'x2', 'y2'] },
    { make: () => new TextShape('t', 1, 2, 'text'), fields: ['x', 'y'] },
  ];
  it.each(fields)('sets only the requested geometry attribute for $fields', ({ make, fields }) => {
    const node = make();
    for (const field of fields) {
      const before = node.getAttributes();
      const change = node.setAttribute(field, '3.5');
      expect(node.getAttributes()).toEqual({ ...before, [field]: 3.5 });
      change.revert(); expect(node.getAttributes()).toEqual(before);
    }
  });

  it('restores optional attribute absence and exact text content', () => {
    const text = new TextShape('t', 1, 2, 'original');
    const fill = text.setAttribute('fill', '#abc');
    const content = text.setAttribute('text', '中文 "new"');
    expect(text.getAttributes().text).toBe('中文 "new"');
    content.revert(); fill.revert();
    expect(text.getAttributes()).toEqual({ x: 1, y: 2, text: 'original' });
    content.apply(); expect(text.getAttributes().text).toBe('中文 "new"');
  });

  it('rejects foreign attributes, invalid numeric values and non-finite movement without mutation', () => {
    const rect = new RectShape('r', 1, 2, 3, 4);
    const before = rect.getAttributes();
    for (const [name, value] of [['id', 'new'], ['text', 'bad'], ['cx', '3'], ['width', '-1'], ['x', 'NaN'], ['stroke-width', '-1']]) {
      expect(() => rect.setAttribute(name ?? '', value ?? '')).toThrow();
      expect(rect.getAttributes()).toEqual(before);
    }
    expect(() => rect.move(Infinity, 0)).toThrow();
    expect(rect.getAttributes()).toEqual(before);
    expect(() => new SvgGroup('g').setAttribute('x', 1)).toThrow('unknown attribute: x');
  });

  it('keeps local style records independent and preserves explicit child styles on a group', () => {
    const document = new SvgDocument(); const group = new SvgGroup('g');
    const child = new RectShape('r', 0, 0, 1, 1, { fill: 'red' });
    document.append(group); document.append(child, group);
    const fill = group.setAttribute('fill', 'blue');
    const stroke = group.setAttribute('stroke', 'black');
    group.setAttribute('stroke-width', '0');
    expect(child.getAttributes().fill).toBe('red');
    expect(child.getAttributes()).not.toHaveProperty('stroke');
    fill.revert();
    expect(group.getAttributes()).toEqual({ stroke: 'black', 'stroke-width': 0 });
    stroke.revert();
    expect(group.getAttributes()).toEqual({ 'stroke-width': 0 });
  });
});

describe('atomic reversible change sets', () => {
  it('rolls back completed steps when a later atomic step fails', () => {
    let value = 1;
    const change = new ChangeSet([
      { apply: () => { value = 2; }, revert: () => { value = 1; } },
      { apply: () => { throw new Error('failure'); }, revert: () => {} },
    ]);
    expect(() => change.apply()).toThrow('failure');
    expect(value).toBe(1);
  });

  it('rolls back a failed revert and allows retry without losing the change', () => {
    let x = 1; let y = 2; let fail = true;
    const change = new ChangeSet([
      { apply: () => { x = 3; }, revert: () => { if (fail) throw new Error('retry'); x = 1; } },
      { apply: () => { y = 4; }, revert: () => { y = 2; } },
    ]);
    change.apply();
    expect(() => change.revert()).toThrow('retry');
    expect([x, y]).toEqual([3, 4]);
    fail = false; change.revert();
    expect([x, y]).toEqual([1, 2]);
  });
});
