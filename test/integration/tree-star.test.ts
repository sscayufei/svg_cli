import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CommandExecutor, SceneQuery, type DirectoryPort } from '@svgframe/core';
import { TreeStarPlugin } from '@svgframe/tree-star';
import { StatsPlugin } from '@svgframe/command-stats';
import { DirPlugin } from '@svgframe/command-dir';
import { BoxPlugin } from '@svgframe/shape-box';
import { createApplication, createDefaultContext, optionalPlugins } from '../../src/host/composition.js';
import { CommandDispatcher } from '../../src/host/cli/CommandDispatcher.js';
import { ResultFormatter } from '../../src/host/cli/ResultFormatter.js';
import { PluginInstaller } from '../../src/host/loading/PluginInstaller.js';

const root = resolve(import.meta.dirname, '../..');
const temp = resolve(root, '.tmp/phase2'); mkdirSync(temp, { recursive: true });
const config = resolve(root, 'doc/transcript/inputs/star.plugins.json');
const manifest = { name: '@svgframe/tree-star', contributes: { decorators: ['modified-star'] } };
async function app(mode: 'code' | 'config' = 'code', directory?: DirectoryPort) {
  const application = await createApplication(mode === 'config' ? { args: ['--config', config], ...(directory ? { directory } : {}) } : {
    codePlugins: [
      { module: '@svgframe/command-stats', plugin: new StatsPlugin() },
      { module: '@svgframe/command-dir', plugin: new DirPlugin() },
      { module: '@svgframe/shape-box', plugin: new BoxPlugin() },
      { module: '@svgframe/tree-star', plugin: new TreeStarPlugin() },
    ], ...(directory ? { directory } : {}),
  });
  expect(application.diagnostics).toEqual([]);
  const ctx = application.context; const dispatcher = new CommandDispatcher(ctx.commands); const executor = new CommandExecutor(ctx.history);
  const execute = (line: string) => executor.execute(dispatcher.parse(line)!);
  const run = (line: string) => { const result = execute(line); if (!result.ok) throw new Error(result.error); return result.result; };
  const tree = () => new SceneQuery(ctx.decorators).tree(ctx.session.requireDocument());
  const marks = () => {
    const snapshot = tree();
    return [...(snapshot.rootSuffixes?.includes('*') ? ['<root>'] : []), ...snapshot.entries.filter(entry => entry.suffixes?.includes('*')).map(entry => entry.node.id)].sort();
  };
  const cwd = mkdtempSync(resolve(temp, 'star-test-')); const saved = resolve(cwd, 'saved.svg');
  return { ...application, ctx, execute, run, tree, marks, saved, cwd };
}

