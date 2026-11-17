import { LineShape } from './LineShape.js';
import { BaseShapeProvider } from './BaseShapeProvider.js';

export class LineProvider extends BaseShapeProvider {
  public constructor() { super('line', ["x1", "y1", "x2", "y2"], 4, true, { syntax: "create line <id> <x1> <y1> <x2> <y2> [stroke]", description: "line" }); }
  protected build(id: string, args: readonly string[]) { return new LineShape(id, this.number(args, 0, 'x1'), this.number(args, 1, 'y1'), this.number(args, 2, 'x2'), this.number(args, 3, 'y2'), args[4] === undefined ? {} : { stroke: args[4] }); }
}
