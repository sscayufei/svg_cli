import type { SvgStyle } from '@svgframe/core';
import { GeometryState } from '@svgframe/core';
import { SvgNode } from '@svgframe/core';

export class CircleShape extends SvgNode {
  public constructor(id: string, cx: number, cy: number, r: number, style: SvgStyle = {}) {
    super(id, style, new GeometryState({ cx, cy, r }, ['cx'], ['cy'], ['r']));
  }

  public get type(): string { return 'circle'; }

}
