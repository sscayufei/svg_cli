import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApplication, optionalPlugins } from '../../src/host/composition.js';
import { CommandDispatcher } from '../../src/host/cli/CommandDispatcher.js';

const root = resolve(import.meta.dirname, '../..');
const config = resolve(root, 'plugins.config.json');
const expectedPrefix = ['@svgframe/command-stats', '@svgframe/command-dir'];

describe('Common command baseline before independent box integration', () => {
  it('keeps the stats/dir prefix, order and options aligned in code and root configuration', () => {
    const code = optionalPlugins().slice(0, 2).map(entry => ({ module: entry.module, options: entry.options }));
    const configured = JSON.parse(readFileSync(config, 'utf8')) as { plugins: { module: string; options?: unknown; enabled?: boolean }[] };
    expect(code.map(entry => entry.module)).toEqual(expectedPrefix);
    expect(configured.plugins.slice(0, 2).map(entry => entry.module)).toEqual(expectedPrefix);
    expect(configured.plugins.slice(0, 2).every(entry => entry.enabled !== false)).toBe(true);
    expect(configured.plugins.slice(0, 2).map(entry => ({ module: entry.module, options: entry.options }))).toEqual(code);
  });

  it('loads the same base command classes and help through the real root config', async () => {
    const a = await createApplication();
    const b = await createApplication({ args: ['--config', config] });
    try {
      expect(a.diagnostics).toEqual([]); expect(b.diagnostics).toEqual([]);
      const left = new CommandDispatcher(a.context.commands); const right = new CommandDispatcher(b.context.commands);
      for (const name of ['stats', 'dir']) {
        expect(left.parse(name)!.constructor).toBe(right.parse(name)!.constructor);
        expect(left.parse(name)!.kind).toBe('query');
      }
      for (const dispatcher of [left, right]) {
        const help = dispatcher.parse('help')!.execute(); if (help.kind !== 'help') throw new Error('expected help');
        expect(help.entries.filter(entry => ['stats', 'dir'].includes(entry.syntax))).toEqual([
          { syntax: 'stats', description: 'count leaf shapes by type and containers' },
          { syntax: 'dir', description: 'list the current working directory' },
        ]);
      }
    } finally { a.dispose(); b.dispose(); }
  });

  it('replays common commands against the real root config with identical raw streams and directory contents', () => {
    // This regression covers the common commands. Box-specific set equality belongs to the later C_A/C_B proof.
    const result = spawnSync(process.execPath, [resolve(root, 'scripts/verify-assemblies.mjs'), resolve(root, 'doc/transcript/plans/commands-root-config.json')], { cwd: root, encoding: 'utf8', timeout: 30_000 });
    expect(result.status, result.stderr).toBe(0);
    const evidence = result.stdout.trim().split('Evidence: ')[1]!;
    for (const stream of ['stdout', 'stderr']) expect(readFileSync(resolve(evidence, `code.${stream}`)).equals(readFileSync(resolve(evidence, `config.${stream}`)))).toBe(true);
    const raw = readFileSync(resolve(evidence, 'config.stdout'), 'utf8');
    expect(raw.match(/\[DIR\]  Beta/g)).toHaveLength(6);
    expect(raw).toContain('rect: 1  (total 1, containers 0)');
  });

  it('preserves explicit opt-out after root config starts enabling the command plugins', () => {
    const temporary = resolve(root, '.tmp/phase2'); mkdirSync(temporary, { recursive: true });
    const cwd = mkdtempSync(resolve(temporary, 'baseline-opt-out-'));
    const result = spawnSync(process.execPath, [resolve(root, 'dist/host/main.js'), '--config', resolve(root, 'test/fixtures/entries/no-optional.json')], { cwd, input: 'stats\ndir\nhelp\n', encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('error: unknown command: stats\nerror: unknown command: dir\n');
    expect(result.stdout).not.toContain('stats —'); expect(result.stdout).not.toContain('dir —');
    expect(result.stdout).toContain('help — show command syntax');
  });
});
