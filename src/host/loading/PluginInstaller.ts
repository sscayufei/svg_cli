import { ShapeFactory, type Plugin, type PluginContext, type PluginManifest } from '@svgframe/core';
import { StagedRegistry } from './StagedRegistry.js';
import { PluginResources } from './PluginResources.js';
import { PluginManifestReader } from './PluginManifestReader.js';

export class PluginInstaller {
  readonly #installed: PluginResources[] = [];
  readonly #diagnostics: string[] = [];
  public constructor(private readonly context: PluginContext) {}
  public get diagnostics(): readonly string[] { return Object.freeze([...this.#diagnostics]); }
  public install(exported: unknown, manifest: PluginManifest, options?: unknown): void {
    const declared = PluginManifestReader.parse(manifest);
    const shapes = new StagedRegistry('shapes', this.context.shapeProviders);
    const commands = new StagedRegistry('commands', this.context.commands);
    const decorators = new StagedRegistry('decorators', this.context.decorators);
    const attributes = new StagedRegistry('attributes', this.context.attributes);
    const registries = [shapes, commands, decorators, attributes];
    const resources = new PluginResources(this.context.events);
    const receipts: { dispose(): void }[] = [];
    const context: PluginContext = Object.freeze({ ...this.context, shapeProviders: shapes, commands, decorators, attributes,
      shapes: new ShapeFactory(shapes), events: resources, resources });
    try {
      const plugin: unknown = typeof exported === 'function' ? new (exported as new () => Plugin)() : exported;
      if (!plugin || typeof plugin !== 'object' || !('activate' in plugin) || typeof plugin.activate !== 'function') throw new Error('default export must implement activate');
      const response: unknown = plugin.activate(context, options);
      if (response !== undefined) {
        if (response instanceof Promise) void response.catch(() => {});
        throw new Error('activate must be synchronous and return void');
      }
      for (const registry of registries) registry.verify();
      const actual = { shapes: shapes.pending().map(entry => entry.name), commands: commands.pending().map(entry => entry.name),
        decorators: decorators.pending().map(entry => entry.name), attributes: attributes.pending().map(entry => entry.name) };
      const expected = PluginManifestReader.describe(declared.contributes);
      const registered = PluginManifestReader.describe(actual);
      if (expected !== registered) throw new Error(`plugin manifest mismatch: ${declared.name} (declared: ${expected}, registered: ${registered})`);
      // Each category commits atomically; receipts restore earlier categories if a later commit fails.
      resources.commit();
      for (const registry of registries) receipts.push(registry.commit());
      this.#installed.push(resources);
    } catch (error) {
      for (const receipt of receipts.toReversed()) receipt.dispose();
      for (const registry of registries) registry.discard();
      resources.dispose(); this.#diagnostics.push(...resources.cleanupErrors);
      const reason = error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ') : 'activation failed';
      if (reason.startsWith('duplicate registration:') || reason.startsWith('plugin manifest mismatch:')) throw new Error(reason);
      throw new Error(`plugin failed to activate: ${declared.name} (${reason})`);
    }
  }
  public dispose(): void {
    for (const resource of this.#installed.toReversed()) { resource.dispose(); this.#diagnostics.push(...resource.cleanupErrors); }
    this.#installed.length = 0;
  }
}
