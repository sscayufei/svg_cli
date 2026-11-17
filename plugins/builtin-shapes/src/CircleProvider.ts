import { CircleShape } from './CircleShape.js';
import { BaseShapeProvider } from './BaseShapeProvider.js';

export class CircleProvider extends BaseShapeProvider {
  public constructor() { super('circle', ["cx", "cy", "r"], 3, true, { syntax: "create circle <id> <cx> <cy> <r> [fill]", description: "circle" }); }
  protected build(id: string, args: readonly string[]) { return new CircleShape(id, this.number(args, 0, 'cx'), this.number(args, 1, 'cy'), this.number(args, 2, 'r'), args[3] === undefined ? {} : { fill: args[3] }); }
}
