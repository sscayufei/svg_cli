import { EllipseShape } from './EllipseShape.js';
import { BaseShapeProvider } from './BaseShapeProvider.js';

export class EllipseProvider extends BaseShapeProvider {
  public constructor() { super('ellipse', ["cx", "cy", "rx", "ry"], 4, true, { syntax: "create ellipse <id> <cx> <cy> <rx> <ry> [fill]", description: "ellipse" }); }
  protected build(id: string, args: readonly string[]) { return new EllipseShape(id, this.number(args, 0, 'cx'), this.number(args, 1, 'cy'), this.number(args, 2, 'rx'), this.number(args, 3, 'ry'), args[4] === undefined ? {} : { fill: args[4] }); }
}
