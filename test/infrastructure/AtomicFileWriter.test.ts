import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtomicFileWriter } from '../../src/infrastructure/svg/AtomicFileWriter.js';

describe('AtomicFileWriter on the real filesystem', () => {
  let directory: string;
  beforeEach(() => { directory = fs.mkdtempSync(join(tmpdir(), 'svg-save-')); });
  afterEach(() => { fs.rmSync(directory, { recursive: true, force: true }); });

  it('creates and replaces UTF-8 files, including Unicode paths, without leaving temporary files', () => {
    const target = join(directory, '绘图 with spaces.svg'); const writer = new AtomicFileWriter();
    writer.write(target, '开始😀'); expect(fs.readFileSync(target, 'utf8')).toBe('开始😀');
    writer.write(target, '替换'); expect(fs.readFileSync(target, 'utf8')).toBe('替换');
    expect(fs.readdirSync(directory)).toEqual(['绘图 with spaces.svg']);
  });

  it('preserves an existing file and removes a partially written temporary file after write failure', () => {
    const target = join(directory, 'original.svg'); fs.writeFileSync(target, 'original');
    const writer = new AtomicFileWriter({ ...fs, writeFileSync: (file: number) => {
      fs.writeFileSync(file, 'partial'); throw new Error('disk full');
    } });
    expect(() => writer.write(target, 'replacement')).toThrow('disk full');
    expect(fs.readFileSync(target, 'utf8')).toBe('original');
    expect(fs.readdirSync(directory)).toEqual(['original.svg']);
  });

  it('preserves the target and cleans up when final replacement fails', () => {
    const target = join(directory, 'original.svg'); fs.writeFileSync(target, 'original');
    const writer = new AtomicFileWriter({ ...fs, renameSync: () => { throw new Error('file locked'); } });
    expect(() => writer.write(target, 'replacement')).toThrow('file locked');
    expect(fs.readFileSync(target, 'utf8')).toBe('original');
    expect(fs.readdirSync(directory)).toEqual(['original.svg']);
  });

  it('leaves directories intact and does not create missing parents', () => {
    const writer = new AtomicFileWriter();
    expect(() => writer.write(directory, 'data')).toThrow();
    expect(fs.readdirSync(directory)).toEqual([]);
    expect(() => writer.write(join(directory, 'missing', 'out.svg'), 'data')).toThrow();
    expect(fs.readdirSync(directory)).toEqual([]);
  });
});
