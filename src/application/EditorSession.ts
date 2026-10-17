import { SvgDocument } from '../domain/SvgDocument.js';

/** Receiver for document lifecycle; contains no UI, file I/O or history stack. */
export class EditorSession {
  #document: SvgDocument | null = null;

  public initialize(width = 800, height = 600): SvgDocument {
    const candidate = new SvgDocument(width, height);
    this.#document = candidate;
    return candidate;
  }

  public requireDocument(): SvgDocument {
    if (this.#document === null) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.#document;
  }
}
