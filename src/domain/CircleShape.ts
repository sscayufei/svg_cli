import type { SvgGeometry, SvgStyle } from './SvgAttributes.js';
import { SvgNode } from './SvgNode.js';

export class CircleShape extends SvgNode {
  readonly #cx: number;
  readonly #cy: number;
  readonly #r: number;

  public constructor(id: string, cx: number, cy: number, r: number, style: SvgStyle = {}) {
    super(id, style);
    this.#cx = this.finite(cx, 'cx');
    this.#cy = this.finite(cy, 'cy');
    this.#r = this.nonNegative(r, 'r');
  }

  public get type(): string { return 'circle'; }

  public getGeometry(): SvgGeometry {
    return Object.freeze({ cx: this.#cx, cy: this.#cy, r: this.#r });
  }
}
