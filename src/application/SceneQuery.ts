import type { SvgDocument } from '../domain/SvgDocument.js';
import type { SvgNode } from '../domain/SvgNode.js';
import type { NodeSnapshot, TreeEntry, TreeSnapshot } from './SceneSnapshot.js';

/** Read-only projection receiver. Traverses the model through its Iterable API. */
export class SceneQuery {
  public show(document: SvgDocument, id: string): NodeSnapshot {
    return this.snapshot(document.requireById(id));
  }

  public tree(document: SvgDocument, id?: string): TreeSnapshot {
    const root = id === undefined ? null : document.requireById(id);
    const depths = new Map<SvgNode | SvgDocument, number>([[document, 0]]);
    const entries: TreeEntry[] = [];
    for (const node of root ?? document) {
      const parentDepth = node.parent === null ? undefined : depths.get(node.parent);
      if (node !== root && parentDepth === undefined) {
        throw new Error(`invalid tree parent: ${node.id}`);
      }
      const depth = node === root ? 0 : (parentDepth ?? 0) + 1;
      depths.set(node, depth);
      entries.push(Object.freeze({
        node: this.snapshot(node), depth,
        last: node.parent?.children.at(-1) === node,
      }));
    }
    return Object.freeze({
      canvas: root === null ? Object.freeze({ width: document.width, height: document.height }) : null,
      entries: Object.freeze(entries),
    });
  }

  private snapshot(node: SvgNode): NodeSnapshot {
    const parent = node.parent;
    return Object.freeze({
      id: node.id, type: node.type,
      parent: parent !== null && 'id' in parent
        ? Object.freeze({ id: parent.id, type: parent.type }) : null,
      geometry: node.getGeometry(), description: node.describeGeometry(), attributes: node.getAttributes(),
    });
  }
}
