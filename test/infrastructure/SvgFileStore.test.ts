import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SvgFileStore } from '../../src/infrastructure/svg/SvgFileStore.js';
import { SvgWriter } from '../../src/infrastructure/svg/SvgWriter.js';

describe('SvgFileStore read boundaries', () => {
  let directory: string;
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'svg-read-')); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

  it('returns a canonical absolute source path and reads UTF-8 with a BOM', () => {
    const target = join(directory, '中文.svg');
    writeFileSync(target, '\ufeff<svg width="1" height="2"><text>你好😀</text></svg>');
    const result = new SvgFileStore().read(relative(process.cwd(), target));
    expect(result.sourcePath).toBe(resolve(target));
    expect(result.document.requireById('text1').getAttributes().text).toBe('你好😀');
  });

  it('round-trips the generated demo through real files without state loss or new warnings', () => {
    const store = new SvgFileStore();
    const first = store.read(fileURLToPath(new URL('../../demo.svg', import.meta.url)));
    const target = join(directory, 'copy.svg'); store.save(first.document, target);
    const second = store.read(target);
    expect(second.document.size).toBe(8); expect(second.warnings).toEqual([]);
    const writer = new SvgWriter();
    expect(writer.serialize(second.document)).toBe(writer.serialize(first.document));
    expect(readFileSync(target, 'utf8')).toContain('处理数据 v2');
  });

  it.each([Buffer.from([0xff, 0xfe, 0x3c, 0]), Buffer.from([0xc3, 0x28])])('rejects invalid UTF-8 without replacing it', bytes => {
    const target = join(directory, 'invalid.svg'); writeFileSync(target, bytes);
    expect(() => new SvgFileStore().read(target)).toThrow('input must be UTF-8');
  });

  it('maps unreadable files to the required error and keeps malformed XML distinct', () => {
    const store = new SvgFileStore(); const missing = join(directory, 'missing.svg');
    expect(() => store.read(missing)).toThrow(`cannot read file: ${missing}`);
    const bad = join(directory, 'bad.svg'); writeFileSync(bad, '<svg');
    expect(() => store.read(bad)).toThrow('invalid SVG:');
  });
});
