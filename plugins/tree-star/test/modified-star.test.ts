import { describe, expect, it } from 'vitest';
import type { NodeSnapshot, SceneState, SessionEventKind } from '@svgframe/core';
import { ModifiedStarDecorator } from '../src/ModifiedStarDecorator.js';

function node(id: string, overrides: Partial<NodeSnapshot> = {}): NodeSnapshot {
  return { id, type: 'rect', semanticType: 'rect', displayType: 'rect', isContainer: false,
    childIds: [], parent: null, geometry: { x: 1, y: 2, width: 3, height: 4 },
    description: { kind: 'properties', values: { x: 1, y: 2, width: 3, height: 4 } }, attributes: {}, ...overrides };
}
function scene(nodes: readonly NodeSnapshot[] = [], width = 800, height = 600): SceneState {
  return { width, height, rootIds: nodes.filter(n => n.parent === null).map(n => n.id), nodes };
}
function fixture() {
  const leaf = node('r', { parent: { id: 'g', type: 'g' }, attributes: { fill: 'red', text: 'old' } });
  const group = node('g', { type: 'g', semanticType: 'g', displayType: 'g', isContainer: true, childIds: ['r'], geometry: {} });
  const sibling = node('s');
  const saved = scene([group, leaf, sibling]);
  const star = new ModifiedStarDecorator({ document: saved, sourcePath: '/saved.svg' });
  const update = (next: SceneState | null, kind: SessionEventKind = 'edit', sourcePath = '/saved.svg') => star.observe({ kind, snapshot: { document: next, sourcePath } });
  const marks = (current = saved) => [null, ...current.nodes].filter(n => star.decorate({ node: n, canvas: current }) === '*').map(n => n?.id ?? '<root>');
  return { leaf, group, sibling, saved, star, update, marks };
}

