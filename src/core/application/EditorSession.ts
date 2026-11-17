import { SvgDocument } from '../domain/SvgDocument.js';
import { ShapeFactory } from './ShapeFactory.js';
import { AttributeService } from './AttributeService.js';
import { ExtensionRegistry } from '../extensions/ExtensionRegistry.js';
import type { TreeDecorator } from '../extensions/Contracts.js';
import { SceneQuery } from './SceneQuery.js';
import { SessionEvents } from './SessionEvents.js';
import type { SessionSnapshot } from './SceneSnapshot.js';

/** Receiver for document lifecycle; contains no UI, file I/O or history stack. */
export class EditorSession {
  public readonly events = new SessionEvents(() => this.snapshot());
  public constructor(
    private readonly shapeFactory = new ShapeFactory(),
    private readonly attributeService = new AttributeService(),
    private readonly treeDecorators = new ExtensionRegistry<TreeDecorator>('decorators'),
  ) {}
  public get shapes(): ShapeFactory { return this.shapeFactory; }
  public get attributes(): AttributeService { return this.attributeService; }
  public get decorators(): ExtensionRegistry<TreeDecorator> { return this.treeDecorators; }
  #document: SvgDocument | null = null;
  #sourcePath: string | null = null;

  public get sourcePath(): string | null { return this.#sourcePath; }

  public snapshot(): SessionSnapshot {
    return Object.freeze({ sourcePath: this.#sourcePath,
      document: this.#document === null ? null : new SceneQuery().scene(this.#document) });
  }

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
