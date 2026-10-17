import type { SvgStyle } from './SvgAttributes.js';
import { GeometryState } from './GeometryState.js';
import { SvgNode } from './SvgNode.js';

export class RectShape extends SvgNode {
  public constructor(id: string, x: number, y: number, width: number, height: number, style: SvgStyle = {}) {
    super(id, style, new GeometryState({ x, y, width, height }, ['x'], ['y'], ['width', 'height']));
  }

  public get type(): string { return 'rect'; }

}
