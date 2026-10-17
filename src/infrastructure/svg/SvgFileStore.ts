import type { SvgSavePort } from '../../application/ports/SvgSavePort.js';
import type { SvgReadPort, SvgReadResult } from '../../application/ports/SvgReadPort.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { AtomicFileWriter } from './AtomicFileWriter.js';
import { SvgWriter } from './SvgWriter.js';
import { SvgReader } from './SvgReader.js';

/** File adapter: complete reads in a candidate; serialize before any write. */
export class SvgFileStore implements SvgSavePort, SvgReadPort {
  public constructor(
    private readonly writer = new SvgWriter(), private readonly files = new AtomicFileWriter(), private readonly reader = new SvgReader(),
  ) {}

  public read(path: string): SvgReadResult {
    let bytes: Buffer;
    const sourcePath = resolve(path);
    try {
      bytes = readFileSync(sourcePath);
    } catch {
      throw new Error(`cannot read file: ${path}`);
    }
    let xml: string;
    try {
      xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      throw new Error('invalid SVG: input must be UTF-8');
    }
    return Object.freeze({ ...this.reader.parse(xml), sourcePath });
  }

  public save(document: SvgDocument, path: string): void {
    const content = this.writer.serialize(document);
    this.files.write(path, content);
  }
}
