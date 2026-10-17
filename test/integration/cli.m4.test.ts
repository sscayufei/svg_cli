import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('M4 structural CLI transcripts', () => {
  const run = (lines: readonly string[]) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli/main.ts'], {
      cwd: fileURLToPath(new URL('../../', import.meta.url)), input: lines.join('\n'), encoding: 'utf8', timeout: 10_000,
    });
    expect(result.error).toBeUndefined(); expect(result.status, result.stderr).toBe(0);
    return { output: result.stdout.replace(/^(?:svg> )+/gm, '').trim(), errors: result.stderr.trim() };
  };

  it('groups in original order, transforms the group, ungroups, reparents and orders siblings', () => {
    const { output, errors } = run([
      'init', 'create g outer', 'create rect a 1 2 3 4 in outer', 'create circle b 5 6 7 in outer',
      'group g b a', 'move g 2 3', 'scale g 2', 'tree g', 'ungroup g', 'create g dest',
      'addto dest a', 'back b', 'front b', 'tree', 'show a',
    ]);
    expect(errors).toBe(''); expect(output).toContain('g#g created with 2 children');
    expect(output).toContain('g#g\n├── rect#a  x=6 y=10 w=6 h=8\n└── circle#b  cx=14 cy=18 r=14');
    expect(output).toContain('g#g ungrouped');
    expect(output).toContain('svg (800x600)\n├── g#outer\n│   └── circle#b  cx=14 cy=18 r=14\n└── g#dest\n    └── rect#a  x=6 y=10 w=6 h=8');
    expect(output).toContain('rect#a  parent=g#dest');
  });

  it('rejects invalid operations without leaving partial groups', () => {
    const { output, errors } = run([
      'group g a b', 'ungroup g', 'addto g a', 'front a', 'back a', 'init',
      'create g outer', 'create rect a 1 2 3 4 in outer', 'group bad a outer',
      'group bad a a', 'group bad a missing', 'group outer a outer',
      'ungroup outer', 'addto outer outer', 'addto missing a', 'front missing', 'group only a', 'tree',
    ]);
    expect(errors.split('\n')).toEqual([
      ...Array(5).fill("error: no document. use 'init' or 'read' first"),
      'error: cannot group a container into its own descendant: outer', 'error: duplicate shape id: a',
      'error: no such shape: missing', 'error: id already exists: outer',
      'error: cannot ungroup top-level container: outer',
      'error: cannot move a container into itself or its descendant: outer',
      'error: no such container: missing', 'error: no such shape: missing',
      'error: usage: group <newGid> <id1> <id2>...',
    ]);
    expect(output.endsWith('svg (800x600)\n└── g#outer\n    └── rect#a  x=1 y=2 w=3 h=4')).toBe(true);
  });
});
