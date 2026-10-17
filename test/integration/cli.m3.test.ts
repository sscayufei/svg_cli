import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('M3 edit transcripts', () => {
  const run = (lines: readonly string[]) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli/main.ts'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      input: lines.join('\n'), encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    return { output: result.stdout.replace(/^(?:svg> )+/gm, '').trim(), errors: result.stderr.trim() };
  };

  it('moves/scales a Composite, edits text and deletes/indexes a complete subtree', () => {
    const { output, errors } = run([
      'init', 'create g g', 'create rect r 1 2 3 4 in g', 'create text t 5 6 "before" in g',
      'move g 2 3', 'scale g .5', 'set r fill #abc', 'set t text "after 中文"', 'tree',
      'delete g', 'show r', 'create circle r 100 100 20', 'move r 30 0', 'tree',
    ]);
    expect(errors).toBe('error: no such shape: r');
    expect(output).toContain('g#g moved by (2,3)');
    expect(output).toContain('rect#r  x=1.5 y=2.5 w=1.5 h=2 fill=#abc');
    expect(output).toContain('text#t  (3.5,4.5) "after 中文"');
    expect(output).toContain('circle#r moved to (130,100)');
    expect(output.endsWith('svg (800x600)\n└── circle#r  cx=130 cy=100 r=20')).toBe(true);
  });

  it('reports exact errors and keeps geometry unchanged after failed edits', () => {
    const { output, errors } = run([
      'move r 1 2', 'scale r 2', 'set r fill red', 'delete r', 'init', 'create rect r 1 2 3 4',
      'move missing 1 2', 'scale r 0', 'set r id renamed', 'set r width -1',
      'move r NaN 1', 'delete missing', 'move r 1', 'show r',
    ]);
    expect(errors.split('\n')).toEqual([
      ...Array(4).fill("error: no document. use 'init' or 'read' first"),
      'error: no such shape: missing', 'error: scale factor must be positive',
      'error: unknown attribute: id', 'error: width must be non-negative',
      'error: dx must be a finite number', 'error: no such shape: missing',
      'error: usage: move <id> <dx> <dy>',
    ]);
    expect(output.endsWith('rect#r  parent=svg\n  x=1 y=2 width=3 height=4')).toBe(true);
  });
});
