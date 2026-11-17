import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Readable, Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { CommandExecutor, type DirectoryPort } from '@svgframe/core';
import { DirCommand } from '@svgframe/command-dir';
import { createApplication } from '../../src/host/composition.js';
import { CommandDispatcher } from '../../src/host/cli/CommandDispatcher.js';
import { ResultFormatter } from '../../src/host/cli/ResultFormatter.js';
import { SvgCli } from '../../src/host/cli/SvgCli.js';
import { NodeDirectoryAdapter } from '../../src/host/filesystem/NodeDirectoryAdapter.js';

const root = resolve(import.meta.dirname, '../..');
const temporary = resolve(root, '.tmp/phase2'); mkdirSync(temporary, { recursive: true });
const seed = resolve(root, 'doc/transcript/inputs/dir-workspace');
const commandsConfig = resolve(root, 'doc/transcript/inputs/commands.plugins.json');
const listing = ['[DIR]  Beta', '[DIR]  docs', '[FILE]  .hidden', '[FILE]  Z.txt', '[FILE]  alpha.txt'];
const temp = () => mkdtempSync(resolve(temporary, 'dir-integration-'));
const normalize = (value: string) => value.replace(/\r\n/g, '\n').replace(/^(?:svg> )+/gm, '').trim();

describe('dir through the frozen host and real directory adapter', () => {
  it('uses the same real service and command class in A/B before SVG initialization', async () => {
    const directory = resolve(temp(), 'listed'); cpSync(seed, directory, { recursive: true });
    const port = new NodeDirectoryAdapter(directory);
    const a = await createApplication({ directory: port });
    const b = await createApplication({ directory: port, args: ['--config', commandsConfig] });
    try {
      for (const app of [a,b]) {
        expect(app.diagnostics).toEqual([]); expect(app.context.directory).toBe(port); expect(app.context.session.snapshot().document).toBeNull();
        const dispatcher = new CommandDispatcher(app.context.commands); const command = dispatcher.parse('dir')!;
        expect(command).toBeInstanceOf(DirCommand); expect(command.kind).toBe('query');
        expect(new CommandExecutor(app.context.history).execute(command)).toEqual({ ok: true, result: { kind: 'lines', lines: listing } });
        expect(app.context.commands.values().map(entry => entry.name).slice(-2)).toEqual(['stats','dir']);
        expect(dispatcher.parse('help')!.execute()).toMatchObject({ entries: expect.arrayContaining([{ syntax: 'dir', description: 'list the current working directory' }]) });
      }
    } finally { a.dispose(); b.dispose(); }
    const empty = new NodeDirectoryAdapter(temp());
    expect(new DirCommand(empty).execute()).toEqual({ kind: 'lines', lines: ['(empty directory)'] });
  });
  it('shows a real directory link as a link and does not traverse its target', () => {
    const directory = resolve(temp(), 'listed'); cpSync(seed, directory, { recursive: true });
    symlinkSync(resolve(directory, 'Beta'), resolve(directory, 'shortcut'), 'junction');
    expect(new DirCommand(new NodeDirectoryAdapter(directory)).execute()).toEqual({ kind: 'lines', lines: [...listing, '[LINK]  shortcut'] });
  });
  it.each([false, true])('leaves content, dirty observer, path, stacks and barrier unchanged (read failure=%s)', async fails => {
    const directory = temp(); const listed = resolve(directory, 'listed'); mkdirSync(listed); writeFileSync(resolve(listed, '.hidden'), 'unchanged');
    const source = resolve(directory, 'source.svg'); const saved = resolve(directory, 'saved.svg');
    writeFileSync(source, '<svg width="20" height="30"><rect id="r"/></svg>');
    const port: DirectoryPort = new NodeDirectoryAdapter(fails ? resolve(directory, 'missing') : listed);
    const app = await createApplication({ cwd: listed, directory: port }); const cwd = process.cwd();
    try {
      const ctx = app.context; const dispatcher = new CommandDispatcher(ctx.commands); const executor = new CommandExecutor(ctx.history);
      const execute = (line: string) => executor.execute(dispatcher.parse(line)!);
      const run = (line: string) => { const result = execute(line); if (!result.ok) throw new Error(result.error); return result.result; };
      let baseline = ''; let dirty = false; let notifications = 0;
      const subscription = ctx.events.subscribe(event => {
        notifications++; const content = JSON.stringify(event.snapshot.document);
        if (['init','read','save'].includes(event.kind)) baseline = content;
        dirty = content !== baseline;
      });
      run(`read "${source}"`); run('set r fill red'); run('set r fill blue'); run('undo');
      const before = ctx.session.snapshot(); const history = ctx.history.status; const node = ctx.session.requireDocument().requireById('r');
      const observer = { baseline, dirty, notifications }; expect(dirty).toBe(true); expect(history).toMatchObject({ undoCount: 1, redoCount: 1 });
      const outcome = execute('dir');
      expect(outcome).toEqual(fails ? { ok: false, error: `cannot read directory: ${port.path}` } : { ok: true, result: { kind: 'lines', lines: ['[FILE]  .hidden'] } });
      expect(() => dispatcher.parse('dir extra')).toThrow('usage: dir');
      expect(ctx.session.snapshot()).toEqual(before); expect(ctx.history.status).toEqual(history);
      expect({ baseline, dirty, notifications }).toEqual(observer); expect(ctx.session.requireDocument().requireById('r')).toBe(node);
      expect(ctx.session.sourcePath).toBe(source); expect(ctx.directory.path).toBe(port.path); expect(process.cwd()).toBe(cwd);
      run('redo'); expect(node.getAttributes().fill).toBe('blue'); run('undo'); run('undo'); expect(node.getAttributes().fill).toBeUndefined(); expect(dirty).toBe(false);
      run(`save "${saved}"`); expect(existsSync(saved)).toBe(true);
      const savedState = ctx.session.snapshot(); const blocked = ctx.history.status; const savedObserver = { baseline, dirty, notifications };
      execute('dir'); expect(ctx.history.status).toEqual(blocked); expect(blocked.blocked).toBe(true); expect(ctx.session.snapshot()).toEqual(savedState);
      expect({ baseline, dirty, notifications }).toEqual(savedObserver); expect(dirty).toBe(false);
      expect(ctx.directory.path).toBe(port.path); expect(process.cwd()).toBe(cwd); expect(() => ctx.history.undo()).toThrow('undo not allowed after io command');
      subscription.dispose();
    } finally { app.dispose(); }
  });
  it('reports a real adapter read failure and keeps accepting later CLI commands', async () => {
    const missing = resolve(temp(), 'missing'); const app = await createApplication({ directory: new NodeDirectoryAdapter(missing) });
    let stdout = ''; let stderr = '';
    const output = new Writable({ write(chunk, _encoding, done) { stdout += chunk.toString(); done(); } });
    const errors = new Writable({ write(chunk, _encoding, done) { stderr += chunk.toString(); done(); } });
    try {
      await new SvgCli(Readable.from(['dir\ninit\nstats\nhelp\n']), output, errors, new CommandDispatcher(app.context.commands), new CommandExecutor(app.context.history), new ResultFormatter()).run();
      expect(stderr).toBe(`error: cannot read directory: ${missing}\n`);
      expect(stdout).toContain('canvas 800x600 created'); expect(stdout).toContain('(total 0, containers 0)');
      expect(stdout).toContain('dir — list the current working directory');
    } finally { app.dispose(); }
  });
  it.each([
    { stats: false, dir: false, enabled: [] }, { stats: true, dir: false, enabled: ['stats'] },
    { stats: false, dir: true, enabled: ['dir'] }, { stats: true, dir: true, enabled: ['stats','dir'] },
  ])('enables and disables the two plugins independently: %j', async value => {
    const directory = temp(); const config = resolve(directory, 'plugins.json');
    writeFileSync(config, JSON.stringify({ plugins: ['stats','dir'].map(name => ({ module: `@svgframe/command-${name}`, enabled: value.enabled.includes(name) })) }));
    const app = await createApplication({ args: ['--config', config], directory: { path: directory, read: () => [] } });
    try {
      expect(app.diagnostics).toEqual([]); const dispatcher = new CommandDispatcher(app.context.commands);
      const help = dispatcher.parse('help')!.execute(); if (help.kind !== 'help') throw new Error('expected help');
      for (const name of ['stats','dir'] as const) {
        expect(help.entries.some(entry => entry.syntax === name)).toBe(value[name]);
        if (!value[name]) expect(() => dispatcher.parse(name)).toThrow(`unknown command: ${name}`);
        else expect(dispatcher.parse(name)!.kind).toBe('query');
      }
      expect(app.context.session.snapshot().document).toBeNull(); expect(app.context.history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: false });
    } finally { app.dispose(); }
  });
  it('compares raw A/B listing in one fixed cwd, with read/save and logs outside the listed directory', () => {
    const result = spawnSync(process.execPath, [resolve(root, 'scripts/verify-assemblies.mjs'), resolve(root, 'doc/transcript/plans/commands.json')], { cwd: root, encoding: 'utf8', timeout: 30_000 });
    expect(result.status, result.stderr).toBe(0); const evidence = result.stdout.trim().split('Evidence: ')[1]!;
    const before = readFileSync(resolve(evidence, 'code.stdout')); const after = readFileSync(resolve(evidence, 'config.stdout'));
    expect(before.equals(after)).toBe(true); expect(normalize(before.toString('utf8'))).toBe(readFileSync(resolve(root, 'doc/transcript/expected/cli-2-commands.stdout.txt'), 'utf8').trim());
    const errors = readFileSync(resolve(evidence, 'code.stderr'));
    expect(errors.equals(readFileSync(resolve(evidence, 'config.stderr')))).toBe(true);
    expect(errors.toString('utf8')).toBe(readFileSync(resolve(root, 'doc/transcript/expected/cli-2-commands.stderr.txt'), 'utf8'));
    expect(before.toString('utf8').match(/\[DIR\]  Beta/g)).toHaveLength(6);
    const saved = readFileSync(resolve(evidence, 'dir-session.svg'), 'utf8'); expect(saved).toContain('fill="red"');
    expect(existsSync(resolve(evidence, 'cwd/dir-session.svg'))).toBe(false);
    expect(readFileSync(resolve(evidence, 'code.files/docs/source.svg')).equals(readFileSync(resolve(evidence, 'config.files/docs/source.svg')))).toBe(true);
  });
});
