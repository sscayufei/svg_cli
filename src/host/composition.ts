import { AttributeService, CommandHistory, EditorSession, ExtensionRegistry, ShapeFactory,
  type AttributeHandler, type CommandDefinition, type DirectoryPort, type PluginContext, type ShapeProvider, type SvgReadPort, type SvgSavePort, type TreeDecorator } from '@svgframe/core';
import { fileURLToPath } from 'node:url';
import { BuiltinShapesPlugin } from '@svgframe/builtin-shapes';
import { BuiltinCommandsPlugin } from '@svgframe/builtin-commands';
import { StatsPlugin } from '@svgframe/command-stats';
import { SvgFileStore } from './svg/SvgFileStore.js';
import { SvgReader } from './svg/SvgReader.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { NodeDirectoryAdapter } from './filesystem/NodeDirectoryAdapter.js';
import { PluginInstaller } from './loading/PluginInstaller.js';
import { PluginModuleResolver } from './loading/PluginModuleResolver.js';
import { PluginConfiguration } from './loading/PluginConfiguration.js';
import { PluginLoader } from './loading/PluginLoader.js';
import { PluginResources } from './loading/PluginResources.js';

export interface CodePluginRegistration { readonly module: string; readonly plugin: unknown; readonly options?: unknown }
export interface ApplicationOptions { readonly args?: readonly string[]; readonly cwd?: string; readonly codePlugins?: readonly CodePluginRegistration[]; readonly directory?: DirectoryPort }
const compositionDirectory = fileURLToPath(new URL('.', import.meta.url));
/** The only list edited to add optional plugins through code composition (A). */
export function optionalPlugins(): readonly CodePluginRegistration[] {
  return [{ module: '@svgframe/command-stats', plugin: new StatsPlugin() }];
}

/** Composition owns defaults; constructing an empty core never installs built-ins. */
export function createPluginContext(directory: DirectoryPort = new NodeDirectoryAdapter()): PluginContext {
  const shapeProviders = new ExtensionRegistry<ShapeProvider>('shapes');
  const commands = new ExtensionRegistry<CommandDefinition>('commands');
  const attributes = new ExtensionRegistry<AttributeHandler>('attributes');
  const decorators = new ExtensionRegistry<TreeDecorator>('decorators');
  const shapes = new ShapeFactory(shapeProviders);
  const session = new EditorSession(shapes, new AttributeService(attributes), decorators);
  const resources = new PluginResources(session.events); resources.commit();
  return Object.freeze({ shapeProviders, commands, attributes, decorators, shapes, session, directory, resources, events: session.events, history: new CommandHistory(session.events), store: new SvgFileStore(undefined, undefined, new SvgReader(shapes)) });
}
export function createDefaultContext(): PluginContext {
  const context = createPluginContext();
  installDefaults(new PluginInstaller(context));
  return context;
}
function installDefaults(installer: PluginInstaller): void {
  const resolver = new PluginModuleResolver();
  installer.install(new BuiltinShapesPlugin(), resolver.resolve('@svgframe/builtin-shapes', compositionDirectory).manifest);
  installer.install(new BuiltinCommandsPlugin(), resolver.resolve('@svgframe/builtin-commands', compositionDirectory).manifest);
}
export async function createApplication(options: ApplicationOptions = {}) {
  const cwd = options.cwd ?? process.cwd();
  const context = createPluginContext(options.directory ?? new NodeDirectoryAdapter(cwd));
  const installer = new PluginInstaller(context); installDefaults(installer);
  const diagnostics: string[] = [];
  let configured: ReturnType<typeof PluginConfiguration.read>;
  try { configured = PluginConfiguration.read(options.args ?? [], cwd); }
  catch { diagnostics.push('invalid plugin config'); configured = { plugins: [], baseDirectory: cwd }; }
  if (configured) diagnostics.push(...await new PluginLoader(installer).load(configured.plugins, configured.baseDirectory));
  else {
    const resolver = new PluginModuleResolver();
    for (const entry of options.codePlugins ?? optionalPlugins()) {
      try { installer.install(entry.plugin, resolver.resolve(entry.module, compositionDirectory).manifest, entry.options); }
      catch (error) { diagnostics.push(error instanceof Error ? error.message : 'plugin installation failed'); }
    }
  }
  return Object.freeze({ context, get diagnostics(): readonly string[] { return Object.freeze([...diagnostics, ...installer.diagnostics]); },
    dispose: () => { installer.dispose(); (context.resources as PluginResources).dispose(); } });
}
/** Explicit test/client assembly over an existing session and I/O port. */
export function createCommandDispatcher(session: EditorSession, history: CommandHistory, store: SvgReadPort & SvgSavePort): CommandDispatcher {
  const base = createPluginContext();
  const context = { ...base, session, events: session.events, history, store, shapes: session.shapes };
  const manifest = new PluginModuleResolver().resolve('@svgframe/builtin-commands', compositionDirectory).manifest;
  new PluginInstaller(context).install(new BuiltinCommandsPlugin(), manifest);
  return new CommandDispatcher(base.commands);
}
