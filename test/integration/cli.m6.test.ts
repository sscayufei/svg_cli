import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('M6 real CLI save transcripts', () => {
  let directory: string;
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'svg-cli-save-')); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });
  const run = (lines: readonly string[]) => {
    const result = spawnSync(process.execPath, [
      '--import', pathToFileURL(createRequire(import.meta.url).resolve('tsx')).href,
      fileURLToPath(new URL('../../src/cli/main.ts', import.meta.url)),
    ], { cwd: directory, input: lines.join('\n'), encoding: 'utf8', timeout: 10_000 });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    return { output: result.stdout.replace(/^(?:svg> )+/gm, '').trim(), errors: result.stderr.trim() };
  };

  it('saves relative and absolute paths, replaces files, and blocks history only on success', () => {
    const absolute = join(directory, 'absolute.svg'); writeFileSync(absolute, 'old');
    const { output, errors } = run([
      'save before.svg', 'init 400 200', 'create g scene', 'create text t 10 20 "开始 & <结束>" in scene',
      'save "绘图 with spaces.svg"', 'undo', 'redo', 'save', 'move t 1 2',
      'save "missing/out.svg"', 'undo', 'redo', `save "${absolute}"`, 'undo', 'help',
    ]);
    expect(errors.split('\n')).toEqual([
      "error: no document. use 'init' or 'read' first", ...Array(2).fill('error: undo not allowed after io command'),
      "error: no source path. use 'save <file.svg>'", 'error: cannot write file: missing/out.svg',
      'error: undo not allowed after io command',
    ]);
    expect(output).toContain('saved to 绘图 with spaces.svg (2 elements)');
    expect(output).toContain(`saved to ${absolute} (2 elements)`);
    expect(output).toContain('text#t moved back to (10,20)\ntext#t moved to (11,22)');
    expect(output).toContain('read <file.svg> — load SVG as the current document');
    const initial = readFileSync(join(directory, '绘图 with spaces.svg'), 'utf8');
    expect(initial).toContain('<text id="t" x="10" y="20">开始 &amp; &lt;结束&gt;</text>');
    expect(readFileSync(absolute, 'utf8')).toContain('x="11" y="22"');
    expect(readdirSync(directory).sort()).toEqual(['absolute.svg', '绘图 with spaces.svg'].sort());
  });

  it('preserves an existing file and redo after serialization fails, with no temporary leftovers', () => {
    const target = join(directory, 'original.svg'); writeFileSync(target, 'original');
    const { output, errors } = run([
      'init', 'create text t 0 0 "bad\u0001text"', 'move t 1 2', 'undo', 'save original.svg', 'redo', 'show t',
      'save a b', 'save ""',
    ]);
    expect(errors.split('\n')).toEqual([
      'error: cannot write file: original.svg', 'error: usage: save [file.svg]', 'error: cannot write file:',
    ]);
    expect(output).toContain('text#t moved to (1,2)');
    expect(readFileSync(target, 'utf8')).toBe('original');
    expect(readdirSync(directory)).toEqual(['original.svg']);
  });

  it('replays the requirement flowchart and counts all eight nested elements', () => {
    const script = readFileSync(new URL('../../examples/demo.cli', import.meta.url), 'utf8');
    const { output, errors } = run(script.split('\n'));
    expect(errors).toBe(''); expect(output).toContain('saved to demo.svg (8 elements)');
    const xml = readFileSync(join(directory, 'demo.svg'), 'utf8');
    expect(xml.match(/<(?:g|rect|text|line) /g)).toHaveLength(8);
    expect(xml).toContain('<text id="process-label" x="545" y="135">处理数据 v2</text>');
    expect(xml).toContain('<rect id="process" x="520" y="100" width="160" height="60" fill="#f5a623"/>');
  });
});
