import { SvgGroup } from './SvgGroup.js';
import { ChangeSet } from './ChangeSet.js';
import type { SvgNode } from './SvgNode.js';
import { insertGroupChild, removeGroupChild, setNodeLocation } from './internal/TreeAccess.js';

/** Aggregate root: coordinates child order, ownership, parents and the ID index. */
export class SvgDocument implements Iterable<SvgNode> {
  #width: number;
  #height: number;
  readonly #children: SvgNode[] = [];
  readonly #idIndex = new Map<string, SvgNode>();

  public constructor(width = 800, height = 600) {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('canvas dimensions must be finite and positive');
    }
    this.#width = width;
    this.#height = height;
  }

  public get width(): number { return this.#width; }
  public get height(): number { return this.#height; }
  public get size(): number { return this.#idIndex.size; }
  public get children(): readonly SvgNode[] { return Object.freeze([...this.#children]); }

  public resize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      throw new Error('canvas dimensions must be finite and positive');
    }
    this.#width = width;
    this.#height = height;
  }

  public requireContainer(id: string): SvgGroup {
    const node = this.findById(id);
    if (node === undefined) throw new Error(`no such container: ${id}`);
    if (!(node instanceof SvgGroup)) throw new Error(`not a container: ${id}`);
    return node;
  }

  public findById(id: string): SvgNode | undefined {
    return this.#idIndex.get(id);
  }

  public requireById(id: string): SvgNode {
    const node = this.findById(id);
    if (node === undefined) {
      throw new Error(`no such shape: ${id}`);
    }
    return node;
  }

  public append(node: SvgNode, parent: SvgNode | null = null): void {
    this.insert(node, parent === null ? this.#children.length : parent.children.length, parent);
  }

  /** Attach a detached subtree; all checks precede any structural writes. */
  public insert(node: SvgNode, index: number, parent: SvgNode | null = null): void {
    if (parent !== null) {
      if (!(parent instanceof SvgGroup)) {
        throw new Error(`not a container: ${parent.id}`);
      }
      if (parent.document !== this || this.#idIndex.get(parent.id) !== parent) {
        throw new Error(`container does not belong to this document: ${parent.id}`);
      }
      let ancestor: SvgGroup | SvgDocument | null = parent;
      while (ancestor instanceof SvgGroup) {
        if (ancestor === node) {
          throw new Error(`cannot attach a node to itself or its descendant: ${node.id}`);
        }
        ancestor = ancestor.parent;
      }
    }
    const siblings = parent === null ? this.#children : parent.children;
    if (!Number.isInteger(index) || index < 0 || index > siblings.length) {
      throw new Error('invalid child index');
    }
    if (node.document !== null) {
      throw new Error(`node already belongs to a document: ${node.id}`);
    }
    if (node.parent !== null) {
      throw new Error(`node already has a parent: ${node.id}`);
    }

    const subtree = [...node];
    const ids = new Set<string>();
    for (const descendant of subtree) {
      if (descendant.document !== null) {
        throw new Error(`node already belongs to a document: ${descendant.id}`);
      }
      if (ids.has(descendant.id) || this.#idIndex.has(descendant.id)) {
        throw new Error(`id already exists: ${descendant.id}`);
      }
      ids.add(descendant.id);
      for (const child of descendant.children) {
        if (child.parent !== descendant) {
          throw new Error(`invalid subtree parent: ${child.id}`);
        }
      }
    }

    if (parent === null) {
      this.#children.splice(index, 0, node);
    } else {
      parent[insertGroupChild](index, node);
    }
    for (const descendant of subtree) {
      descendant[setNodeLocation](this, descendant === node ? parent ?? this : descendant.parent);
      this.#idIndex.set(descendant.id, descendant);
    }
  }

  /** Prepare a reversible deletion, preserving parent, insertion index and identity. */
  public planDelete(id: string): ChangeSet {
    const node = this.requireById(id);
    const parent = node.parent instanceof SvgGroup ? node.parent : null;
    const index = (parent === null ? this.children : parent.children).indexOf(node);
    return new ChangeSet([{
      apply: () => {
        const siblings = parent === null ? this.children : parent.children;
        if (this.findById(id) !== node || siblings[index] !== node) {
          throw new Error(`node position changed: ${id}`);
        }
        this.remove(id);
      },
      revert: () => this.insert(node, index, parent),
    }]);
  }

  /** Detach a subtree without destroying its internal structure or identities. */
  public remove(id: string): SvgNode {
    const node = this.requireById(id);
    const subtree = [...node];
    const parent = node.parent;
    if (parent === null) {
      throw new Error(`invalid scene graph parent: ${id}`);
    }
    const siblings = parent === this ? this.#children : parent.children;
    const index = siblings.indexOf(node);
    if (index < 0) {
      throw new Error(`invalid scene graph position: ${id}`);
    }
    if (parent instanceof SvgGroup) {
      parent[removeGroupChild](index);
    } else {
      this.#children.splice(index, 1);
    }
    for (const descendant of subtree) {
      this.#idIndex.delete(descendant.id);
      descendant[setNodeLocation](null, descendant === node ? null : descendant.parent);
    }
    return node;
  }

  public *[Symbol.iterator](): IterableIterator<SvgNode> {
    for (const child of this.children) {
      yield* child;
    }
  }

  /** Diagnostic check of the aggregate's tree/index/ownership invariants. */
  public verifyInvariants(): void {
    const visited = new Set<SvgNode>();
    const pending: { node: SvgNode; parent: SvgGroup | SvgDocument }[] =
      this.#children.map(node => ({ node, parent: this }));
    while (pending.length > 0) {
      const entry = pending.pop();
      if (entry === undefined) break;
      const { node, parent } = entry;
      if (visited.has(node)) {
        throw new Error(`cycle or repeated node: ${node.id}`);
      }
      if (node.parent !== parent || node.document !== this || this.#idIndex.get(node.id) !== node) {
        throw new Error(`inconsistent scene graph: ${node.id}`);
      }
      visited.add(node);
      for (const child of node.children) {
        if (!(node instanceof SvgGroup)) {
          throw new Error(`not a container: ${node.id}`);
        }
        pending.push({ node: child, parent: node });
      }
    }
    if (visited.size !== this.#idIndex.size) {
      throw new Error('scene graph and id index differ');
    }
  }
}
