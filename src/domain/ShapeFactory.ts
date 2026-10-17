import { CircleShape } from './CircleShape.js';
import { EllipseShape } from './EllipseShape.js';
import { LineShape } from './LineShape.js';
import { RectShape } from './RectShape.js';
import { SvgGroup } from './SvgGroup.js';
import type { SvgNode } from './SvgNode.js';
import { SvgNumber } from './SvgNumber.js';
import { TextShape } from './TextShape.js';

interface ShapeDefinition {
  readonly geometry: readonly string[];
  readonly textContent?: boolean;
  readonly count: number;
  readonly optionalStyle: boolean;
  readonly build: (id: string, args: readonly string[]) => SvgNode;
}

/** The sole shape-name dispatch point; future refactor: ShapeProvider registry. */
export class ShapeFactory {
  readonly #definitions = new Map<string, ShapeDefinition>([
    ['rect', { geometry: ['x', 'y', 'width', 'height'], count: 4, optionalStyle: true, build: (id, a) => new RectShape(id,
      this.number(a, 0, 'x'), this.number(a, 1, 'y'), this.number(a, 2, 'width'), this.number(a, 3, 'height'),
      a[4] === undefined ? {} : { fill: a[4] }) }],
    ['circle', { geometry: ['cx', 'cy', 'r'], count: 3, optionalStyle: true, build: (id, a) => new CircleShape(id,
      this.number(a, 0, 'cx'), this.number(a, 1, 'cy'), this.number(a, 2, 'r'),
      a[3] === undefined ? {} : { fill: a[3] }) }],
    ['ellipse', { geometry: ['cx', 'cy', 'rx', 'ry'], count: 4, optionalStyle: true, build: (id, a) => new EllipseShape(id,
      this.number(a, 0, 'cx'), this.number(a, 1, 'cy'), this.number(a, 2, 'rx'), this.number(a, 3, 'ry'),
      a[4] === undefined ? {} : { fill: a[4] }) }],
    ['line', { geometry: ['x1', 'y1', 'x2', 'y2'], count: 4, optionalStyle: true, build: (id, a) => new LineShape(id,
      this.number(a, 0, 'x1'), this.number(a, 1, 'y1'), this.number(a, 2, 'x2'), this.number(a, 3, 'y2'),
      a[4] === undefined ? {} : { stroke: a[4] }) }],
    ['text', { geometry: ['x', 'y'], textContent: true, count: 3, optionalStyle: false, build: (id, a) => new TextShape(id,
      this.number(a, 0, 'x'), this.number(a, 1, 'y'), a[2] ?? '') }],
    ['g', { geometry: [], count: 0, optionalStyle: false, build: id => new SvgGroup(id) }],
  ]);

  public create(type: string, id: string, args: readonly string[]): SvgNode {
    const definition = this.definition(type);
    const maximum = definition.count + (definition.optionalStyle ? 1 : 0);
    if (args.length < definition.count || args.length > maximum) {
      throw new Error(`invalid parameters for shape type: ${type}`);
    }
    return definition.build(id, args);
  }

  /** Restore semantic attributes without depending on XML or another type registry. */
  public fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, content = ''): SvgNode {
    const definition = this.definition(type);
    const styleNames = ['fill', 'stroke', 'stroke-width'];
    const allowed = new Set([...definition.geometry, ...styleNames]);
    for (const name of Object.keys(attributes)) {
      if (!allowed.has(name)) throw new Error(`unknown attribute: ${name}`);
    }
    if (!definition.textContent && content.trim().length > 0) throw new Error(`unexpected text content in ${type}`);
    const parameters = definition.geometry.map(name => attributes[name]?.trim() ?? '0');
    if (definition.textContent) parameters.push(content);
    const node = definition.build(id, parameters);
    for (const name of styleNames) {
      const value = attributes[name];
      if (value !== undefined) node.setAttribute(name, name === 'stroke-width' ? value.trim() : value);
    }
    return node;
  }

  private definition(type: string): ShapeDefinition {
    const definition = this.#definitions.get(type);
    if (definition === undefined) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return definition;
  }

  private number(args: readonly string[], index: number, name: string): number {
    return SvgNumber.parse(args[index] ?? '', name);
  }
}
