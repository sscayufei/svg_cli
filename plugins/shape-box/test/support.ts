import { AttributeService, ChangeSet, EditorSession, ExtensionRegistry, GeometryState, NodeEditCommand, ShapeFactory, SvgNode,
  type AttributeHandler, type AttributeOperation, type CommandResult, type ShapeConstructionPort, type ShapeProvider, type TreeDecorator } from '@svgframe/core';
import { BoxFillHandler } from '../src/BoxFillHandler.js';
import { BoxLabelHandler } from '../src/BoxLabelHandler.js';
import { BoxShapeProvider } from '../src/BoxShapeProvider.js';

export class StubRect extends SvgNode {
  public constructor(id: string, args: readonly string[] = ['1','2','3','4']) {
    super(id, args[4] === undefined ? {} : { fill: args[4] }, new GeometryState({ x: Number(args[0]), y: Number(args[1]), width: Number(args[2]), height: Number(args[3]) }, ['x'], ['y'], ['width','height']));
  }
  public get type(): string { return 'rect'; }
}
export class StubText extends SvgNode {
  #text: string;
  public constructor(id: string, args: readonly string[] = ['0','0','']) {
    super(id, {}, new GeometryState({ x: Number(args[0]), y: Number(args[1]) }, ['x'], ['y'])); this.#text = args[2]!;
  }
  public get type(): string { return 'text'; }
  public override getAttributes() { return Object.freeze({ ...super.getAttributes(), text: this.#text }); }
  protected override buildAttributeChange(name: string, value: string | number): ChangeSet {
    if (name !== 'text') return super.buildAttributeChange(name, value);
    const before = this.#text; const after = String(value);
    return new ChangeSet([{ apply: () => { this.#text = after; }, revert: () => { this.#text = before; } }]);
  }
}
export class StubConstruction implements ShapeConstructionPort {
  public create(type: string, id: string, args: readonly string[]): SvgNode {
    if (type === 'rect') return new StubRect(id, args);
    if (type === 'text') return new StubText(id, args);
    throw new Error(`stub cannot build: ${type}`);
  }
}
export class SetProbe extends NodeEditCommand {
  #operation: AttributeOperation | undefined;
  public constructor(private readonly receiver: EditorSession, id: string, private readonly attribute: string, private readonly value: string | number) { super(receiver, id); }
  protected plan(node: SvgNode): ChangeSet {
    this.#operation = this.receiver.attributes.resolve(node, this.attribute, this.value); return this.#operation.change;
  }
  protected result(_node: SvgNode, undo: boolean): CommandResult {
    return { kind: 'lines', lines: (undo ? this.#operation?.feedback?.undone : this.#operation?.feedback?.applied) ?? ['default attribute'] };
  }
}
export function context(handlers = true) {
  const providers = new ExtensionRegistry<ShapeProvider>('shapes');
  const attributes = new ExtensionRegistry<AttributeHandler>('attributes');
  const decorators = new ExtensionRegistry<TreeDecorator>('decorators');
  providers.register(new BoxShapeProvider(new StubConstruction()));
  if (handlers) { attributes.register(new BoxFillHandler()); attributes.register(new BoxLabelHandler()); }
  const shapes = new ShapeFactory(providers); const session = new EditorSession(shapes, new AttributeService(attributes), decorators);
  const document = session.initialize(); const node = shapes.create('box','p',['120','100','160','60','开始']); document.append(node);
  return { providers, attributes, decorators, shapes, session, document, node };
}
