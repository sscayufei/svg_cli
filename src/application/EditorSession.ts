import { SvgDocument } from '../domain/SvgDocument.js';

/** Receiver for document lifecycle; contains no UI, file I/O or history stack. */
export class EditorSession {
  #document: SvgDocument | null = null;
  #sourcePath: string | null = null;

  public get sourcePath(): string | null { return this.#sourcePath; }

  public initialize(width = 800, height = 600): SvgDocument {
    const candidate = new SvgDocument(width, height);
    this.#document = candidate;
    this.#sourcePath = null;
    return candidate;
  }

  public load(candidate: SvgDocument, sourcePath: string): void {
    candidate.verifyInvariants();
    if (sourcePath.length === 0) throw new Error('read source path must not be empty');
    this.#document = candidate;
    this.#sourcePath = sourcePath;
  }

  public requireDocument(): SvgDocument {
    if (this.#document === null) {
      throw new Error("no document. use 'init' or 'read' first");
    }
    return this.#document;
  }
}
