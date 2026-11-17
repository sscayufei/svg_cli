import { SvgNumber, type CommandHelp, type ShapeProvider, type SvgNode } from '@svgframe/core';

/** Common SVG defaults and validation for the built-in providers, outside core. */
export abstract class BaseShapeProvider implements ShapeProvider {
  public constructor(
    public readonly name: string,
    private readonly geometry: readonly string[],
    private readonly count: number,
    private readonly optionalStyle: boolean,
    public readonly help: CommandHelp,
    private readonly textContent = false,
  ) {}
  public create(id: string, args: readonly string[]): SvgNode {
    if (args.length < this.count || args.length > this.count + (this.optionalStyle ? 1 : 0)) throw new Error(`invalid parameters for shape type: ${this.name}`);
    return this.build(id, args);
  }
  public fromAttributes(id: string, attributes: Readonly<Record<string, string>>, content: string): SvgNode {
    const styleNames = ['fill', 'stroke', 'stroke-width'];
    const allowed = new Set([...this.geometry, ...styleNames]);
    for (const name of Object.keys(attributes)) if (!allowed.has(name)) throw new Error(`unknown attribute: ${name}`);
    if (!this.textContent && content.trim().length > 0) throw new Error(`unexpected text content in ${this.name}`);
    const parameters = this.geometry.map(name => attributes[name]?.trim() ?? '0');
    if (this.textContent) parameters.push(content);
    const node = this.build(id, parameters);
    for (const name of styleNames) {
      const value = attributes[name];
      if (value !== undefined) node.setAttribute(name, name === 'stroke-width' ? value.trim() : value);
    }
    return node;
  }
  protected number(args: readonly string[], index: number, name: string): number { return SvgNumber.parse(args[index] ?? '', name); }
  protected abstract build(id: string, args: readonly string[]): SvgNode;
}
