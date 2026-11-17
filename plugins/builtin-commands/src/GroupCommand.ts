import type { ChangeSet } from '@svgframe/core';
import { SceneEditor } from '@svgframe/core';
import type { SvgDocument } from '@svgframe/core';
import type { SvgGroup } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { EditCommand } from '@svgframe/core';

interface GroupRecord { readonly document: SvgDocument; readonly node: SvgGroup; readonly change: ChangeSet; }

export class GroupCommand extends EditCommand {
  readonly #ids: readonly string[];
  #record: GroupRecord | null = null;
  #state: 'new' | 'applied' | 'undone' = 'new';
  public constructor(private readonly session: EditorSession, private readonly id: string, ids: readonly string[]) {
    super(); this.#ids = Object.freeze([...ids]);
  }
  public execute(): CommandResult {
    if (this.#state !== 'new') throw new Error('command has already been executed');
    const document = this.session.requireDocument();
    const plan = new SceneEditor(document).planGroup(this.id, this.#ids);
    plan.change.apply();
    this.#record = Object.freeze({ document, ...plan }); this.#state = 'applied';
    return this.grouped(plan.node);
  }
  public undo(): CommandResult {
    const record = this.activeRecord('applied'); record.change.revert(); this.#state = 'undone';
    return Object.freeze({ kind: 'ungrouped', node: Object.freeze({ id: record.node.id, type: record.node.type }) });
  }
  public redo(): CommandResult {
    const record = this.activeRecord('undone'); record.change.apply(); this.#state = 'applied';
    return this.grouped(record.node);
  }
  private activeRecord(state: 'applied' | 'undone'): GroupRecord {
    if (this.#record === null || this.#state !== state) throw new Error(`command is not ${state}`);
    const record = this.#record;
    if (this.session.requireDocument() !== record.document) throw new Error('command belongs to a different document');
    if (state === 'applied' ? record.document.findById(record.node.id) !== record.node : record.node.document !== null) {
      throw new Error('group ownership changed');
    }
    return record;
  }
  private grouped(node: SvgGroup): CommandResult {
    return Object.freeze({ kind: 'grouped', node: Object.freeze({ id: node.id, type: node.type }), count: node.children.length });
  }
}
