import type { ConfiguredPlugin } from './PluginConfiguration.js';
import type { PluginInstaller } from './PluginInstaller.js';
import { PluginModuleResolver } from './PluginModuleResolver.js';

export class PluginLoader {
  public constructor(private readonly installer: PluginInstaller, private readonly resolver = new PluginModuleResolver()) {}
  public async load(entries: readonly ConfiguredPlugin[], baseDirectory: string): Promise<readonly string[]> {
    const diagnostics: string[] = [];
    for (const entry of entries) {
      if (entry.enabled === false) continue;
      try {
        const resolved = this.resolver.resolve(entry.module, baseDirectory);
        let namespace: Record<string, unknown>;
        try { namespace = await import(resolved.url) as Record<string, unknown>; }
        catch (error) { throw new Error(`plugin failed to load: ${entry.module} (${error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ') : 'module evaluation failed'})`); }
        if (!Object.hasOwn(namespace, 'default')) throw new Error(`plugin has no default export: ${entry.module}`);
        this.installer.install(namespace.default, resolved.manifest, entry.options);
      } catch (error) { diagnostics.push(error instanceof Error ? error.message : `plugin failed to load: ${entry.module}`); }
    }
    return Object.freeze(diagnostics);
  }
}
