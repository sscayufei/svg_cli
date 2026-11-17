import { describe, expect, it } from 'vitest';
import { AttributeService, CommandExecutor, CommandHistory, EditorSession, ExtensionRegistry, ShapeFactory, SvgGroup,
  type AttributeHandler, type CommandDefinition, type PluginContext, type ShapeProvider, type TreeDecorator } from '@svgframe/core';
import { BuiltinCommandsPlugin } from '../src/BuiltinCommandsPlugin.js';

class StubNode extends SvgGroup { public override get type() { return 'stub'; } }
class StubProvider implements ShapeProvider {
  public readonly name = 'stub';
  public readonly help = { syntax:'create stub <id>', description:'test double' };
  public create(id: string) { return new StubNode(id); }
  public fromAttributes(id: string) { return new StubNode(id); }
}
function context(): PluginContext {
  const shapeProviders = new ExtensionRegistry<ShapeProvider>('shapes'); shapeProviders.register(new StubProvider());
  const shapes = new ShapeFactory(shapeProviders);
  const attributes = new ExtensionRegistry<AttributeHandler>('attributes');
  const decorators = new ExtensionRegistry<TreeDecorator>('decorators');
  const session = new EditorSession(shapes, new AttributeService(attributes), decorators);
  return { shapes, shapeProviders, attributes, decorators, resources: { add() {} }, directory: { path: '/fixture', read: () => [] },
    session, events: session.events, history: new CommandHistory(session.events), commands: new ExtensionRegistry<CommandDefinition>('commands'),
    store: { read() { throw new Error('unexpected read'); }, save() { throw new Error('unexpected save'); } } };
}
describe('built-in commands with a shape-service test double', () => {
  it('registers nineteen commands and builds dynamic help without concrete shapes or host', () => {
    const ctx = context(); new BuiltinCommandsPlugin().activate(ctx);
    expect(ctx.commands.values()).toHaveLength(19);
    expect(ctx.commands.get('help')!.build([]).execute()).toMatchObject({ kind:'help', entries:expect.arrayContaining([{ syntax:'create stub <id>', description:'test double' }]) });
    expect(() => ctx.commands.get('undo')!.build([{ value:'extra', quoted:false }])).toThrow('usage: undo');
  });
  it('creates through the injected service and participates in the shared undo protocol', () => {
    const ctx = context(); new BuiltinCommandsPlugin().activate(ctx); const executor = new CommandExecutor(ctx.history);
    expect(executor.execute(ctx.commands.get('init')!.build([])).ok).toBe(true);
    const args = ['stub', 'p'].map(value => ({ value, quoted:false }));
    expect(executor.execute(ctx.commands.get('create')!.build(args)).ok).toBe(true);
    expect(ctx.session.requireDocument().findById('p')?.type).toBe('stub');
    ctx.history.undo(); expect(ctx.session.requireDocument().findById('p')).toBeUndefined();
    ctx.history.redo(); expect(ctx.session.requireDocument().findById('p')?.type).toBe('stub');
  });
});
