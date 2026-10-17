import type { SvgGeometry, SvgStyle } from './SvgAttributes.js';
import { SvgNode } from './SvgNode.js';
import { insertGroupChild, removeGroupChild } from './internal/TreeAccess.js';

/** Composite: callers inspect groups through the same SvgNode contract as leaves. */
export class SvgGroup extends SvgNode {
  readonly #children: SvgNode[] = [];

  public constructor(id: string, style: SvgStyle = {}) {
    super(id, style);
  }

  public get type(): string { return 'g'; }

  public override get children(): readonly SvgNode[] {
    return Object.freeze([...this.#children]);
  }

  public getGeometry(): SvgGeometry {
    return Object.freeze({});
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
