import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { createApplication } from '../../src/host/composition.js';
import { PluginConfiguration } from '../../src/host/loading/PluginConfiguration.js';
import { PluginModuleResolver } from '../../src/host/loading/PluginModuleResolver.js';
const root = resolve(import.meta.dirname, '../..');
const tempRoot = resolve(root, '.tmp/phase2'); mkdirSync(tempRoot, { recursive: true });
function fixture() { return mkdtempSync(resolve(tempRoot, 'plugins-中文 空格-')); }
function plugin(base: string, directory: string, body: string, contributes: object = {}, fields: object = {}) {
  const path = resolve(base, directory); mkdirSync(path, { recursive: true });
  writeFileSync(resolve(path, 'package.json'), JSON.stringify({ name: directory.replaceAll('/', '-'), type: 'module', exports: { '.': { import: './entry.js' } }, contributes, ...fields }));
  writeFileSync(resolve(path, 'entry.js'), body); return path;
}
const body = (name: string) => `export default class {activate(ctx,options){ctx.commands.register(new class {name='${name}';syntax='${name}';description='fixture';build(){return {kind:'query',execute(){return {kind:'lines',lines:[options?.message??'ok']}}}}});}}`;

describe('Configuration, module resolution and compiled startup', () => {
  it.each([null, [], {}, { plugins: null }, { plugins: ['bad'] }, { plugins: [{ module: '' }] }, { plugins: [{ module: 'x', enabled: 1 }] }, { plugins: [], extra: true }])('rejects invalid config structure %j before loading any entry', value => {
    expect(() => PluginConfiguration.parse(value)).toThrow('invalid plugin config');
  });
  it('loads directory, explicit JavaScript and import-only package exports from the config directory in order', async () => {
    const directory = fixture();
    const relative = plugin(directory, 'relative', body('first'), { commands: ['first'] });
    const explicit = plugin(directory, 'explicit', body('second'), { commands: ['second'] });
    plugin(directory, 'node_modules/@fixture/package', body('third'), { commands: ['third'] }, { name: '@fixture/package' });
    const resolver = new PluginModuleResolver();
    expect(resolver.resolve('./relative', directory).url).toBe(pathToFileURL(resolve(relative, 'entry.js')).href);
    expect(resolver.resolve(resolve(explicit, 'entry.js'), directory).manifest.name).toBe('explicit');
    const config = resolve(directory, 'plugins.json');
    writeFileSync(config, JSON.stringify({ plugins: [{ module: './relative' }, { module: './explicit/entry.js' }, { module: '@fixture/package', options: { message: '传递 unchanged' } }] }));
    const app = await createApplication({ cwd: root, args: ['--config', config] });
    expect(app.diagnostics).toEqual([]); expect(app.context.commands.values().slice(-3).map(entry => entry.name)).toEqual(['first','second','third']);
    expect(app.context.commands.get('third')!.build([]).execute()).toEqual({ kind: 'lines', lines: ['传递 unchanged'] }); app.dispose();
  });
  it('distinguishes missing module, no default export, manifest mismatch, invalid default, activation, dependency and evaluation failures and continues', async () => {
    const directory = fixture();
    plugin(directory, 'before', body('before'), { commands: ['before'] });
    plugin(directory, 'no-default', 'export const named=1;');
    plugin(directory, 'mismatch', body('discarded'));
    plugin(directory, 'invalid', 'export default 42;');
    plugin(directory, 'activation', 'export default {activate(){throw new Error("boom")}};');
    plugin(directory, 'dependency', 'import "a-missing-internal-dependency"; export default {activate(){}};');
    plugin(directory, 'evaluation', 'throw new Error("evaluation failed"); export default {activate(){}};');
    plugin(directory, 'disabled', 'throw new Error("must not evaluate");');
    plugin(directory, 'after', body('after'), { commands: ['after'] });
    writeFileSync(resolve(directory, 'config.json'), JSON.stringify({ plugins: ['before','missing','no-default','mismatch','invalid','activation','dependency','evaluation','after'].map(module => ({ module: `./${module}` })).concat([{ module: './disabled', enabled: false } as {module: string}]) }));
    const app = await createApplication({ args: ['--config', resolve(directory, 'config.json')] });
    expect(app.diagnostics).toHaveLength(7);
    expect(app.diagnostics[0]).toBe('plugin not found: ./missing');
    expect(app.diagnostics[1]).toBe('plugin has no default export: ./no-default');
    expect(app.diagnostics[2]).toContain('plugin manifest mismatch: mismatch');
    expect(app.diagnostics[3]).toBe('plugin failed to activate: invalid (default export must implement activate)');
    expect(app.diagnostics[4]).toBe('plugin failed to activate: activation (boom)');
    expect(app.diagnostics[5]).toContain('plugin failed to load: ./dependency');
    expect(app.diagnostics[6]).toBe('plugin failed to load: ./evaluation (evaluation failed)');
    expect(app.context.commands.get('discarded')).toBeUndefined();
    expect(app.context.commands.get('before')!.build([]).execute()).toMatchObject({ kind: 'lines' });
    expect(app.context.commands.get('after')!.build([]).execute()).toMatchObject({ kind: 'lines' }); app.dispose();
  });
  it('explicit config overrides code plugins, disabled entries are not resolved, and invalid config falls back to built-ins', async () => {
    const directory = fixture(); const path = resolve(directory, 'config.json');
    writeFileSync(path, JSON.stringify({ plugins: [{ module: 'never-resolve-me', enabled: false }] }));
    const options = { args: ['--config', path], codePlugins: [{ module: 'also-never-resolve', plugin: {} }] };
    const app = await createApplication(options); expect(app.diagnostics).toEqual([]); expect(app.context.commands.values()).toHaveLength(19); app.dispose();
    for (const data of ['{', '{"plugins":[{"module":"./unreachable"},null]}']) {
      writeFileSync(path, data); const invalid = await createApplication(options);
      expect(invalid.diagnostics).toEqual(['invalid plugin config']); expect(invalid.context.commands.values()).toHaveLength(19); invalid.dispose();
    }
  });
  it('rejects JavaScript with ambiguous host package ownership', () => {
    const directory = fixture(); writeFileSync(resolve(directory, 'orphan.js'), 'export default {activate(){}}');
    expect(() => new PluginModuleResolver().resolve('./orphan.js', directory)).toThrow('plugin package ownership is ambiguous');
  });
  it('runs the compiled CLI from a different cwd and reports load failure before continuing interactive commands', () => {
    const directory = fixture(); writeFileSync(resolve(directory, 'config.json'), '{"plugins":[{"module":"./missing"}]}');
    const result = spawnSync(process.execPath, [resolve(root, 'dist/host/main.js'), '--config', 'config.json'], { cwd: directory, input: 'init\ncreate rect r 1 2 3 4\nshow r\n', encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0); expect(result.stderr).toBe('error: plugin not found: ./missing\n'); expect(result.stdout).toContain('rect#r');
  });
});
