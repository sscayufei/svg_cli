import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('M2 CLI transcripts', () => {
  const run = (lines: readonly string[]) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli/main.ts'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)),
      input: lines.join('\n'), encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    return { output: result.stdout.replace(/^(?:svg> )+/gm, '').trim(), errors: result.stderr.trim() };
  };

  it('creates all six types in a nested tree and shows geometry, style and exact parent', () => {
    const { output, errors } = run([
      'init', 'create g scene', 'create g node in scene',
      'create rect r 1 2 3 4 #abc in node',
      'create text t 5 6 "hello 世界" in node',
      'create circle c 10 20 3 red in scene',
      'create ellipse e 10 20 3 4 in scene',
      'create line l 0 1 2 3 black in scene',
      'tree', 'show c', 'show r', 'tree node',
    ]);
    expect(errors).toBe('');
    expect(output).toContain('rect#r created in g#node');
    expect(output).toContain([
      'svg (800x600)', '└── g#scene', '    ├── g#node',
      '    │   ├── rect#r  x=1 y=2 w=3 h=4 fill=#abc',
      '    │   └── text#t  (5,6) "hello 世界"',
      '    ├── circle#c  cx=10 cy=20 r=3 fill=red',
      '    ├── ellipse#e  cx=10 cy=20 rx=3 ry=4',
      '    └── line#l  (0,1) -> (2,3) stroke=black',
    ].join('\n'));
    expect(output).toContain('circle#c  parent=g#scene\n  cx=10 cy=20 r=3\n  fill=red');
    expect(output).toContain('rect#r  parent=g#node\n  x=1 y=2 width=3 height=4\n  fill=#abc');
    expect(output).toContain('g#node\n├── rect#r  x=1 y=2 w=3 h=4 fill=#abc\n└── text#t  (5,6) "hello 世界"');
  });

  it('requires a document for supported document-dependent commands but allows help', () => {
    const { output, errors } = run(['canvas', 'tree', 'show r', 'create g g', 'help']);
    expect(errors.split('\n')).toEqual(Array(4).fill("error: no document. use 'init' or 'read' first"));
    expect(output).toContain('create <type> <id>');
    expect(output).toContain('Not implemented in M2:');
  });

  it('rejects failed creations without leaving nodes or partially created containers', () => {
    const { output, errors } = run([
      'init', 'create rect r 0 0 1 1', 'create circle r 1 2 3',
      'create g bad in missing', 'create g bad in r', 'create box b 0 0 1 1 "box"',
      'create circle bad 0 0 NaN', 'create circle bad 0 0 -1', 'tree',
    ]);
    expect(errors.split('\n')).toEqual([
      'error: id already exists: r', 'error: no such container: missing',
      'error: not a container: r',
      'error: unknown shape type: box (is the plugin loaded?)',
      'error: r must be a finite number', 'error: r must be non-negative',
    ]);
    expect(output.endsWith('svg (800x600)\n└── rect#r  x=0 y=0 w=1 h=1')).toBe(true);
  });

  it('keeps quoted in/empty text distinct from the unquoted parent clause', () => {
    const { output, errors } = run([
      'init', 'create g in', 'create text t 0 0 "in" in "in"',
      'create text empty 1 2 "" in in', 'tree in',
    ]);
    expect(errors).toBe('');
    expect(output).toContain('g#in\n├── text#t  (0,0) "in"\n└── text#empty  (1,2) ""');
  });

  it('handles canvas resize atomically and preserves an existing scene after invalid init', () => {
    const { output, errors } = run([
      'init 400', 'canvas', 'create g keep', 'canvas 200 150',
      'canvas 100', 'canvas 100 -1', 'init NaN 300', 'canvas', 'tree',
    ]);
    expect(output).toContain('canvas 400x600 created');
    expect(output).toContain('canvas 200x150 resized');
    expect(output.endsWith('canvas 200x150\nsvg (200x150)\n└── g#keep')).toBe(true);
    expect(errors.split('\n')).toEqual([
      'error: usage: canvas [w h]', 'error: canvas dimensions must be finite and positive',
      'error: width must be a finite number',
    ]);
  });

  it('rejects malformed syntax/numbers and keeps help available after errors', () => {
    const { output, errors } = run([
      'init', 'create text t 0 0 "unclosed', 'create g extra unexpected',
      'create rect r 1px 0 1 1', 'create circle c 0 0 ""',
      'tree missing', 'show missing', 'tree a b', 'init 1 2 3', 'help',
    ]);
    expect(errors.split('\n')).toHaveLength(8);
    expect(errors).toContain('error: unterminated quoted argument');
    expect(errors).toContain('error: x must be a finite number');
    expect(errors).toContain('error: r must be a finite number');
    expect(errors).toContain('error: no such shape: missing');
    expect(output).toContain('help — show command syntax');
  });

  it('accepts decimal/exponent coordinates and keeps IDs case-sensitive and text escaped', () => {
    const { output, errors } = run([
      'init 1e3 6e2', 'create rect R -.5 +.25 0 1e1', 'create circle r +1 -2 0',
      String.raw`create text t 1.5 -2 "say \"hi\" C:\tmp"`, 'show t', 'tree',
    ]);
    expect(errors).toBe('');
    expect(output).toContain('canvas 1000x600 created');
    expect(output).toContain('rect#R  x=-0.5 y=0.25 w=0 h=10');
    expect(output).toContain('circle#r  cx=1 cy=-2 r=0');
    expect(output).toContain(`text#t  parent=svg\n  x=1.5 y=-2\n  text=${JSON.stringify(String.raw`say "hi" C:\tmp`)}`);
  });

  it('formats continuation branches correctly across multiple root siblings', () => {
    const { output, errors } = run([
      'init', 'create g a', 'create g nested in a', 'create text t 0 0 "label" in nested',
      'create g b', 'create rect root 0 0 1 1', 'tree', 'show b',
    ]);
    expect(errors).toBe('');
    expect(output).toContain([
      'svg (800x600)', '├── g#a', '│   └── g#nested',
      '│       └── text#t  (0,0) "label"', '├── g#b', '└── rect#root  x=0 y=0 w=1 h=1',
    ].join('\n'));
    expect(output.endsWith('g#b  parent=svg')).toBe(true);
  });
});
