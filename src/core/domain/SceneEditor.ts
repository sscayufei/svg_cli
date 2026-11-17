import { ChangeSet } from './ChangeSet.js';
import type { ReversibleStep } from './ChangeSet.js';
import type { SvgDocument } from './SvgDocument.js';
import { SvgGroup } from './SvgGroup.js';
import type { SvgNode } from './SvgNode.js';

export interface GroupPlan {
  readonly node: SvgGroup;
  readonly change: ChangeSet;
}

/** Receiver for multi-node structural rules. All writes go through SvgDocument. */
export class SceneEditor {
  public constructor(private readonly document: SvgDocument) {}

  public planGroup(id: string, ids: readonly string[]): GroupPlan {
    if (this.document.findById(id) !== undefined) throw new Error(`id already exists: ${id}`);
    if (ids.length < 2) throw new Error('group requires at least two shapes');
    const unique = new Set<string>();
    const selected = ids.map(memberId => {
      if (unique.has(memberId)) throw new Error(`duplicate shape id: ${memberId}`);
      unique.add(memberId);
      return this.document.requireById(memberId);
    });
    const selection = new Set(selected);
    for (const node of selected) {
      let ancestor = node.parent;
      while (ancestor instanceof SvgGroup) {
        if (selection.has(ancestor)) throw new Error(`cannot group a container into its own descendant: ${ancestor.id}`);
        ancestor = ancestor.parent;
      }
    }
    const first = selected[0];
    if (first === undefined) throw new Error('group requires at least two shapes');
    const parent = first.parent instanceof SvgGroup ? first.parent : null;
    const index = this.children(parent).indexOf(first);
    const members = [...this.document].filter(node => selection.has(node));
    const origins = selected.map(node => {
      const source = node.parent instanceof SvgGroup ? node.parent : null;
      return { node, parent: source, index: this.children(source).indexOf(node) };
    });
    const group = new SvgGroup(id);
    const registration: ReversibleStep = {
      apply: () => {
        for (const origin of origins) {
          if (origin.node.document !== this.document || origin.node.parent !== (origin.parent ?? this.document)
            || this.children(origin.parent)[origin.index] !== origin.node) {
            throw new Error(`node position changed: ${origin.node.id}`);
          }
        }
        this.document.insert(group, index, parent);
      },
      revert: () => {
        if (this.document.findById(id) !== group || group.children.length !== 0) throw new Error(`group contents changed: ${id}`);
        this.document.remove(id);
      },
    };
    return Object.freeze({ node: group, change: new ChangeSet([
      registration, ...members.map((node, memberIndex) => this.transfer(node, group, memberIndex)),
    ]) });
  }

  public planUngroup(id: string): ChangeSet {
    const node = this.document.requireById(id);
    if (!(node instanceof SvgGroup)) throw new Error(`not a container: ${id}`);
    if (node.parent === this.document) throw new Error(`cannot ungroup top-level container: ${id}`);
    const parent = node.parent;
    if (!(parent instanceof SvgGroup)) throw new Error(`invalid scene graph parent: ${id}`);
    const index = parent.children.indexOf(node);
    const children = node.children;
    let deletion: ChangeSet | null = null;
    return new ChangeSet([
      ...children.map((child, childIndex) => this.transfer(child, parent, index + childIndex)),
      {
        apply: () => {
          if (node.children.length !== 0 || this.document.findById(id) !== node) throw new Error(`group contents changed: ${id}`);
          const planned = this.document.planDelete(id); planned.apply(); deletion = planned;
        },
        revert: () => {
          if (deletion === null) throw new Error('ungroup has not been applied');
          deletion.revert();
        },
      },
    ]);
  }

  public planAddTo(containerId: string, id: string): ChangeSet {
    const parent = this.document.requireContainer(containerId);
    const node = this.document.requireById(id);
    const index = parent.children.length - (node.parent === parent ? 1 : 0);
    return this.document.planRelocate(id, parent, index);
  }

  public planFront(id: string): ChangeSet { return this.planOrder(id, true); }
  public planBack(id: string): ChangeSet { return this.planOrder(id, false); }

  private planOrder(id: string, front: boolean): ChangeSet {
    const node = this.document.requireById(id);
    const parent = node.parent instanceof SvgGroup ? node.parent : null;
    return this.document.planRelocate(id, parent, front ? this.children(parent).length - 1 : 0);
  }

  private children(parent: SvgGroup | null): readonly SvgNode[] { return parent === null ? this.document.children : parent.children; }

  /** Plan at the moment preceding this step, since earlier steps shift indices. */
  private transfer(node: SvgNode, parent: SvgGroup, index: number): ReversibleStep {
    let change: ChangeSet | null = null;
    return {
      apply: () => {
        if (this.document.findById(node.id) !== node) throw new Error(`node ownership changed: ${node.id}`);
        const planned = this.document.planRelocate(node.id, parent, index);
        planned.apply(); change = planned;
      },
      revert: () => {
        if (change === null) throw new Error('transfer has not been applied');
        change.revert();
      },
    };
  }
}
