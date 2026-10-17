import { describe, expect, it } from 'vitest';
import { CircleShape } from '../../src/domain/CircleShape.js';
import { RectShape } from '../../src/domain/RectShape.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { SvgGroup } from '../../src/domain/SvgGroup.js';

describe('SvgDocument aggregate and Composite structure', () => {
  const createScene = () => {
    const document = new SvgDocument();
    const outer = new SvgGroup('outer');
    const inner = new SvgGroup('inner');
    const rect = new RectShape('rect', 1, 2, 3, 4);
    const circle = new CircleShape('circle', 5, 6, 7);
    document.append(outer);
    document.append(rect, outer);
    document.append(inner, outer);
    document.append(circle, inner);
    return { document, outer, inner, rect, circle };
  };

  it('starts with an empty 800x600 canvas and accepts positive fractional dimensions', () => {
    const document = new SvgDocument();
    expect([document.width, document.height, document.size]).toEqual([800, 600, 0]);
    expect(document.children).toEqual([]);
    expect([...document]).toEqual([]);
    expect(() => document.verifyInvariants()).not.toThrow();
    const fractional = new SvgDocument(0.5, 1.25);
    expect([fractional.width, fractional.height]).toEqual([0.5, 1.25]);
  });

  it.each([[0, 1], [-1, 1], [1, 0], [1, -1], [NaN, 1], [1, Infinity]])(
    'rejects invalid canvas dimensions (%s, %s)', (width, height) => {
      expect(() => new SvgDocument(width, height)).toThrow();
    },
  );

  it('indexes nested nodes and keeps exact parents and document ownership', () => {
    const { document, outer, inner, rect, circle } = createScene();
    expect(document.size).toBe(4);
    expect(outer.parent).toBe(document);
    expect(rect.parent).toBe(outer);
    expect(inner.parent).toBe(outer);
    expect(circle.parent).toBe(inner);
    for (const node of document) {
      expect(node.document).toBe(document);
      expect(document.findById(node.id)).toBe(node);
    }
    expect(document.findById('missing')).toBeUndefined();
    expect(() => document.requireById('missing')).toThrow('no such shape: missing');
    document.verifyInvariants();
  });

  it('provides preorder traversal and ordered direct children without exposing arrays', () => {
    const { document, outer, inner, rect, circle } = createScene();
    expect([...document].map(node => node.id)).toEqual(['outer', 'rect', 'inner', 'circle']);
    expect([...inner]).toEqual([inner, circle]);
    expect([...rect]).toEqual([rect]);
    expect(outer.children).toEqual([rect, inner]);
    const oldChildren = outer.children;
    expect(Reflect.set(oldChildren, '0', circle)).toBe(false);
    expect(Reflect.set(document.children, 'length', 0)).toBe(false);
    document.append(new SvgGroup('last'), outer);
    expect(oldChildren).toEqual([rect, inner]);
    expect(outer.children.map(node => node.id)).toEqual(['rect', 'inner', 'last']);
    document.verifyInvariants();
  });

  it('enforces document-wide case-sensitive IDs', () => {
    const { document, inner } = createScene();
    const distinct = new SvgGroup('RECT');
    document.append(distinct, inner);
    const duplicate = new SvgGroup('rect');
    expect(() => document.append(duplicate)).toThrow('id already exists: rect');
    expect(duplicate.parent).toBeNull();
    expect(duplicate.document).toBeNull();
    expect(document.findById('RECT')).toBe(distinct);
    expect(document.size).toBe(5);
    document.verifyInvariants();
  });

  it('inserts at precise root and container positions', () => {
    const { document, outer } = createScene();
    const root = new SvgGroup('first');
    const child = new SvgGroup('middle');
    document.insert(root, 0);
    document.insert(child, 1, outer);
    expect(document.children.map(node => node.id)).toEqual(['first', 'outer']);
    expect(outer.children.map(node => node.id)).toEqual(['rect', 'middle', 'inner']);
    document.verifyInvariants();
  });

  it.each([-1, 1.5, NaN, Infinity, 99])('rejects an invalid insertion index %s atomically', index => {
    const { document } = createScene();
    const node = new SvgGroup('new');
    expect(() => document.insert(node, index)).toThrow('invalid child index');
    expect([...document].map(item => item.id)).toEqual(['outer', 'rect', 'inner', 'circle']);
    expect(node.parent).toBeNull();
    expect(document.size).toBe(4);
    document.verifyInvariants();
  });

  it('rejects duplicate ownership within and across documents', () => {
    const { document, outer, rect } = createScene();
    const other = new SvgDocument();
    expect(() => document.append(rect, outer)).toThrow('already belongs to a document');
    expect(() => other.append(outer)).toThrow('already belongs to a document');
    expect(other.size).toBe(0);
    expect(outer.children.map(node => node.id)).toEqual(['rect', 'inner']);
    document.verifyInvariants();
    other.verifyInvariants();
  });

  it('rejects self-parenting and ancestor cycles without changing either tree', () => {
    const { document, outer, inner } = createScene();
    expect(() => document.append(outer, outer)).toThrow('itself or its descendant');
    expect(() => document.append(outer, inner)).toThrow('itself or its descendant');
    expect([...document].map(node => node.id)).toEqual(['outer', 'rect', 'inner', 'circle']);
    document.verifyInvariants();
  });

  it('rejects detached, foreign, and leaf parents without registering the new node', () => {
    const { document } = createScene();
    const foreignDocument = new SvgDocument();
    const foreign = new SvgGroup('foreign');
    foreignDocument.append(foreign);
    const detached = new SvgGroup('detached');
    const leaf = new CircleShape('leaf', 0, 0, 1);
    document.append(leaf);
    for (const parent of [foreign, detached, leaf]) {
      const node = new SvgGroup('new');
      expect(() => document.append(node, parent)).toThrow();
      expect(node.parent).toBeNull();
      expect(document.findById('new')).toBeUndefined();
      document.verifyInvariants();
    }
    foreignDocument.verifyInvariants();
  });

  it('detaches a complete subtree, preserves its internal parents, and reindexes it on insertion', () => {
    const { document, outer, inner, rect, circle } = createScene();
    expect(document.remove('outer')).toBe(outer);
    expect(document.children).toEqual([]);
    expect(document.size).toBe(0);
    expect(outer.parent).toBeNull();
    expect(inner.parent).toBe(outer);
    expect(circle.parent).toBe(inner);
    for (const node of outer) {
      expect(node.document).toBeNull();
      expect(document.findById(node.id)).toBeUndefined();
    }
    expect(() => document.append(rect)).toThrow('already has a parent');
    document.insert(outer, 0);
    expect([...document].map(node => node.id)).toEqual(['outer', 'rect', 'inner', 'circle']);
    expect(outer.parent).toBe(document);
    expect(document.requireById('circle')).toBe(circle);
    document.verifyInvariants();
  });

  it('removes a nested leaf without changing its siblings and can transfer it to another document', () => {
    const { document, outer, rect } = createScene();
    document.remove('rect');
    expect(outer.children.map(node => node.id)).toEqual(['inner']);
    expect(rect.parent).toBeNull();
    const other = new SvgDocument();
    other.append(rect);
    expect(rect.parent).toBe(other);
    expect(rect.document).toBe(other);
    expect(document.findById('rect')).toBeUndefined();
    document.verifyInvariants();
    other.verifyInvariants();
  });

  it('restores a detached nested container and its descendants at the original position', () => {
    const { document, outer, inner, rect, circle } = createScene();
    const last = new SvgGroup('last');
    document.append(last, outer);
    const originalIndex = outer.children.indexOf(inner);
    document.remove(inner.id);
    expect(outer.children).toEqual([rect, last]);
    expect(inner.parent).toBeNull();
    expect(circle.parent).toBe(inner);
    expect(document.findById(circle.id)).toBeUndefined();
    document.verifyInvariants();

    document.insert(inner, originalIndex, outer);
    expect(outer.children).toEqual([rect, inner, last]);
    expect(inner.parent).toBe(outer);
    expect(document.requireById(circle.id)).toBe(circle);
    document.verifyInvariants();
  });

  it('validates every subtree ID before attaching anything', () => {
    const { document, outer, inner, circle } = createScene();
    document.remove('outer');
    const target = new SvgDocument();
    const collision = new SvgGroup('circle');
    target.append(collision);
    expect(() => target.append(outer)).toThrow('id already exists: circle');
    expect(target.children).toEqual([collision]);
    expect(target.size).toBe(1);
    expect(outer.parent).toBeNull();
    expect(circle.parent).toBe(inner);
    expect([...outer].every(node => node.document === null)).toBe(true);
    target.verifyInvariants();
    document.append(outer);
    document.verifyInvariants();
  });

  it('leaves the aggregate unchanged when removing a nonexistent node', () => {
    const { document } = createScene();
    expect(() => document.remove('missing')).toThrow('no such shape: missing');
    expect(document.size).toBe(4);
    document.verifyInvariants();
  });
});
