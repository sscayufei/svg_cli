import { TextShape } from './TextShape.js';
import { BaseShapeProvider } from './BaseShapeProvider.js';

export class TextProvider extends BaseShapeProvider {
  public constructor() { super('text', ["x", "y"], 3, false, { syntax: "create text <id> <x> <y> \"content\"", description: "text" }, true); }
  protected build(id: string, args: readonly string[]) { return new TextShape(id, this.number(args, 0, 'x'), this.number(args, 1, 'y'), args[2] ?? ''); }
}
