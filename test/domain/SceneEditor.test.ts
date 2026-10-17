import { describe, expect, it } from 'vitest';
import { SceneEditor } from '../../src/domain/SceneEditor.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { SvgGroup } from '../../src/domain/SvgGroup.js';
import { RectShape } from '../../src/domain/RectShape.js';
import type { ChangeSet } from '../../src/domain/ChangeSet.js';

describe('M4 structural transactions', () => {
  const scene = (document = new SvgDocument()) => {
    const A = new SvgGroup('A'); const B = new SvgGroup('B');
    const a = new RectShape('a', 1, 2, 3, 4); const b = new SvgGroup('b');
    const c = new SvgGroup('c'); const d = new SvgGroup('d');
    document.append(A); document.append(B);
    document.append(a, A); document.append(b, A); document.append(c, B); document.append(d, B);
    return { document, editor: new SceneEditor(document), A, B, a, b, c, d };
  };
  const state = (document: SvgDocument) => [...document].map(node => ({
    id: node.id, node, parent: node.parent, children: node.children, attributes: node.getAttributes(),
    parentId: node.parent !== null && 'id' in node.parent ? node.parent.id : 'svg',
    childIds: node.children.map(child => child.id),
  }));

  it('groups across parents using the first argument anchor and original document order', () => {
    const { document, editor, A, B, a, b, c, d } = scene(); const before = state(document);
    const plan = editor.planGroup('g', ['c', 'a']); plan.change.apply();
    expect(A.children).toEqual([b]); expect(B.children).toEqual([plan.node, d]);
    expect(plan.node.children).toEqual([a, c]);
    expect(document.requireById('a')).toBe(a); expect(document.size).toBe(7);
    expect(a.getGeometry()).toEqual({ x: 1, y: 2, width: 3, height: 4 });
    document.verifyInvariants();
    for (let index = 0; index < 3; index++) {
      plan.change.revert(); expect(state(document)).toEqual(before); document.verifyInvariants();
      plan.change.apply(); expect(plan.node.children).toEqual([a, c]); document.verifyInvariants();
    }
  });

  it('corrects the anchor when selected earlier siblings are removed', () => {
    const { document, editor, A, a, b } = scene();
    const tail = new SvgGroup('tail'); document.append(tail, A);
    const plan = editor.planGroup('g', ['tail', 'a']); plan.change.apply();
    expect(A.children).toEqual([b, plan.node]); expect(plan.node.children).toEqual([a, tail]);
    plan.change.revert(); expect(A.children).toEqual([a, b, tail]); document.verifyInvariants();
  });

  it.each([
    { id: 'A', ids: ['a', 'c'], message: 'id already exists: A' },
    { id: 'g', ids: ['a', 'a'], message: 'duplicate shape id: a' },
    { id: 'g', ids: ['a', 'missing'], message: 'no such shape: missing' },
    { id: 'g', ids: ['a', 'A'], message: 'cannot group a container into its own descendant: A' },
    { id: 'g', ids: ['a'], message: 'group requires at least two shapes' },
  ])('rejects invalid groups atomically: $message', ({ id, ids, message }) => {
    const { document, editor } = scene(); const before = state(document);
    expect(() => editor.planGroup(id, ids)).toThrow(message);
    expect(state(document)).toEqual(before); document.verifyInvariants();
  });

  it('promotes nested group children into its slot, preserving order, identity and local styles', () => {
    const { document, editor, A, a, b } = scene(); const g = new SvgGroup('g', { fill: 'blue' });
    const x = new SvgGroup('x'); const y = new SvgGroup('y');
    document.insert(g, 1, A); document.append(x, g); document.append(y, g);
    const before = state(document); const change = editor.planUngroup('g'); change.apply();
    expect(A.children).toEqual([a, x, y, b]); expect(document.findById('g')).toBeUndefined();
    expect(x.getAttributes()).toEqual({}); expect(g.children).toEqual([]);
    expect(x.parent).toBe(A); document.verifyInvariants();
    change.revert(); expect(state(document)).toEqual(before); expect(g.getAttributes().fill).toBe('blue');
    change.apply(); document.verifyInvariants();
  });

  it('ungroups an empty nested group and restores it exactly', () => {
    const { document, editor, A, b } = scene(); const before = state(document);
    const change = editor.planUngroup('b'); change.apply();
    expect(A.children.map(node => node.id)).toEqual(['a']);
    change.revert(); expect(document.requireById('b')).toBe(b); expect(state(document)).toEqual(before);
  });

  it('rejects top-level ungroup and leaf targets without mutation', () => {
    const { document, editor } = scene(); const before = state(document);
    expect(() => editor.planUngroup('A')).toThrow('cannot ungroup top-level container: A');
    expect(() => editor.planUngroup('a')).toThrow('not a container: a');
    expect(state(document)).toEqual(before);
  });

  it('moves an existing subtree into the last child slot and restores source positions', () => {
    const { document, editor, A, B, a, b, c, d } = scene(); const before = state(document);
    const change = editor.planAddTo('B', 'a'); change.apply();
    expect(A.children).toEqual([b]); expect(B.children).toEqual([c, d, a]);
    expect(document.requireById('a')).toBe(a); expect(document.size).toBe(6);
    change.revert(); expect(state(document)).toEqual(before);
    const sameParent = editor.planAddTo('A', 'a'); sameParent.apply();
    expect(A.children).toEqual([b, a]); sameParent.revert(); expect(state(document)).toEqual(before);
    const subtree = editor.planAddTo('B', 'A'); subtree.apply();
    expect(a.parent).toBe(A); expect(A.parent).toBe(B); expect(a.document).toBe(document);
    subtree.revert(); expect(state(document)).toEqual(before); document.verifyInvariants();
  });

  it('rejects cycles and missing/noncontainer destinations before moving anything', () => {
    const { document, editor } = scene(); const before = state(document);
    expect(() => editor.planAddTo('A', 'A')).toThrow('itself or its descendant');
    expect(() => editor.planAddTo('b', 'A')).toThrow('itself or its descendant');
    expect(() => editor.planAddTo('missing', 'a')).toThrow('no such container: missing');
    expect(() => editor.planAddTo('a', 'b')).toThrow('not a container: a');
    expect(() => editor.planAddTo('B', 'missing')).toThrow('no such shape: missing');
    expect(state(document)).toEqual(before); document.verifyInvariants();
  });

  it('orders only siblings, including root nodes, and treats boundary operations as reversible no-ops', () => {
    const { document, editor, A, B, a, b } = scene(); const before = state(document);
    const front = editor.planFront('a'); front.apply(); expect(A.children).toEqual([b, a]);
    const back = editor.planBack('a'); back.apply(); expect(A.children).toEqual([a, b]);
    back.revert(); front.revert(); expect(state(document)).toEqual(before);
    const root = editor.planFront('A'); root.apply(); expect(document.children).toEqual([B, A]); root.revert();
    const boundary = editor.planBack('a'); boundary.apply(); expect(state(document)).toEqual(before); boundary.revert();
    document.verifyInvariants();
  });

  it('validates relocation indices without detaching the node', () => {
    const { document, A, a } = scene(); const before = state(document);
    for (const index of [-1, NaN, 0.5, 99]) expect(() => document.planRelocate('a', A, index)).toThrow('invalid child index');
    expect(() => Reflect.apply(document.planRelocate, document, ['b', a, 0])).toThrow('not a container: a');
    expect(() => document.planRelocate('a', new SvgGroup('foreign'), 0)).toThrow('does not belong');
    expect(state(document)).toEqual(before);
  });

  it('groups populated root subtrees without replacing their identities or descendant IDs', () => {
    const { document, editor, A, B, a, c } = scene(); const before = state(document);
    const plan = editor.planGroup('all', ['B', 'A']); plan.change.apply();
    expect(document.children).toEqual([plan.node]); expect(plan.node.children).toEqual([A, B]);
    expect(document.requireById('a')).toBe(a); expect(document.requireById('c')).toBe(c);
    expect(a.parent).toBe(A); document.verifyInvariants();
    plan.change.revert(); expect(state(document)).toEqual(before); document.verifyInvariants();
  });

  it('rolls back a partially completed undo and allows restoration to be retried', () => {
    const { document, editor, A } = scene();
    const x = new SvgGroup('x'); const y = new SvgGroup('y');
    document.insert(x, 0, A); document.insert(y, 1, A);
    const original = state(document); const plan = editor.planGroup('g', ['c', 'a']); plan.change.apply();
    document.remove('x'); document.remove('y'); const beforeUndo = state(document);
    expect(() => plan.change.revert()).toThrow('invalid child index');
    expect(state(document)).toEqual(beforeUndo); document.verifyInvariants();
    document.insert(x, 0, A); document.insert(y, 1, A);
    plan.change.revert(); expect(state(document)).toEqual(original); document.verifyInvariants();
  });

  it('rolls back an interrupted group after the first transfer and allows a fresh retry', () => {
    class InterruptedDocument extends SvgDocument {
      public fail = true;
      #calls = 0;
      public override planRelocate(id: string, parent: SvgGroup | null, index: number): ChangeSet {
        this.#calls++;
        if (this.fail && this.#calls === 2) throw new Error('interrupted transfer');
        return super.planRelocate(id, parent, index);
      }
    }
    const document = new InterruptedDocument(); const { editor } = scene(document); const before = state(document);
    const plan = editor.planGroup('g', ['a', 'c']);
    expect(() => plan.change.apply()).toThrow('interrupted transfer');
    expect(state(document)).toEqual(before); expect(plan.node.document).toBeNull();
    document.verifyInvariants(); document.fail = false; plan.change.apply();
    expect(plan.node.children.map(node => node.id)).toEqual(['a', 'c']);
    plan.change.revert(); expect(state(document)).toEqual(before);
  });
});
