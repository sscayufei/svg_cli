import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CommandExecutor, type DirectoryPort } from '@svgframe/core';
import { InitCommand, ReadCommand, SaveCommand } from '@svgframe/builtin-commands';
import { NodeDirectoryAdapter } from '../../src/host/filesystem/NodeDirectoryAdapter.js';
import { createApplication } from '../../src/host/composition.js';
const temporary = resolve(import.meta.dirname, '../../.tmp/phase2'); mkdirSync(temporary, { recursive: true });
describe('Directory port and Node adapter', () => {
  it('lists direct entries including hidden files and directory links without following links or changing cwd', () => {
    const directory = mkdtempSync(resolve(temporary, 'directory-')); mkdirSync(resolve(directory, 'folder')); writeFileSync(resolve(directory, 'file'), 'data'); writeFileSync(resolve(directory, '.hidden'), 'data');
    symlinkSync(resolve(directory, 'folder'), resolve(directory, 'linked'), 'junction');
    const cwd = process.cwd(); const adapter = new NodeDirectoryAdapter(directory); const entries = adapter.read();
    expect(entries.toSorted((a,b) => a.name < b.name ? -1 : 1)).toEqual([{ name: '.hidden', kind: 'file' },{ name: 'file', kind: 'file' },{ name: 'folder', kind: 'directory' },{ name: 'linked', kind: 'link' }]);
    expect(Object.isFrozen(entries)).toBe(true); expect(entries.every(Object.isFrozen)).toBe(true); expect(process.cwd()).toBe(cwd);
  });
  it('returns an empty immutable listing and wraps failure with the exact path', () => {
    const directory = mkdtempSync(resolve(temporary, 'empty-')); expect(new NodeDirectoryAdapter(directory).read()).toEqual([]);
    const missing = resolve(directory, 'missing'); expect(() => new NodeDirectoryAdapter(missing).read()).toThrow(`cannot read directory: ${missing}`);
  });
  it('injects the same replaceable service without requiring an SVG and retains its startup path across init/read/save', async () => {
    const directory = mkdtempSync(resolve(temporary, 'cwd-')); const adapter: DirectoryPort = { path: directory, read: () => [{ name: 'fixture', kind: 'other' }] };
    const app = await createApplication({ directory: adapter }); expect(app.context.directory).toBe(adapter);
    expect(app.context.directory.read()).toEqual([{ name: 'fixture', kind: 'other' }]); expect(app.context.session.snapshot().document).toBeNull();
    const executor = new CommandExecutor(app.context.history); const path = resolve(directory, 'saved.svg');
    for (const command of [new InitCommand(app.context.session), new SaveCommand(app.context.session, app.context.store, path), new ReadCommand(app.context.session, app.context.store, path)]) expect(executor.execute(command).ok).toBe(true);
    expect(app.context.directory.path).toBe(directory); app.dispose();
  });
});