describe('ModifiedStarDecorator saved-content state machine (core public only)', () => {
  it('starts without a document and establishes a clean init baseline', () => {
    const star = new ModifiedStarDecorator();
    expect(star.decorate({ node: null, canvas: { width: 800, height: 600 } })).toBeUndefined();
    star.observe({ kind: 'init', snapshot: { document: scene(), sourcePath: null } });
    expect(star.decorate({ node: null, canvas: { width: 800, height: 600 } })).toBeUndefined();
  });

  it('marks new nodes, their current ancestors and the root, leaving siblings clean', () => {
    const f = fixture(); f.update(scene(), 'init'); f.update(f.saved);
    expect(f.marks()).toEqual(['<root>', 'g', 'r', 's']);
    f.update(f.saved, 'save');
    const added = node('new', { parent: { id: 'g', type: 'g' } });
    const next = scene([{ ...f.group, childIds: ['r', 'new'] }, f.leaf, added, f.sibling]);
    f.update(next); expect(f.marks(next)).toEqual(['<root>', 'g', 'new']);
  });

  it.each([
    ['geometry', { geometry: { x: 9, y: 2, width: 3, height: 4 } }],
    ['attribute value', { attributes: { fill: 'blue', text: 'old' } }],
    ['attribute absence', { attributes: { text: 'old' } }],
    ['text', { attributes: { fill: 'red', text: '' } }],
    ['semantic type', { semanticType: 'other' }],
    ['type', { type: 'other' }],
    ['display type', { displayType: 'other' }],
    ['container identity', { isContainer: true }],
    ['parent identity', { parent: { id: 'g', type: 'custom' } }],
  ] satisfies [string, Partial<NodeSnapshot>][])('compares %s without changing the input snapshot', (_name, change) => {
    const f = fixture(); const next = scene([f.group, { ...f.leaf, ...change }, f.sibling]);
    const before = JSON.stringify(next); f.update(next);
    expect(f.marks(next)).toEqual(['<root>', 'g', 'r']); expect(JSON.stringify(next)).toBe(before);
  });

  it('ignores property enumeration order, source path, node enumeration order and object identity', () => {
    const f = fixture();
    const next = { ...f.saved, nodes: [f.sibling, { ...f.leaf, geometry: { height: 4, width: 3, y: 2, x: 1 }, attributes: { text: 'old', fill: 'red' }, parent: { type: 'g', id: 'g' } }, f.group] };
    f.update(next, 'edit', '/another.svg'); expect(f.marks(next)).toEqual([]);
    f.update(JSON.parse(JSON.stringify(f.saved)) as SceneState, 'redo'); expect(f.marks()).toEqual([]);
  });

  it('compares content after undo/redo and edit branches, independent of history positions', () => {
    const f = fixture(); const changed = scene([f.group, { ...f.leaf, attributes: { fill: 'blue' } }, f.sibling]);
    f.update(changed); expect(f.marks(changed)).toEqual(['<root>', 'g', 'r']);
    f.update(f.saved, 'undo'); expect(f.marks()).toEqual([]);
    f.update(changed, 'redo'); expect(f.marks(changed)).toEqual(['<root>', 'g', 'r']);
    f.update(f.saved, 'undo');
    const branch = scene([f.group, { ...f.leaf, attributes: { fill: 'green' } }, f.sibling]);
    f.update(branch); expect(f.marks(branch)).toEqual(['<root>', 'g', 'r']);
    f.update(f.saved); expect(f.marks()).toEqual([]);
  });

  it.each(['save', 'read', 'init'] as const)('resets all marks and future comparisons on successful %s', kind => {
    const f = fixture(); const next = scene([node('replacement')], 10, 20);
    f.update(next); expect(f.marks(next)).toEqual(['<root>', 'replacement']);
    f.update(next, kind); expect(f.marks(next)).toEqual([]);
    f.update(next, 'undo'); expect(f.marks(next)).toEqual([]);
    f.update(f.saved); expect(f.marks()).toEqual(['<root>', 'g', 'r', 's']);
  });

  it('marks only the root for canvas changes and clears it when dimensions match again', () => {
    const f = fixture(); const next = { ...f.saved, width: 900 };
    f.update(next, 'canvas'); expect(f.marks(next)).toEqual(['<root>']);
    f.update(f.saved, 'canvas'); expect(f.marks()).toEqual([]);
  });

  it('marks surviving old ancestors after deletion and clears them on restoration', () => {
    const f = fixture(); const next = scene([{ ...f.group, childIds: [] }, f.sibling]);
    f.update(next); expect(f.marks(next)).toEqual(['<root>', 'g']);
    f.update(f.saved, 'undo'); expect(f.marks()).toEqual([]);
    f.update(scene()); expect(f.marks(scene())).toEqual(['<root>']);
  });

  it('marks both old and new ancestors when a saved child moves to another container', () => {
    const f = fixture(); const destination = node('d', { type: 'g', semanticType: 'g', displayType: 'g', isContainer: true });
    const saved = scene([...f.saved.nodes, destination]); f.update(saved, 'save');
    const moved = scene([{ ...f.group, childIds: [] }, f.sibling, { ...destination, childIds: ['r'] }, { ...f.leaf, parent: { id: 'd', type: 'g' } }]);
    f.update(moved); expect(f.marks(moved)).toEqual(['<root>', 'g', 'd', 'r']);
  });

  it('compares root and child order while leaving unchanged child content clean', () => {
    const f = fixture(); const roots = { ...f.saved, rootIds: ['s', 'g'] };
    f.update(roots); expect(f.marks(roots)).toEqual(['<root>']);
    const child = node('r2', { parent: { id: 'g', type: 'g' } });
    const saved = scene([{ ...f.group, childIds: ['r', 'r2'] }, f.leaf, child]); f.update(saved, 'save');
    const ordered = scene([{ ...f.group, childIds: ['r2', 'r'] }, child, f.leaf]);
    f.update(ordered); expect(f.marks(ordered)).toEqual(['<root>', 'g']);
  });

  it('keeps baseline and cache isolated between decorator instances', () => {
    const first = fixture(); const second = fixture(); first.update(scene());
    expect(first.marks(scene())).toEqual(['<root>']); expect(second.marks()).toEqual([]);
    second.update(scene(), 'save'); expect(first.marks(scene())).toEqual(['<root>']);
    first.update(first.saved, 'undo'); expect(first.marks()).toEqual([]);
  });

  it('propagates through a deep hierarchy without recursive calls', () => {
    const nodes = Array.from({ length: 2500 }, (_, index) => node(String(index), {
      type: 'g', semanticType: 'g', displayType: 'g', isContainer: true,
      parent: index === 0 ? null : { id: String(index - 1), type: 'g' },
      childIds: index === 2499 ? [] : [String(index + 1)], geometry: {},
    }));
    const saved = scene(nodes); const star = new ModifiedStarDecorator({ document: saved, sourcePath: null });
    const changed = scene(nodes.map((n, index) => index === 2499 ? { ...n, attributes: { fill: 'red' } } : n));
    star.observe({ kind: 'edit', snapshot: { document: changed, sourcePath: null } });
    for (const n of changed.nodes) expect(star.decorate({ node: n, canvas: changed })).toBe('*');
    star.observe({ kind: 'undo', snapshot: { document: saved, sourcePath: null } });
    expect(star.decorate({ node: nodes[0]!, canvas: saved })).toBeUndefined();
  });
});
