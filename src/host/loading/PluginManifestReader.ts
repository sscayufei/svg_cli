import type { PluginManifest } from '@svgframe/core';

export const contributionCategories = ['shapes', 'commands', 'decorators', 'attributes'] as const;

export class PluginManifestReader {
  public static parse(value: unknown): PluginManifest {
    if (!value || typeof value !== 'object' || !('name' in value) || typeof value.name !== 'string' || !value.name || /\s/.test(value.name)) throw new Error('invalid plugin manifest: name');
    const contributes = 'contributes' in value ? value.contributes : {};
    if (!contributes || typeof contributes !== 'object' || Array.isArray(contributes)) throw new Error('invalid plugin manifest: contributes');
    for (const key of Object.keys(contributes)) if (!(contributionCategories as readonly string[]).includes(key)) throw new Error(`invalid plugin manifest category: ${key}`);
    const normalized: Record<string, readonly string[]> = {};
    for (const category of contributionCategories) {
      const field: unknown = Reflect.get(contributes, category);
      const names = field === undefined ? [] : field;
      if (!Array.isArray(names) || names.some(name => typeof name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(name)) || new Set(names).size !== names.length) throw new Error(`invalid plugin manifest: ${category}`);
      normalized[category] = Object.freeze([...names]);
    }
    return Object.freeze({ name: value.name, contributes: Object.freeze(normalized) });
  }
  public static describe(value: PluginManifest['contributes']): string {
    return contributionCategories.map(category => `${category}=[${[...value?.[category] ?? []].sort().join(',')}]`).join('; ');
  }
}
