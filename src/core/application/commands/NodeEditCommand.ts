import type { ChangeSet } from '../../domain/ChangeSet.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import type { NodeReference } from '../SceneSnapshot.js';
import { EditCommand } from './EditCommand.js';

interface EditRecord {
  readonly document: SvgDocument;
  readonly node: SvgNode;
  readonly change: ChangeSet;
  readonly appliedOwner: SvgDocument | null;
}

/** Shared lifecycle for local edits; business rules remain in domain receivers. */
export abstract class NodeEditCommand extends EditCommand {
  #record: EditRecord | null = null;
  #state: 'new' | 'applied' | 'undone' = 'new';

  protected constructor(private readonly session: EditorSession, private readonly id: string) { super(); }

  public execute(): CommandResult {
    if (this.#state !== 'new') throw new Error('command has already been executed');
    const document = this.session.requireDocument();
    const node = document.requireById(this.id);
    const change = this.plan(node, document);
    change.apply();
    this.#record = Object.freeze({ document, node, change, appliedOwner: node.document });
    this.#state = 'applied';
    return this.result(node, false);
  }

  public undo(): CommandResult {
    const record = this.activeRecord('applied');
    record.change.revert();
    this.#state = 'undone';
    return this.result(record.node, true);
  }

  public redo(): CommandResult {
    const record = this.activeRecord('undone');
    record.change.apply();
    this.#state = 'applied';
    return this.result(record.node, false);
  }

  protected abstract plan(node: SvgNode, document: SvgDocument): ChangeSet;
  protected abstract result(node: SvgNode, undo: boolean): CommandResult;
  protected reference(node: SvgNode): NodeReference { return Object.freeze({ id: node.id, type: node.type }); }

  private activeRecord(state: 'applied' | 'undone'): EditRecord {
    if (this.#record === null || this.#state !== state) throw new Error(`command is not ${state}`);
    const record = this.#record;
    if (this.session.requireDocument() !== record.document) throw new Error('command belongs to a different document');
    const owner = state === 'applied' ? record.appliedOwner : record.document;
    if (record.node.document !== owner || (owner !== null && owner.findById(record.node.id) !== record.node)) {
      throw new Error('edited node ownership changed');
    }
    return record;
  }
}
