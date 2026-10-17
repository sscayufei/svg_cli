import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('M7 read/save/read CLI transcripts', () => {
  let directory: string;
  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'svg-cli-read-'));
    copyFileSync(new URL('../fixtures/other.svg', import.meta.url), join(directory, '源 file.svg'));
    writeFileSync(join(directory, 'bad.svg'), '<svg width="1" height="1"><rect/><g transform="translate(1,2)"/></svg>');
  });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });
  const run = (lines: readonly string[]) => {
    const result = spawnSync(process.execPath, [
      '--import', pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href,
      fileURLToPath(new URL('../../src/cli/main.ts', import.meta.url)),
    ], { cwd: directory, input: lines.join('\n'), encoding: 'utf8', timeout: 10_000 });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    return { output: result.stdout.replace(/^(?:svg> )+/gm, '').trim(), errors: result.stderr.trim() };
  };

  it('loads without init, warns after success, preserves redo after failure and tracks read-only source paths', () => {
    const source = join(directory, '源 file.svg'); const copy = join(directory, 'copy.svg');
    const { output, errors } = run([
      'read "源 file.svg"', 'undo', 'redo', 'move c1 5 0', 'undo', 'read bad.svg', 'read missing.svg', 'redo',
      `save "${copy}"`, 'move c1 5 0', 'save', 'show c1',
    ]);
    expect(errors.split('\n')).toEqual([
      ...Array(2).fill('error: undo not allowed after io command'),
      'error: unknown attribute: transform', 'error: cannot read file: missing.svg',
    ]);
    expect(output).toContain('warning: assigned id rect1 to unnamed <rect>\nread 源 file.svg (7 elements)');
    expect(output.match(/warning:/g)).toHaveLength(1);
    expect(output).toContain('circle#c1 moved back to (50,50)\ncircle#c1 moved to (55,50)');
    expect(output).toContain(`saved to ${source} (7 elements)`);
    expect(readFileSync(copy, 'utf8')).toContain('id="c1" cx="55"');
    expect(readFileSync(source, 'utf8')).toContain('id="c1" cx="60"');
  });

  it('round-trips generated IDs and replaces the default source on the next successful read', () => {
    const { output, errors } = run([
      'read "源 file.svg"', 'save copy.svg', 'read copy.svg', 'move c1 5 0', 'save',
      'read "源 file.svg"', 'show c1', 'tree g1', 'canvas 500 400', 'save', 'init', 'save',
    ]);
    expect(errors).toBe("error: no source path. use 'save <file.svg>'");
    expect(output.match(/warning:/g)).toHaveLength(2);
    expect(output).toContain('saved to copy.svg (7 elements)\nread copy.svg (7 elements)');
    expect(output).toContain('circle#c1  parent=svg\n  cx=50 cy=50 r=10');
    expect(readFileSync(join(directory, 'copy.svg'), 'utf8')).toContain('id="c1" cx="55"');
    expect(readFileSync(join(directory, '源 file.svg'), 'utf8')).toContain('viewBox="0 0 500 400"');
  });

  it('rejects read syntax, malformed XML and duplicate IDs without emitting candidate warnings', () => {
    writeFileSync(join(directory, 'broken.svg'), '<svg width="1" height="1"><rect/></bad>');
    writeFileSync(join(directory, 'duplicates.svg'), '<svg width="1" height="1"><rect/><g id="same"/><rect id="same"/></svg>');
    const { output, errors } = run([
      'read', 'read a b', 'init', 'create g old', 'read broken.svg', 'read duplicates.svg', 'undo', 'redo', 'show old',
    ]);
    const lines = errors.split('\n');
    expect(lines.slice(0, 2)).toEqual(['error: usage: read <file.svg>', 'error: usage: read <file.svg>']);
    expect(lines[2]).toMatch(/^error: invalid SVG:/);
    expect(lines[3]).toBe('error: id already exists: same');
    expect(lines).toHaveLength(4); expect(output).not.toContain('warning:');
    expect(output).toContain('g#old deleted\ng#old created\ng#old  parent=svg');
  });
});
