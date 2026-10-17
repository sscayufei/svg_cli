import type { SvgAttributes, SvgGeometry, SvgStyle } from './SvgAttributes.js';
import { SvgNode } from './SvgNode.js';

export class TextShape extends SvgNode {
  readonly #x: number;
  readonly #y: number;
  readonly #text: string;

  public constructor(id: string, x: number, y: number, text: string, style: SvgStyle = {}) {
    super(id, style);
    this.#x = this.finite(x, 'x');
    this.#y = this.finite(y, 'y');
    this.#text = text;
  }

  public get type(): string { return 'text'; }

  public getGeometry(): SvgGeometry {
    return Object.freeze({ x: this.#x, y: this.#y });
  }

  public override getAttributes(): SvgAttributes {
    return Object.freeze({ ...super.getAttributes(), text: this.#text });
  }
}
