import type { SvgSavePort } from '../../application/ports/SvgSavePort.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import { AtomicFileWriter } from './AtomicFileWriter.js';
import { SvgWriter } from './SvgWriter.js';

/** Outbound adapter: finish serialization before touching the filesystem. */
export class SvgFileStore implements SvgSavePort {
  public constructor(private readonly writer = new SvgWriter(), private readonly files = new AtomicFileWriter()) {}

  public save(document: SvgDocument, path: string): void {
    const content = this.writer.serialize(document);
    this.files.write(path, content);
  }
}
