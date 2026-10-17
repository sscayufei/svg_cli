import type { SvgDocument } from '../../domain/SvgDocument.js';

export interface SvgReadContent {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}

export interface SvgReadResult extends SvgReadContent {
  readonly sourcePath: string;
}

/** A fully validated candidate; the adapter never modifies the active session. */
export interface SvgReadPort {
  read(path: string): SvgReadResult;
}
