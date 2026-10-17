import type { SvgGeometry, SvgGeometryDescription, SvgStyle } from './SvgAttributes.js';
import { SvgNode } from './SvgNode.js';

export class LineShape extends SvgNode {
  readonly #x1: number;
  readonly #y1: number;
  readonly #x2: number;
  readonly #y2: number;

  public constructor(id: string, x1: number, y1: number, x2: number, y2: number, style: SvgStyle = {}) {
    super(id, style);
    this.#x1 = this.finite(x1, 'x1');
    this.#y1 = this.finite(y1, 'y1');
    this.#x2 = this.finite(x2, 'x2');
    this.#y2 = this.finite(y2, 'y2');
  }

  public get type(): string { return 'line'; }

  public getGeometry(): SvgGeometry {
    return Object.freeze({ x1: this.#x1, y1: this.#y1, x2: this.#x2, y2: this.#y2 });
  }

  public override describeGeometry(): SvgGeometryDescription {
    return Object.freeze({ kind: 'segment', x1: this.#x1, y1: this.#y1, x2: this.#x2, y2: this.#y2 });
  }
}
