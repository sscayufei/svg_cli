import type { SvgAttributes, SvgGeometry, SvgGeometryDescription, SvgPoint, SvgStyle } from './SvgAttributes.js';
import { ChangeSet } from './ChangeSet.js';
import { GeometryState } from './GeometryState.js';
import { SvgNumber } from './SvgNumber.js';
import type { SvgDocument } from './SvgDocument.js';
import type { SvgGroup } from './SvgGroup.js';
import { setNodeLocation } from './internal/TreeAccess.js';

/** Common Component contract for leaves and groups. No I/O or CLI formatting. */
export abstract class SvgNode implements Iterable<SvgNode> {
  readonly #id: string;
  #style: SvgStyle;
  readonly #geometry: GeometryState;
  #parent: SvgGroup | SvgDocument | null = null;
  #document: SvgDocument | null = null;

  protected constructor(id: string, style: SvgStyle = {}, geometry = new GeometryState({})) {
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
    this.#geometry = geometry;
  }

  public get id(): string { return this.#id; }
  public get parent(): SvgGroup | SvgDocument | null { return this.#parent; }
  public get document(): SvgDocument | null { return this.#document; }
  public abstract get type(): string;

  public get children(): readonly SvgNode[] {
    return Object.freeze([]);
  }

  public getGeometry(): SvgGeometry { return this.#geometry.snapshot(); }
  public getPosition(): SvgPoint | null { return this.#geometry.position(); }

  public planMove(dx: number, dy: number): ChangeSet {
    this.finite(dx, 'dx'); this.finite(dy, 'dy');
    return this.buildMove(dx, dy);
  }

  public move(dx: number, dy: number): ChangeSet {
    const change = this.planMove(dx, dy); change.apply(); return change;
  }

  public planScale(factor: number): ChangeSet {
    this.finite(factor, 'scale factor');
    if (factor <= 0) throw new Error('scale factor must be positive');
    return this.buildScale(factor);
  }

  public scale(factor: number): ChangeSet {
    const change = this.planScale(factor); change.apply(); return change;
  }

  public planSetAttribute(name: string, input: string | number): ChangeSet {
    if (name === 'fill' || name === 'stroke' || name === 'stroke-width') {
      const value = name === 'stroke-width' ? this.nonNegative(SvgNumber.parse(input, name), name) : String(input);
      const before = this.#style[name];
      return new ChangeSet([{ apply: () => this.writeStyle(name, value), revert: () => this.writeStyle(name, before) }]);
    }
    return this.buildAttributeChange(name, input);
  }

  public setAttribute(name: string, input: string | number): ChangeSet {
    const change = this.planSetAttribute(name, input); change.apply(); return change;
  }

  protected buildMove(dx: number, dy: number): ChangeSet { return this.#geometry.planMove(dx, dy); }
  protected buildScale(factor: number): ChangeSet { return this.#geometry.planScale(factor); }
  protected buildAttributeChange(name: string, input: string | number): ChangeSet { return this.#geometry.planSet(name, input); }
  protected geometryValue(name: string): number { return this.#geometry.value(name); }

  private writeStyle(name: keyof SvgStyle, value: string | number | undefined): void {
    const next = { ...this.#style };
    if (value === undefined) {
      delete next[name];
      this.#style = Object.freeze(next);
    } else {
      this.#style = Object.freeze({ ...next, [name]: value });
    }
  }

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
