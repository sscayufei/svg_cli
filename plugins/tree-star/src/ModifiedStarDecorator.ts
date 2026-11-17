import type { NodeSnapshot, SceneState, SessionEvent, SessionSnapshot, TreeDecorator, TreeRow } from '@svgframe/core';

/** Saved-content comparison is observer state, independent of command history and other labels. */
export class ModifiedStarDecorator implements TreeDecorator {
  public readonly name = 'modified-star';
  #baselineRoot: string;
  #baselineNodes: Map<string, string>;
  #dirty = new Set<string>();
  #rootDirty = false;

  public constructor(initial: SessionSnapshot = { document: null, sourcePath: null }) {
    this.#baselineRoot = this.rootSignature(initial.document);
    this.#baselineNodes = this.nodeSignatures(initial.document);
  }

  public observe(event: SessionEvent): void {
    const scene = event.snapshot.document;
    if (event.kind === 'init' || event.kind === 'read' || event.kind === 'save') {
      this.#baselineRoot = this.rootSignature(scene);
      this.#baselineNodes = this.nodeSignatures(scene);
      this.#dirty = new Set();
      this.#rootDirty = false;
      return;
    }
    const nodes = new Map(scene?.nodes.map(node => [node.id, node]));
    const dirty = new Set<string>();
    for (const node of nodes.values()) {
      if (this.nodeSignature(node) === this.#baselineNodes.get(node.id)) continue;
      // Previously visited ancestor paths already reach the root; each ID is added at most once.
      let current: NodeSnapshot | undefined = node;
      while (current !== undefined && !dirty.has(current.id)) {
        dirty.add(current.id);
        current = current.parent === null ? undefined : nodes.get(current.parent.id);
      }
    }
    this.#dirty = dirty;
    this.#rootDirty = this.rootSignature(scene) !== this.#baselineRoot || dirty.size > 0;
  }

  public decorate(row: TreeRow): string | undefined {
    return (row.node === null ? this.#rootDirty : this.#dirty.has(row.node.id)) ? '*' : undefined;
  }

  private rootSignature(scene: SceneState | null): string {
    return JSON.stringify(scene === null ? null : [scene.width, scene.height, scene.rootIds]);
  }
  private nodeSignatures(scene: SceneState | null): Map<string, string> {
    return new Map(scene?.nodes.map(node => [node.id, this.nodeSignature(node)]));
  }
  private nodeSignature(node: NodeSnapshot): string {
    const ordered = (value: Readonly<Record<string, string | number>>) => Object.keys(value).sort().map(key => [key, value[key]]);
    return JSON.stringify([node.type, node.semanticType, node.displayType, node.isContainer,
      node.parent === null ? null : [node.parent.id, node.parent.type], node.childIds, ordered(node.geometry), ordered(node.attributes)]);
  }
}
