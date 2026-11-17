import type { SvgDocument } from '../domain/SvgDocument.js';
import type { SvgNode } from '../domain/SvgNode.js';
import type { NodeSnapshot, SceneState, TreeEntry, TreeSnapshot } from './SceneSnapshot.js';
import type { TreeDecorator, TreeRow } from '../extensions/Contracts.js';
import { ExtensionRegistry, type ExtensionRegistrations } from '../extensions/ExtensionRegistry.js';

/** Read-only projection receiver. Traverses the model through its Iterable API. */
export class SceneQuery {
  public constructor(private readonly decorators: ExtensionRegistrations<TreeDecorator> = new ExtensionRegistry<TreeDecorator>('decorators')) {}
  private suffixes(row: TreeRow): readonly string[] {
    return Object.freeze(this.decorators.values().flatMap(decorator => {
      const value = decorator.decorate(row);
      if (value === undefined || value === '') return [];
      if (typeof value !== 'string' || /[\r\n]/.test(value)) throw new Error(`invalid tree decorator result: ${decorator.name}`);
      return [value];
    }));
  }
  public show(document: SvgDocument, id: string): NodeSnapshot {
    return this.snapshot(document.requireById(id));
  }

  public scene(document: SvgDocument): SceneState {
    return Object.freeze({ width: document.width, height: document.height,
      rootIds: Object.freeze(document.children.map(node => node.id)),
      nodes: Object.freeze([...document].map(node => this.snapshot(node))),
    });
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
      const snapshot = this.snapshot(node);
      entries.push(Object.freeze({
        node: snapshot, depth,
        suffixes: this.suffixes(Object.freeze({ node: snapshot, canvas: Object.freeze({ width: document.width, height: document.height }) })),
        last: node.parent?.children.at(-1) === node,
      }));
    }
    return Object.freeze({
      rootSuffixes: root === null ? this.suffixes(Object.freeze({ node: null, canvas: Object.freeze({ width: document.width, height: document.height }) })) : [],
      canvas: root === null ? Object.freeze({ width: document.width, height: document.height }) : null,
      entries: Object.freeze(entries),
    });
  }

  private snapshot(node: SvgNode): NodeSnapshot {
    const parent = node.parent;
    const description = node.describeGeometry();
    return Object.freeze({
      id: node.id, type: node.type,
      semanticType: node.type, displayType: node.displayType, isContainer: node.isContainer,
      childIds: Object.freeze(node.children.map(child => child.id)),
      parent: parent !== null && 'id' in parent
        ? Object.freeze({ id: parent.id, type: parent.type }) : null,
      geometry: Object.freeze({ ...node.getGeometry() }), description: Object.freeze(description.kind === 'properties'
        ? { ...description, values: Object.freeze({ ...description.values }) } : { ...description }),
      attributes: Object.freeze({ ...node.getAttributes() }),
    });
  }
}
