import { RectShape } from './RectShape.js';
import { BaseShapeProvider } from './BaseShapeProvider.js';

export class RectProvider extends BaseShapeProvider {
  public constructor() { super('rect', ["x", "y", "width", "height"], 4, true, { syntax: "create rect <id> <x> <y> <w> <h> [fill]", description: "rectangle" }); }
  protected build(id: string, args: readonly string[]) { return new RectShape(id, this.number(args, 0, 'x'), this.number(args, 1, 'y'), this.number(args, 2, 'width'), this.number(args, 3, 'height'), args[4] === undefined ? {} : { fill: args[4] }); }
}
