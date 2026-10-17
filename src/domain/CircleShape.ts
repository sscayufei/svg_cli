import type { SvgStyle } from './SvgAttributes.js';
import { GeometryState } from './GeometryState.js';
import { SvgNode } from './SvgNode.js';

export class CircleShape extends SvgNode {
  public constructor(id: string, cx: number, cy: number, r: number, style: SvgStyle = {}) {
    super(id, style, new GeometryState({ cx, cy, r }, ['cx'], ['cy'], ['r']));
  }

  public get type(): string { return 'circle'; }

}
