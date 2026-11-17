import { AttributeService, CommandHistory, EditorSession, ExtensionRegistry, ShapeFactory,
  type AttributeHandler, type CommandDefinition, type PluginContext, type ShapeProvider, type SvgReadPort, type SvgSavePort, type TreeDecorator } from '@svgframe/core';
import { BuiltinShapesPlugin } from '@svgframe/builtin-shapes';
import { BuiltinCommandsPlugin } from '@svgframe/builtin-commands';
import { SvgFileStore } from './svg/SvgFileStore.js';
import { SvgReader } from './svg/SvgReader.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';

/** Composition owns defaults; constructing an empty core never installs built-ins. */
export function createPluginContext(): PluginContext {
  const shapeProviders = new ExtensionRegistry<ShapeProvider>('shapes');
  const commands = new ExtensionRegistry<CommandDefinition>('commands');
  const attributes = new ExtensionRegistry<AttributeHandler>('attributes');
  const decorators = new ExtensionRegistry<TreeDecorator>('decorators');
  const shapes = new ShapeFactory(shapeProviders);
  const session = new EditorSession(shapes, new AttributeService(attributes), decorators);
  return Object.freeze({ shapeProviders, commands, attributes, decorators, shapes, session, history: new CommandHistory(), store: new SvgFileStore(undefined, undefined, new SvgReader(shapes)) });
}
export function createDefaultContext(): PluginContext {
  const context = createPluginContext();
  new BuiltinShapesPlugin().activate(context);
  new BuiltinCommandsPlugin().activate(context);
  return context;
}
/** Explicit test/client assembly over an existing session and I/O port. */
export function createCommandDispatcher(session: EditorSession, history: CommandHistory, store: SvgReadPort & SvgSavePort): CommandDispatcher {
  const base = createPluginContext();
  new BuiltinCommandsPlugin().activate({ ...base, session, history, store, shapes: session.shapes });
  return new CommandDispatcher(base.commands);
}
