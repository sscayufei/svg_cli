import type { SvgAttributes, SvgGeometry, SvgGeometryDescription, SvgStyle } from './SvgAttributes.js';
import type { SvgDocument } from './SvgDocument.js';
import type { SvgGroup } from './SvgGroup.js';
import { setNodeLocation } from './internal/TreeAccess.js';

/** Common Component contract for leaves and groups. No I/O or CLI formatting. */
export abstract class SvgNode implements Iterable<SvgNode> {
  readonly #id: string;
  readonly #style: SvgStyle;
  #parent: SvgGroup | SvgDocument | null = null;
  #document: SvgDocument | null = null;

  protected constructor(id: string, style: SvgStyle = {}) {
    if (id.length === 0) {
      throw new Error('id must not be empty');
    }
    const styleNames = new Set(['fill', 'stroke', 'stroke-width']);
    for (const name of Object.keys(style)) {
      if (!styleNames.has(name)) {
        throw new Error(`unknown attribute: ${name}`);
      }
    }
    if (style['stroke-width'] !== undefined) {
      this.nonNegative(style['stroke-width'], 'stroke-width');
    }
    this.#id = id;
    this.#style = Object.freeze({ ...style });
  }

  public get id(): string { return this.#id; }
  public get parent(): SvgGroup | SvgDocument | null { return this.#parent; }
  public get document(): SvgDocument | null { return this.#document; }
  public abstract get type(): string;

  public get children(): readonly SvgNode[] {
    return Object.freeze([]);
  }

  public abstract getGeometry(): SvgGeometry;

  public describeGeometry(): SvgGeometryDescription {
    return Object.freeze({ kind: 'properties', values: this.getGeometry() });
  }

  public getAttributes(): SvgAttributes {
    return Object.freeze({ ...this.getGeometry(), ...this.#style });
  }

  /** Preorder traversal, independent of the concrete child storage. */
  public *[Symbol.iterator](): IterableIterator<SvgNode> {
    const pending: SvgNode[] = [this];
    const visited = new Set<SvgNode>();
    while (pending.length > 0) {
      const node = pending.pop();
      if (node === undefined) break;
      if (visited.has(node)) {
        throw new Error(`cycle or repeated node: ${node.id}`);
      }
      visited.add(node);
      yield node;
      pending.push(...node.children.toReversed());
    }
  }

  protected finite(value: number, name: string): number {
    if (!Number.isFinite(value)) {
      throw new Error(`${name} must be finite`);
    }
    return value;
  }

  protected nonNegative(value: number, name: string): number {
    this.finite(value, name);
    if (value < 0) {
      throw new Error(`${name} must be non-negative`);
    }
    return value;
  }

  /** @internal Only SvgDocument may change ownership and parent links. */
  public [setNodeLocation](document: SvgDocument | null, parent: SvgGroup | SvgDocument | null): void {
    this.#document = document;
    this.#parent = parent;
  }
}
