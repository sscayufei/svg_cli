import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('M5 undo/redo CLI transcripts', () => {
  const run = (lines: readonly string[]) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli/main.ts'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)), input: lines.join('\n'), encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    return { output: result.stdout.replace(/^(?:svg> )+/gm, '').trim(), errors: result.stderr.trim() };
  };

  it('matches the required move, text and subtree restore behavior', () => {
    const { output, errors } = run([
      'init', 'create g markers', 'create circle c1 100 100 20 in markers',
      'create rect box 1 2 3 4 in markers', 'create text title 0 0 "My Diagram"',
      'move c1 30 0', 'undo', 'redo', 'set title text "My Diagram v2"', 'undo',
      'delete box', 'undo', 'group g box c1', 'delete g', 'undo', 'tree g',
      'undo', 'show box',
    ]);
    expect(errors).toBe('');
    expect(output).toContain('circle#c1 moved to (130,100)\ncircle#c1 moved back to (100,100)\ncircle#c1 moved to (130,100)');
    expect(output).toContain('text#title updated: text="My Diagram v2"\ntext#title updated: text="My Diagram"');
    expect(output).toContain('rect#box deleted\nrect#box restored into g#markers');
    expect(output).toContain('g#g\n├── circle#c1  cx=130 cy=100 r=20\n└── rect#box  x=1 y=2 w=3 h=4');
    expect(output).toContain('rect#box  parent=g#markers');
  });

  it('keeps redo after queries and failures and enforces history boundaries', () => {
    const { output, errors } = run([
      'undo', 'redo', 'init', 'undo', 'redo', 'create g g', 'move g 2 3', 'undo',
      'tree', 'canvas', 'show g', 'help', 'scale g 0', 'undo extra', 'redo',
      'undo', 'set g fill red', 'redo', 'canvas 400 300', 'tree', 'create box bad', 'undo',
      'create g new', 'undo', 'undo', 'redo', 'init', 'redo',
    ]);
    expect(errors.split('\n')).toEqual([
      ...Array(2).fill("error: no document. use 'init' or 'read' first"),
      ...Array(2).fill('error: undo not allowed after io command'),
      'error: scale factor must be positive', 'error: usage: undo', 'error: nothing to redo',
      'error: unknown shape type: box (is the plugin loaded?)', 'error: undo not allowed after io command',
      'error: nothing to undo', 'error: undo not allowed after io command',
    ]);
    expect(output.match(/g#g moved by \(2,3\)/g)).toHaveLength(2);
    expect(output).toContain('read <file.svg> — load SVG as the current document');
    expect(output).toContain('g#new deleted\ng#new created');
  });
});
