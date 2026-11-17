import { findPackageJSON, registerHooks } from 'node:module';
import { existsSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { PluginManifest } from '@svgframe/core';
import { PluginManifestReader } from './PluginManifestReader.js';

export interface ResolvedPlugin { readonly url: string; readonly manifest: PluginManifest; readonly manifestPath: string }

export class PluginModuleResolver {
  public resolve(specifier: string, baseDirectory: string): ResolvedPlugin {
    try {
      const base = pathToFileURL(resolve(baseDirectory, '__plugin_resolution__.mjs')).href;
      let manifestPath: string | undefined;
      let url: string;
      if (isAbsolute(specifier) || specifier.startsWith('.') || specifier.startsWith('file:')) {
        const path = specifier.startsWith('file:') ? fileURLToPath(specifier) : resolve(baseDirectory, specifier);
        if (!existsSync(path)) throw new Error(`plugin not found: ${specifier}`);
        if (statSync(path).isDirectory()) {
          manifestPath = resolve(path, 'package.json');
          const raw = JSON.parse(readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
          // A package's self-reference delegates conditional exports to Node's ESM resolver.
          url = raw.exports !== undefined && typeof raw.name === 'string'
            ? this.nativeResolve(raw.name, pathToFileURL(resolve(path, '__plugin_resolution__.mjs')).href)
            : pathToFileURL(resolve(path, typeof raw.main === 'string' ? raw.main : 'index.js')).href;
        } else { url = pathToFileURL(path).href; manifestPath = findPackageJSON(url); }
      } else {
        url = this.nativeResolve(specifier, base);
        manifestPath = findPackageJSON(specifier, base);
      }
      if (!url.startsWith('file:') || !/\.[cm]?js$/i.test(fileURLToPath(url))) throw new Error('plugin entry must be a compiled JavaScript file');
      if (!existsSync(fileURLToPath(url))) throw new Error(`plugin not found: ${specifier}`);
      const hostManifest = findPackageJSON(import.meta.url);
      if (!manifestPath || (hostManifest && realpathSync.native(manifestPath) === realpathSync.native(hostManifest))) throw new Error('plugin package ownership is ambiguous');
      const manifest = PluginManifestReader.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
      return Object.freeze({ url, manifest, manifestPath });
    } catch (error) {
      const message = error instanceof Error ? error.message.replace(/[\r\n]+/g, ' ') : 'module resolution failed';
      if (message.startsWith('plugin not found:')) throw error;
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ERR_MODULE_NOT_FOUND') throw new Error(`plugin not found: ${specifier}`);
      throw new Error(`plugin failed to load: ${specifier} (${message})`);
    }
  }
  private nativeResolve(specifier: string, parentURL: string): string {
    // Synchronous, unique sentinel: no import/evaluation or await runs while the temporary hook exists.
    const token = `svgframe-resolve-${randomUUID()}`;
    const hooks = registerHooks({ resolve: (input, context, next) => input === token
      ? next(specifier, { ...context, parentURL }) : next(input, context) });
    try { return import.meta.resolve(token); } finally { hooks.deregister(); }
  }
}
