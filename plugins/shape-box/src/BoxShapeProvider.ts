import { SubtreeBuilder, SvgNumber, type ShapeConstructionPort, type ShapeProvider, type ShapeRestoreInput, type SvgNode } from '@svgframe/core';
import { BoxShape } from './BoxShape.js';

export class BoxShapeProvider implements ShapeProvider {
  public readonly name = 'box';
  public readonly help = Object.freeze({ syntax: 'create box <id> <x> <y> <w> <h> "label"', description: 'rectangle with a title; accepts in <containerId>' });
  public constructor(private readonly construction: ShapeConstructionPort) {}

  public create(id: string, args: readonly string[]): BoxShape {
    if (args.length !== 5) throw new Error('invalid parameters for shape type: box');
    const x = SvgNumber.parse(args[0]!, 'x'); const y = SvgNumber.parse(args[1]!, 'y');
    const width = SvgNumber.parse(args[2]!, 'width'); const height = SvgNumber.parse(args[3]!, 'height');
    if (width < 0) throw new Error('width must be non-negative');
    if (height < 0) throw new Error('height must be non-negative');
    const rectangle = this.construction.create('rect', BoxShape.rectId(id), [String(x), String(y), String(width), String(height), '#4a90d9']);
    const label = this.construction.create('text', BoxShape.labelId(id), [String(x + 20), String(y + 35), args[4]!]);
    return SubtreeBuilder.assemble(new BoxShape(id), [rectangle, label]);
  }
  public fromAttributes(id: string): BoxShape { throw new Error(`box restore requires a complete subtree: ${id}`); }
  public restore(input: ShapeRestoreInput): BoxShape {
    if (input.tag !== 'g' || input.content.trim()) throw new Error(`invalid box structure: ${input.id}`);
    const node = new BoxShape(input.id);
    for (const [name, value] of Object.entries(input.attributes)) {
      if (!['fill', 'stroke', 'stroke-width'].includes(name)) throw new Error(`unknown attribute: ${name}`);
      node.setAttribute(name, name === 'stroke-width' ? value.trim() : value);
    }
    return SubtreeBuilder.assemble(node, input.children);
  }
  public creationFeedback(node: SvgNode, parent: SvgNode | null): readonly string[] {
    return [`box#${node.id} created (g#${node.id} + rect#${BoxShape.rectId(node.id)} + text#${BoxShape.labelId(node.id)})${parent === null ? '' : ` in ${parent.type}#${parent.id}`}`];
  }
}
