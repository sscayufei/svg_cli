import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

describe('CLI startup and EOF regression', () => {
  const projectRoot = fileURLToPath(new URL('../../', import.meta.url));

  const runCli = (input: string) => {
    const result = spawnSync(process.execPath, ['--import', 'tsx', 'src/cli/main.ts'], {
      cwd: projectRoot,
      input,
      encoding: 'utf8',
      timeout: 10_000,
    });

    expect(result.error).toBeUndefined();
    expect(result.signal).toBeNull();
    expect(result.status, result.stderr).toBe(0);
    return result;
  };

  it('prints the banner and prompt, then exits safely on immediate EOF', () => {
    const result = runCli('');

    expect(result.stdout).toContain("svg-editor 0.1 — type 'help' for commands");
    expect(result.stdout).toContain('svg> ');
    expect(result.stderr).toBe('');
  });

  it('ignores empty lines and whole-line comments with Windows line endings', () => {
    const result = runCli('\r\n   \r\n# comment\r\n  # 中文注释\r\nhelp\r\n');

    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('help — show command syntax');
    expect(result.stdout).toContain('Not implemented in M5:');
  });

  it('reports one error per unsupported input and keeps accepting help', () => {
    const result = runCli('wibble\nunknown\nhelp\n');

    expect(result.stderr.trim().split('\n')).toEqual([
      'error: unknown command: wibble',
      'error: unknown command: unknown',
    ]);
    expect(result.stdout).toContain('help — show command syntax');
  });

  it('processes the final line even when EOF is not preceded by a newline', () => {
    const result = runCli('help');

    expect(result.stdout).toContain('help — show command syntax');
    expect(result.stderr).toBe('');
  });
});
