import type { SvgAttributes, SvgGeometryDescription, SvgStyle } from '@svgframe/core';
import { ChangeSet } from '@svgframe/core';
import { GeometryState } from '@svgframe/core';
import { SvgNode } from '@svgframe/core';

export class TextShape extends SvgNode {
  #text: string;

  public constructor(id: string, x: number, y: number, text: string, style: SvgStyle = {}) {
    super(id, style, new GeometryState({ x, y }, ['x'], ['y']));
    this.#text = text;
  }

  public get type(): string { return 'text'; }

  public override getAttributes(): SvgAttributes {
    return Object.freeze({ ...super.getAttributes(), text: this.#text });
  }

  public override describeGeometry(): SvgGeometryDescription {
    return Object.freeze({ kind: 'point', x: this.geometryValue('x'), y: this.geometryValue('y') });
  }

  protected override buildAttributeChange(name: string, input: string | number): ChangeSet {
    if (name !== 'text') return super.buildAttributeChange(name, input);
    const before = this.#text; const after = String(input);
    return new ChangeSet([{ apply: () => { this.#text = after; }, revert: () => { this.#text = before; } }]);
  }
}
