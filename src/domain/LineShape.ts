import type { SvgGeometryDescription, SvgStyle } from './SvgAttributes.js';
import { GeometryState } from './GeometryState.js';
import { SvgNode } from './SvgNode.js';

export class LineShape extends SvgNode {
  public constructor(id: string, x1: number, y1: number, x2: number, y2: number, style: SvgStyle = {}) {
    super(id, style, new GeometryState({ x1, y1, x2, y2 }, ['x1', 'x2'], ['y1', 'y2']));
  }

  public get type(): string { return 'line'; }

  public override describeGeometry(): SvgGeometryDescription {
    return Object.freeze({ kind: 'segment', x1: this.geometryValue('x1'), y1: this.geometryValue('y1'), x2: this.geometryValue('x2'), y2: this.geometryValue('y2') });
  }
}
