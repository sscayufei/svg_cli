import { describe, expect, it } from 'vitest';
import { ExtensionRegistry, type CommandDefinition, type DirectoryEntry, type DirectoryPort } from '@svgframe/core';
import { DirCommand } from '../src/DirCommand.js';
import { DirCommandDefinition } from '../src/DirCommandDefinition.js';
import { DirPlugin } from '../src/DirPlugin.js';

function directory(entries: readonly DirectoryEntry[]): DirectoryPort {
  return { path: '/fixture', read: () => entries };
}
describe('dir with only an injected directory port', () => {
  it('registers a query and its help with no session or filesystem dependency', () => {
    const commands = new ExtensionRegistry<CommandDefinition>('commands');
    new DirPlugin().activate({ commands, directory: directory([]) });
    expect(commands.values()).toHaveLength(1);
    expect(commands.get('dir')).toMatchObject({ name: 'dir', syntax: 'dir', description: 'list the current working directory' });
    expect(commands.get('dir')!.build([]).kind).toBe('query');
  });
  it.each([false, true])('rejects arguments before listing (quoted=%s)', quoted => {
    const port: DirectoryPort = { path: '/fixture', read: () => { throw new Error('must not read'); } };
    expect(() => new DirCommandDefinition(port).build([{ value: '', quoted }])).toThrow('usage: dir');
  });
  it('returns the exact empty-directory line', () => {
    const result = new DirCommand(directory([])).execute();
    expect(result).toEqual({ kind: 'lines', lines: ['(empty directory)'] });
    expect(Object.isFrozen(result)).toBe(true); if (result.kind === 'lines') expect(Object.isFrozen(result.lines)).toBe(true);
  });
  it('groups directories, files, links and other items and sorts each by JS string order', () => {
    const entries: readonly DirectoryEntry[] = Object.freeze([
      { name: 'z-device', kind: 'other' }, { name: 'z-link', kind: 'link' }, { name: 'alpha.txt', kind: 'file' },
      { name: 'docs', kind: 'directory' }, { name: 'A-link', kind: 'link' }, { name: '.hidden', kind: 'file' },
      { name: 'Beta', kind: 'directory' }, { name: 'Z.txt', kind: 'file' }, { name: 'a-device', kind: 'other' },
      { name: '.hidden-dir', kind: 'directory' }, { name: '中文 文件.svg', kind: 'file' },
    ].map(entry => Object.freeze(entry as DirectoryEntry)));
    const expected = ['[DIR]  .hidden-dir', '[DIR]  Beta', '[DIR]  docs', '[FILE]  .hidden', '[FILE]  Z.txt',
      '[FILE]  alpha.txt', '[FILE]  中文 文件.svg', '[LINK]  A-link', '[LINK]  z-link', '[OTHER]  a-device', '[OTHER]  z-device'];
    const original = [...entries]; const port = directory(entries);
    expect(new DirCommand(port).execute()).toEqual({ kind: 'lines', lines: expected });
    expect(new DirCommand(directory([...entries].reverse())).execute()).toEqual({ kind: 'lines', lines: expected });
    expect(new DirCommand(port).execute()).toEqual({ kind: 'lines', lines: expected }); expect(entries).toEqual(original);
  });
  it('excludes dot entries without excluding hidden children', () => {
    expect(new DirCommand(directory([{ name: '.', kind: 'directory' }, { name: '..', kind: 'directory' }, { name: '.hidden', kind: 'file' }])).execute()).toEqual({ kind: 'lines', lines: ['[FILE]  .hidden'] });
    expect(new DirCommand(directory([{ name: '.', kind: 'directory' }, { name: '..', kind: 'directory' }])).execute()).toEqual({ kind: 'lines', lines: ['(empty directory)'] });
  });
  it.each([new Error('access denied'), 'backend failed'])('uses the exact port path for a read failure (%j)', reason => {
    const port: DirectoryPort = { path: 'D:/中文 路径/missing', read: () => { throw reason; } };
    expect(() => new DirCommand(port).execute()).toThrow('cannot read directory: D:/中文 路径/missing');
  });
  it('reads on each execution and can recover after a backend failure', () => {
    let unavailable = true;
    const command = new DirCommand({ path: '/fixture', read: () => { if (unavailable) throw new Error('temporary'); return [{ name: 'ready', kind: 'file' }]; } });
    expect(() => command.execute()).toThrow('cannot read directory: /fixture');
    unavailable = false; expect(command.execute()).toEqual({ kind: 'lines', lines: ['[FILE]  ready'] });
  });
});
