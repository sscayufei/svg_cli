import type { SvgGeometry, SvgStyle } from './SvgAttributes.js';
import { SvgNode } from './SvgNode.js';

export class EllipseShape extends SvgNode {
  readonly #cx: number;
  readonly #cy: number;
  readonly #rx: number;
  readonly #ry: number;

  public constructor(id: string, cx: number, cy: number, rx: number, ry: number, style: SvgStyle = {}) {
    super(id, style);
    this.#cx = this.finite(cx, 'cx');
    this.#cy = this.finite(cy, 'cy');
    this.#rx = this.nonNegative(rx, 'rx');
    this.#ry = this.nonNegative(ry, 'ry');
  }

  public get type(): string { return 'ellipse'; }

  public getGeometry(): SvgGeometry {
    return Object.freeze({ cx: this.#cx, cy: this.#cy, rx: this.#rx, ry: this.#ry });
  }
}
