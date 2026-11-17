import { GeometryState, SubtreeBuilder, SvgGroup, SvgNode,
  type ShapeConstructionPort, type ShapeProvider, type ShapeRestoreInput } from '@svgframe/core';

/** Deliberately test-only types; no production plugin knowledge enters core. */
export class FixtureLeaf extends SvgNode {
  public constructor(id: string, x = 1) { super(id, {}, new GeometryState({ x, y: 2, width: 10, height: 20 }, ['x'], ['y'], ['width', 'height'])); }
  public get type() { return 'rect'; }
}
export class FixtureComposite extends SvgGroup {
  public override get type() { return 'fixture'; }
  public override get displayType() { return 'g'; }
  public override assertCanRelease(child: SvgNode) {
    if ([`${this.id}-a`, `${this.id}-b`].includes(child.id)) throw new Error(`required component: ${child.id}`);
  }
  public override assertCanAccept(child: SvgNode) {
    if (child.id === 'forbidden') throw new Error('component rejected');
  }
  public override assertCanUngroup() { throw new Error(`cannot ungroup composite: ${this.id}`); }
  public override verifyStructure() {
    for (const suffix of ['a', 'b']) {
      const child = this.children.find(node => node.id === `${this.id}-${suffix}`);
      if (!child || !['fixture-leaf', 'rect'].includes(child.type)) throw new Error(`invalid fixture structure: ${this.id}`);
      if (child.getAttributes().fill === 'invalid') throw new Error('invalid component color');
    }
  }
  public override describeSvg() {
    return Object.freeze({ tag: 'g', attributes: Object.freeze({ 'data-kind': this.type, ...this.getAttributes() }), text: undefined });
  }
}
export class FixtureProvider implements ShapeProvider {
  public constructor(private readonly construction: ShapeConstructionPort = {
    create: (_type, id, args) => new FixtureLeaf(id, Number(args[0])),
  }) {}
  public readonly name = 'fixture';
  public readonly help = { syntax: 'create fixture <id>', description: 'test compound' };
  public create(id: string) {
    return SubtreeBuilder.assemble(new FixtureComposite(id), [
      this.construction.create('rect', `${id}-a`, ['1','2','10','20']),
      this.construction.create('rect', `${id}-b`, ['3','2','10','20']),
    ]);
  }
  public fromAttributes(id: string) { return this.create(id); }
  public restore(input: ShapeRestoreInput) {
    if (input.content.trim()) throw new Error('unexpected fixture text');
    const node = new FixtureComposite(input.id);
    for (const [name, value] of Object.entries(input.attributes)) node.setAttribute(name, value);
    return SubtreeBuilder.assemble(node, input.children);
  }
}
