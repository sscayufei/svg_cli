import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('Phase 1 complete acceptance transcripts', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'svg-acceptance-'));
    copyFileSync(new URL('../fixtures/other.svg', import.meta.url), join(directory, 'other.svg'));
  });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });
  const normalize = (value: string) => value.replace(/\r\n/g, '\n').replace(/^(?:svg> )+/gm, '').trim();
  const fixture = (name: string) => readFileSync(new URL(`../fixtures/acceptance/${name}`, import.meta.url), 'utf8');
  const run = (input: string) => {
    const result = spawnSync(process.execPath, [
      '--import', pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href,
      fileURLToPath(new URL('../../src/cli/main.ts', import.meta.url)),
    ], { cwd: directory, input, encoding: 'utf8', timeout: 10_000 });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    return { output: normalize(result.stdout), errors: normalize(result.stderr) };
  };

  it('matches the complete requirement section 6 session, including exact errors and imported tree', () => {
    const result = run(fixture('typical.cli'));
    expect(result.output).toBe(normalize(fixture('typical.stdout.txt')));
    expect(result.errors).toBe(normalize(fixture('typical.stderr.txt')));
  });

  it('matches a six-type structural session through scaling, ordering, subtree restoration and SVG round-trip', () => {
    const result = run(fixture('structure.cli'));
    expect(result.output).toBe(normalize(fixture('structure.stdout.txt'))); expect(result.errors).toBe('');
    expect(readFileSync(join(directory, 'scene.svg'), 'utf8')).toContain('text &amp; &lt;中文&gt;');
  });

  it('matches the requirement section 6.1 flowchart feedback and shipped browser artifact', () => {
    const result = run(readFileSync(new URL('../../examples/demo.cli', import.meta.url), 'utf8'));
    expect(result.output).toBe(normalize(fixture('flowchart.stdout.txt'))); expect(result.errors).toBe('');
    expect(readFileSync(join(directory, 'demo.svg'), 'utf8').replace(/\r\n/g, '\n'))
      .toBe(readFileSync(new URL('../../demo.svg', import.meta.url), 'utf8').replace(/\r\n/g, '\n'));
  });

  it('exposes exactly the nineteen required command names in help', () => {
    const result = run('help');
    const names = [...result.output.matchAll(/^([a-z]+)(?: .*)? — /gm)].map(match => match[1]);
    expect([...new Set(names)].sort()).toEqual([
      'addto', 'back', 'canvas', 'create', 'delete', 'front', 'group', 'help', 'init', 'move',
      'read', 'redo', 'save', 'scale', 'set', 'show', 'tree', 'undo', 'ungroup',
    ]);
    expect(result.errors).toBe(''); expect(result.output).not.toContain('Not implemented');
    expect(result.output).toContain('EOF — exit');
  });
});
