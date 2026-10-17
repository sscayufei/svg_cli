import type { SvgDocument } from '../../domain/SvgDocument.js';

/** Application-owned boundary; implementations must not mutate the document. */
export interface SvgSavePort {
  save(document: SvgDocument, path: string): void;
}
