import type { SvgGeometry, SvgStyle } from './SvgAttributes.js';
import { ChangeSet } from './ChangeSet.js';
import { SvgNode } from './SvgNode.js';
import { insertGroupChild, removeGroupChild, setNodeLocation } from './internal/TreeAccess.js';

/** Composite: callers inspect groups through the same SvgNode contract as leaves. */
export class SvgGroup extends SvgNode {
  readonly #children: SvgNode[] = [];

  public constructor(id: string, style: SvgStyle = {}) {
    super(id, style);
  }

  public get type(): string { return 'g'; }
  public override get isContainer(): boolean { return true; }

  public override get children(): readonly SvgNode[] {
    return Object.freeze([...this.#children]);
  }

  public getGeometry(): SvgGeometry {
    return Object.freeze({});
  }

  /** Policy hooks are pure checks; implementations cannot mutate aggregate storage. */
  public assertCanAccept(_child: SvgNode): void {}
  public assertCanRelease(_child: SvgNode): void {}
  public assertCanUngroup(): void {}
  public verifyStructure(): void {}

  /** Initialize a detached, empty container atomically, without exposing tree symbols. */
  public initializeChildren(children: readonly SvgNode[]): void {
    if (this.document !== null || this.parent !== null || this.#children.length) throw new Error(`container is not empty and detached: ${this.id}`);
    const ids = new Set<string>([this.id]);
    for (const child of children) {
      this.assertCanAccept(child);
      if (child.parent !== null || child.document !== null) throw new Error(`child is not detached: ${child.id}`);
      for (const node of child) {
        if (node.document !== null) throw new Error(`node already belongs to a document: ${node.id}`);
        if (ids.has(node.id)) throw new Error(`id already exists: ${node.id}`);
        ids.add(node.id);
        if (node instanceof SvgGroup) node.verifyStructure();
        for (const descendant of node.children) if (descendant.parent !== node) throw new Error(`invalid subtree parent: ${descendant.id}`);
      }
    }
    for (const child of children) { this.#children.push(child); child[setNodeLocation](null, this); }
    try { this.verifyStructure(); } catch (error) {
      this.#children.length = 0;
      for (const child of children) child[setNodeLocation](null, null);
      throw error;
    }
  }

  protected override buildMove(dx: number, dy: number): ChangeSet {
    return ChangeSet.combine(this.#children.map(child => child.planMove(dx, dy)));
  }

  protected override buildScale(factor: number): ChangeSet {
    return ChangeSet.combine(this.#children.map(child => child.planScale(factor)));
  }

  /** @internal Structural writes belong exclusively to SvgDocument. */
  public [insertGroupChild](index: number, node: SvgNode): void {
    this.#children.splice(index, 0, node);
  }

  /** @internal Structural writes belong exclusively to SvgDocument. */
  public [removeGroupChild](index: number): void {
    this.#children.splice(index, 1);
  }
}
