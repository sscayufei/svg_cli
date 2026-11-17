import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export interface ConfiguredPlugin { readonly module: string; readonly enabled?: boolean; readonly options?: unknown }
export interface PluginConfigurationValue { readonly plugins: readonly ConfiguredPlugin[]; readonly baseDirectory: string }

export class PluginConfiguration {
  public static read(args: readonly string[], cwd: string): PluginConfigurationValue | undefined {
    if (!args.length) return undefined;
    try {
      if (args.length !== 2 || args[0] !== '--config' || !args[1]) throw new Error('arguments');
      const path = resolve(cwd, args[1]);
      return Object.freeze({ plugins: this.parse(JSON.parse(readFileSync(path, 'utf8'))), baseDirectory: dirname(path) });
    } catch { throw new Error('invalid plugin config'); }
  }
  public static parse(value: unknown): readonly ConfiguredPlugin[] {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => key !== 'plugins') || !('plugins' in value) || !Array.isArray(value.plugins)) throw new Error('invalid plugin config');
    return Object.freeze(value.plugins.map((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).some(key => !['module','enabled','options'].includes(key))
        || !('module' in entry) || typeof entry.module !== 'string' || !entry.module.trim()
        || ('enabled' in entry && typeof entry.enabled !== 'boolean')) throw new Error('invalid plugin config');
      return Object.freeze({ ...entry }) as ConfiguredPlugin;
    }));
  }
}