describe('Real modified-star plugin and independent box label through frozen host', () => {
  it.each(['code', 'config'] as const)('runs saved-content undo/redo/branch transitions through %s assembly', async mode => {
    const a = await app(mode); try {
      a.run('init'); expect(a.marks()).toEqual([]);
      a.run('create g outer'); a.run('create box p 10 20 30 40 "title" in outer');
      expect(a.marks()).toEqual(['<root>', 'outer', 'p', 'p-label', 'p-rect']);
      expect(a.tree().entries.find(entry => entry.node.id === 'p')!.suffixes).toEqual(['(box)', '*']);
      a.run(`save "${a.saved}"`); expect(a.marks()).toEqual([]);
      a.run('set p label "title"'); expect(a.marks()).toEqual([]);
      a.run('set p fill red'); expect(a.marks()).toEqual(['<root>', 'outer', 'p', 'p-rect']);
      const document = a.ctx.session.requireDocument(); const rectangle = document.requireById('p-rect');
      a.run('undo'); expect(a.marks()).toEqual([]); a.run('redo'); expect(a.marks()).toEqual(['<root>', 'outer', 'p', 'p-rect']);
      a.run('undo'); a.run('set p label "changed"');
      expect(a.marks()).toEqual(['<root>', 'outer', 'p', 'p-label']); expect(a.ctx.history.status.redoCount).toBe(0);
      a.run('set p label "title"'); expect(a.marks()).toEqual([]);
      expect(document.requireById('p-rect')).toBe(rectangle);
      const formatted = new ResultFormatter().format(a.run('tree p'));
      expect(formatted[0]).toBe('g#p (box)'); expect(formatted.some(line => line.endsWith(' *'))).toBe(false);
      expect(a.ctx.events.diagnostics).toEqual([]);
    } finally { a.dispose(); }
  });

  it('does not treat a failed save as a baseline or history barrier, then accepts save-as and read/init', async () => {
    const a = await app(); try {
      a.run('init'); a.run('create box p 0 0 1 1 "old"'); a.run(`save "${a.saved}"`);
      a.run('set p label changed'); a.run('set p fill red'); a.run('undo');
      const before = a.ctx.session.snapshot(); const history = a.ctx.history.status; const marks = a.marks();
      const bad = resolve(a.cwd, 'missing', 'failed.svg');
      expect(a.execute(`save "${bad}"`)).toEqual({ ok: false, error: `cannot write file: ${bad}` });
      expect(a.ctx.session.snapshot()).toEqual(before); expect(a.ctx.history.status).toEqual(history); expect(a.marks()).toEqual(marks);
      a.run('redo'); expect(a.marks()).toEqual(['<root>', 'p', 'p-label', 'p-rect']);
      const alternate = resolve(a.cwd, 'alternate.svg'); a.run(`save "${alternate}"`); expect(a.marks()).toEqual([]);
      a.run('set p label "after save"'); expect(a.marks()).toContain('p-label');
      a.run(`read "${a.saved}"`); expect(a.marks()).toEqual([]); expect(a.ctx.session.sourcePath).toBe(a.saved);
      a.run('set p label changed'); a.run('init 12 34'); expect(a.marks()).toEqual([]);
      expect(a.ctx.session.sourcePath).toBeNull();
    } finally { a.dispose(); }
  });

  it('marks only the root for canvas changes despite the history barrier and clears when restored', async () => {
    const a = await app(); try {
      a.run('init'); a.run('create box p 0 0 1 1 "x"'); a.run(`save "${a.saved}"`);
      a.run('canvas 900 700'); expect(a.marks()).toEqual(['<root>']);
      expect(a.ctx.history.status).toEqual({ undoCount: 0, redoCount: 0, blocked: true });
      a.run('canvas 800 600'); expect(a.marks()).toEqual([]);
      a.run('canvas'); expect(a.marks()).toEqual([]);
    } finally { a.dispose(); }
  });

  it('tracks deletion, movement between parents, grouping and reordering without marking unchanged descendants', async () => {
    const a = await app(); try {
      for (const line of ['init', 'create g old', 'create g target', 'create box p 0 0 1 1 "x" in old', 'create rect sibling 1 2 3 4 in old']) a.run(line);
      a.run(`save "${a.saved}"`);
      a.run('delete p'); expect(a.marks()).toEqual(['<root>', 'old']); a.run('undo'); expect(a.marks()).toEqual([]);
      a.run('addto target p'); expect(a.marks()).toEqual(['<root>', 'old', 'p', 'target']); a.run('undo'); expect(a.marks()).toEqual([]);
      a.run('front p'); expect(a.marks()).toEqual(['<root>', 'old']); a.run('undo'); expect(a.marks()).toEqual([]);
      a.run('front old'); expect(a.marks()).toEqual(['<root>']); a.run('undo'); expect(a.marks()).toEqual([]);
      a.run('group joined p sibling'); expect(a.marks()).toEqual(['<root>', 'joined', 'old', 'p', 'sibling']);
      a.run('undo'); expect(a.marks()).toEqual([]); a.run('redo'); expect(a.marks()).toContain('joined');
      a.run('ungroup joined'); expect(a.marks()).toEqual([]);
    } finally { a.dispose(); }
  });

  it('propagates nested box edits through both containers and preserves stable suffix order for subtree queries', async () => {
    const a = await app(); try {
      a.run('init'); a.run('create box outer 0 0 1 1 "outer"'); a.run('create box inner 0 0 1 1 "inner" in outer');
      a.run(`save "${a.saved}"`); a.run('set inner label changed');
      expect(a.marks()).toEqual(['<root>', 'inner', 'inner-label', 'outer']);
      const result = a.run('tree outer'); if (result.kind !== 'tree') throw new Error('expected tree');
      expect(result.snapshot.canvas).toBeNull(); expect(result.snapshot.rootSuffixes).toEqual([]);
      expect(result.snapshot.entries.filter(entry => entry.node.semanticType === 'box').map(entry => entry.suffixes)).toEqual([['(box)', '*'], ['(box)', '*']]);
      a.run('undo'); expect(a.marks()).toEqual([]);
    } finally { a.dispose(); }
  });

  it('keeps query successes/failures and failed edits/read/save/init from changing content, marks, source or redo', async () => {
    let directoryFails = false;
    const a = await app('code', { path: '/fixture', read: () => { if (directoryFails) throw new Error('denied'); return [{ name: 'item', kind: 'file' }]; } });
    try {
      a.run('init'); a.run('create box p 0 0 1 1 "old"'); a.run(`save "${a.saved}"`); a.run(`read "${a.saved}"`);
      a.run('set p label changed'); a.run('set p fill red'); a.run('undo');
      const content = a.ctx.session.snapshot(); const history = a.ctx.history.status; const dirty = a.marks();
      for (const line of ['tree', 'tree p', 'show p', 'stats', 'dir', 'help', 'canvas']) expect(a.execute(line).ok).toBe(true);
      directoryFails = true; expect(a.execute('dir')).toEqual({ ok: false, error: 'cannot read directory: /fixture' });
      const malformed = resolve(a.cwd, 'malformed.svg'); writeFileSync(malformed, '<svg><bad/></svg>');
      for (const line of ['set p bad value', 'delete p-rect', 'ungroup p', 'create box p 0 0 1 1 "x"', 'tree missing', 'show missing', 'init -1 10', `read "${malformed}"`, `read "${resolve(a.cwd, 'absent.svg')}"`, `save "${resolve(a.cwd, 'missing', 'file.svg')}"`]) expect(a.execute(line).ok, line).toBe(false);
      expect(a.ctx.session.snapshot()).toEqual(content); expect(a.ctx.history.status).toEqual(history); expect(a.marks()).toEqual(dirty);
      a.run('redo'); expect(a.marks()).toContain('p-rect'); a.run('undo'); expect(a.marks()).toEqual(dirty);
      expect(a.ctx.events.diagnostics).toEqual([]);
    } finally { a.dispose(); }
  });

  it('keeps plugin instances isolated across simultaneous sessions and releases observers on exit', async () => {
    const first = await app(); const second = await app();
    try {
      first.run('init'); second.run('init'); first.run('create g g'); expect(first.marks()).toEqual(['<root>', 'g']); expect(second.marks()).toEqual([]);
      second.run('create g g'); second.run(`save "${second.saved}"`); expect(second.marks()).toEqual([]); expect(first.marks()).toEqual(['<root>', 'g']);
      first.run(`save "${first.saved}"`); first.dispose(); first.dispose();
      first.run('create rect later 0 0 1 1'); expect(first.marks()).toEqual([]);
      second.run('create rect later 0 0 1 1'); expect(second.marks()).toEqual(['<root>', 'later']);
    } finally { first.dispose(); second.dispose(); }
  });

  it('releases the actual staged observer if manifest verification fails and allows a subsequent good install', () => {
    const ctx = createDefaultContext(); const installer = new PluginInstaller(ctx);
    // Count delivery to the real plugin observer, keeping the installer's staged subscription owner.
    let observed = 0;
    const plugin = { activate(context: Parameters<TreeStarPlugin['activate']>[0]) {
      new TreeStarPlugin().activate({ ...context, events: {
        diagnostics: context.events.diagnostics,
        subscribe: listener => context.events.subscribe(event => { observed++; listener(event); }),
      } });
    } };
    expect(() => installer.install(plugin, { name: 'bad', contributes: {} })).toThrow('plugin manifest mismatch: bad');
    expect(ctx.decorators.values()).toEqual([]); ctx.session.events.publish('init'); expect(observed).toBe(0);
    installer.install(new TreeStarPlugin(), manifest); const executor = new CommandExecutor(ctx.history); const dispatcher = new CommandDispatcher(ctx.commands);
    expect(executor.execute(dispatcher.parse('init')!).ok).toBe(true); expect(executor.execute(dispatcher.parse('create g g')!).ok).toBe(true);
    expect(new SceneQuery(ctx.decorators).tree(ctx.session.requireDocument()).rootSuffixes).toEqual(['*']);
    installer.dispose(); ctx.session.events.publish('save');
    expect(new SceneQuery(ctx.decorators).tree(ctx.session.requireDocument()).rootSuffixes).toEqual(['*']);
    expect(ctx.events.diagnostics).toEqual([]);
  });

  it('supports star-only installation and explicit opt-out without a dependency on the box package', async () => {
    const application = await createApplication({ codePlugins: [{ module: '@svgframe/tree-star', plugin: new TreeStarPlugin() }] });
    try {
      expect(application.diagnostics).toEqual([]); const ctx = application.context; const executor = new CommandExecutor(ctx.history); const dispatcher = new CommandDispatcher(ctx.commands);
      for (const line of ['init', 'create g g']) expect(executor.execute(dispatcher.parse(line)!).ok).toBe(true);
      expect(new SceneQuery(ctx.decorators).tree(ctx.session.requireDocument()).entries[0]!.suffixes).toEqual(['*']);
      expect(ctx.shapeProviders.get('box')).toBeUndefined();
    } finally { application.dispose(); }
    const path = resolve(mkdtempSync(resolve(temp, 'star-disabled-')), 'plugins.json');
    writeFileSync(path, JSON.stringify({ plugins: [{ module: '@svgframe/shape-box' }, { module: '@svgframe/tree-star', enabled: false }] }));
    const disabled = await createApplication({ args: ['--config', path] });
    try { expect(disabled.diagnostics).toEqual([]); expect(disabled.context.decorators.values().map(d => d.name)).toEqual(['box-type-label']); } finally { disabled.dispose(); }
  });

  it('appends the star after the unchanged box decorator in default A and root configuration B', async () => {
    const modules = ['@svgframe/command-stats', '@svgframe/command-dir', '@svgframe/shape-box', '@svgframe/tree-star'];
    expect(optionalPlugins().map(entry => entry.module)).toEqual(modules);
    const configured = JSON.parse(readFileSync(resolve(root, 'plugins.config.json'), 'utf8')) as { plugins: { module: string }[] };
    expect(configured.plugins.map(entry => entry.module)).toEqual(modules);
    const a = await createApplication(); const b = await createApplication({ args: ['--config', resolve(root, 'plugins.config.json')] });
    try { for (const application of [a, b]) { expect(application.diagnostics).toEqual([]); expect(application.context.decorators.values().map(d => d.name)).toEqual(['box-type-label', 'modified-star']); } }
    finally { a.dispose(); b.dispose(); }
  });

  it('replays both labels and lifecycle transitions with identical raw streams and saved SVG bytes', () => {
    const result = spawnSync(process.execPath, [resolve(root, 'scripts/verify-assemblies.mjs'), resolve(root, 'doc/transcript/plans/star.json')], { cwd: root, encoding: 'utf8', timeout: 30_000 });
    expect(result.status, result.stderr).toBe(0); const evidence = result.stdout.trim().split('Evidence: ')[1]!;
    for (const stream of ['stdout', 'stderr']) expect(readFileSync(resolve(evidence, `code.${stream}`)).equals(readFileSync(resolve(evidence, `config.${stream}`)))).toBe(true);
    const actual = readFileSync(resolve(evidence, 'code.stdout'), 'utf8').replace(/\r\n/g, '\n').replace(/^(?:svg> )+/gm, '').trim();
    expect(actual).toBe(readFileSync(resolve(root, 'doc/transcript/expected/cli-2-star.stdout.txt'), 'utf8').trim());
    expect(readFileSync(resolve(evidence, 'code.stderr'), 'utf8')).toBe(readFileSync(resolve(root, 'doc/transcript/expected/cli-2-star.stderr.txt'), 'utf8'));
    for (const name of ['star-saved.svg', 'star-roundtrip.svg']) {
      expect(readFileSync(resolve(evidence, `code.files/${name}`)).equals(readFileSync(resolve(evidence, `config.files/${name}`)))).toBe(true);
    }
  });
});
