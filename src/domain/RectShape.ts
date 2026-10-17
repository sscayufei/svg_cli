import type { SvgGeometry, SvgStyle } from './SvgAttributes.js';
import { SvgNode } from './SvgNode.js';

export class RectShape extends SvgNode {
  readonly #x: number;
  readonly #y: number;
  readonly #width: number;
  readonly #height: number;

  public constructor(id: string, x: number, y: number, width: number, height: number, style: SvgStyle = {}) {
    super(id, style);
    this.#x = this.finite(x, 'x');
    this.#y = this.finite(y, 'y');
    this.#width = this.nonNegative(width, 'width');
    this.#height = this.nonNegative(height, 'height');
  }

  public get type(): string { return 'rect'; }

  public getGeometry(): SvgGeometry {
    return Object.freeze({ x: this.#x, y: this.#y, width: this.#width, height: this.#height });
  }
}
