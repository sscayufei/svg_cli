import type { SvgDocument } from '@svgframe/core';
import type { SvgGroup } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { EditCommand } from '@svgframe/core';

interface CreationRecord {
  readonly feedback: readonly string[] | undefined;
  readonly document: SvgDocument;
  readonly node: SvgNode;
  readonly parent: SvgGroup | null;
  readonly index: number;
}

export class CreateCommand extends EditCommand {
  readonly #parameters: readonly string[];
  #record: CreationRecord | null = null;
  #state: 'new' | 'applied' | 'undone' = 'new';

  public constructor(
    private readonly session: EditorSession,
    private readonly type: string,
    private readonly id: string,
    parameters: readonly string[],
    private readonly containerId?: string,
  ) {
    super();
    this.#parameters = Object.freeze([...parameters]);
  }

  public execute(): CommandResult {
    if (this.#state !== 'new') throw new Error('command has already been executed');
    const document = this.session.requireDocument();
    const parent = this.containerId === undefined ? null : document.requireContainer(this.containerId);
    const node = this.session.shapes.create(this.type, this.id, this.#parameters);
    const feedback = this.session.shapes.creationFeedback(node, parent);
    const index = parent === null ? document.children.length : parent.children.length;
    document.insert(node, index, parent);
    this.#record = Object.freeze({ document, node, parent, index, feedback });
    this.#state = 'applied';
    return this.createdResult(this.#record);
  }

  public undo(): CommandResult {
    const record = this.activeRecord('applied');
    if (record.document.findById(record.node.id) !== record.node) {
      throw new Error('created node no longer belongs to this document');
    }
    record.document.remove(record.node.id);
    this.#state = 'undone';
    return Object.freeze({ kind: 'deleted', node: Object.freeze({ id: record.node.id, type: record.node.type }) });
  }

  public redo(): CommandResult {
    const record = this.activeRecord('undone');
    record.document.insert(record.node, record.index, record.parent);
    this.#state = 'applied';
    return this.createdResult(record);
  }

  private activeRecord(state: 'applied' | 'undone'): CreationRecord {
    if (this.#state !== state || this.#record === null) throw new Error(`command is not ${state}`);
    if (this.session.requireDocument() !== this.#record.document) {
      throw new Error('command belongs to a different document');
    }
    return this.#record;
  }

  private createdResult(record: CreationRecord): CommandResult {
    if (record.feedback !== undefined) return Object.freeze({ kind: 'lines', lines: record.feedback });
    return Object.freeze({
      kind: 'created', node: Object.freeze({ id: record.node.id, type: record.node.type }),
      parent: record.parent === null ? null : Object.freeze({ id: record.parent.id, type: record.parent.type }),
    });
  }
}
