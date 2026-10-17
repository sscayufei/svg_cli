import type { SvgStyle } from './SvgAttributes.js';
import { GeometryState } from './GeometryState.js';
import { SvgNode } from './SvgNode.js';

export class EllipseShape extends SvgNode {
  public constructor(id: string, cx: number, cy: number, rx: number, ry: number, style: SvgStyle = {}) {
    super(id, style, new GeometryState({ cx, cy, rx, ry }, ['cx'], ['cy'], ['rx', 'ry']));
  }

  public get type(): string { return 'ellipse'; }

}
