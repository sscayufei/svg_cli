import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CommandExecutor } from '@svgframe/core';
import { StatsCommand, StatsPlugin } from '@svgframe/command-stats';
import { createApplication } from '../../src/host/composition.js';
import { CommandDispatcher } from '../../src/host/cli/CommandDispatcher.js';

const root = resolve(import.meta.dirname, '../..');
const temporary = resolve(root, '.tmp/phase2'); mkdirSync(temporary, { recursive: true });
const main = resolve(root, 'dist/host/main.js');
const statsConfig = resolve(root, 'doc/transcript/inputs/stats.plugins.json');
const normalize = (value: string) => value.replace(/\r\n/g, '\n').replace(/^(?:svg> )+/gm, '').trim();

describe('Independent stats package through the frozen framework', () => {
  it('uses the same command class through A and B, adds dynamic help and retains history', async () => {
    const a = await createApplication({ codePlugins: [{ module: '@svgframe/command-stats', plugin: new StatsPlugin() }] });
    const b = await createApplication({ args: ['--config', statsConfig] });
    try {
      expect(a.diagnostics).toEqual([]); expect(b.diagnostics).toEqual([]);
      for (const app of [a,b]) {
        const { context } = app; const dispatcher = new CommandDispatcher(context.commands); const executor = new CommandExecutor(context.history);
        const execute = (line: string) => { const result = executor.execute(dispatcher.parse(line)!); if (!result.ok) throw new Error(result.error); return result.result; };
        expect(dispatcher.parse('stats')).toBeInstanceOf(StatsCommand);
        expect(context.commands.values()).toHaveLength(20);
        expect(execute('help')).toMatchObject({ kind: 'help', entries: expect.arrayContaining([{ syntax: 'stats', description: 'count leaf shapes by type and containers' }]) });
        execute('init'); execute('create g g'); execute('create rect r 1 2 3 4 in g'); execute('set r fill red'); execute('undo');
        const before = context.session.snapshot(); const history = context.history.status; const node = context.session.requireDocument().requireById('r'); let events = 0;
        const subscription = context.events.subscribe(() => { events++; });
        expect(execute('stats')).toEqual({ kind: 'lines', lines: ['rect: 1  (total 1, containers 1)'] });
        expect(() => dispatcher.parse('stats extra')).toThrow('usage: stats');
        expect(context.session.snapshot()).toEqual(before); expect(context.history.status).toEqual(history); expect(events).toBe(0);
        execute('redo'); expect(node.getAttributes().fill).toBe('red'); execute('undo'); expect(node.getAttributes().fill).toBeUndefined();
        subscription.dispose();
      }
    } finally { a.dispose(); b.dispose(); }
  });
  it('can be absent or explicitly disabled without appearing in help or touching document/history', async () => {
    const directory = mkdtempSync(resolve(temporary, 'stats-disabled-'));
    const disabled = resolve(directory, 'disabled.json');
    writeFileSync(disabled, JSON.stringify({ plugins: [{ module: '@svgframe/command-stats', enabled: false }] }));
    for (const path of [resolve(root, 'plugins.config.json'), disabled]) {
      const app = await createApplication({ args: ['--config', path] });
      try {
        expect(app.diagnostics).toEqual([]); const dispatcher = new CommandDispatcher(app.context.commands);
        const before = app.context.session.snapshot(); const history = app.context.history.status;
        expect(() => dispatcher.parse('stats')).toThrow('unknown command: stats');
        expect(dispatcher.parse('help')!.execute()).toMatchObject({ entries: expect.not.arrayContaining([expect.objectContaining({ syntax: 'stats' })]) });
        expect(app.context.commands.values()).toHaveLength(19);
        expect(app.context.session.snapshot()).toEqual(before); expect(app.context.history.status).toEqual(history);
      } finally { app.dispose(); }
    }
  });
  it('matches manually specified new semantics and compares raw A/B streams and generated SVG bytes', () => {
    const result = spawnSync(process.execPath, [resolve(root, 'scripts/verify-assemblies.mjs'), resolve(root, 'doc/transcript/plans/stats.json')], { cwd: root, encoding: 'utf8', timeout: 30_000 });
    expect(result.status, result.stderr).toBe(0);
    const evidence = result.stdout.trim().split('Evidence: ')[1]!;
    const stdout = readFileSync(resolve(evidence, 'code.stdout'));
    const stderr = readFileSync(resolve(evidence, 'code.stderr'));
    expect(stdout.equals(readFileSync(resolve(evidence, 'config.stdout')))).toBe(true);
    expect(stderr.equals(readFileSync(resolve(evidence, 'config.stderr')))).toBe(true);
    expect(normalize(stdout.toString('utf8'))).toBe(readFileSync(resolve(root, 'doc/transcript/expected/cli-2-stats.stdout.txt'), 'utf8').trim());
    expect(stderr.toString('utf8')).toBe(readFileSync(resolve(root, 'doc/transcript/expected/cli-2-stats.stderr.txt'), 'utf8'));
    const saved = readFileSync(resolve(evidence, 'code.files/stats.svg'));
    expect(saved.equals(readFileSync(resolve(evidence, 'config.files/stats.svg')))).toBe(true);
    expect(saved.toString('utf8')).toContain('<g id="nested">');
    const empty = spawnSync(process.execPath, [main, '--config', resolve(root, 'plugins.config.json')], { cwd: root, input: 'stats\n', encoding: 'utf8' });
    expect(empty.status).toBe(0); expect(empty.stderr).toBe('error: unknown command: stats\n');
  });
});
