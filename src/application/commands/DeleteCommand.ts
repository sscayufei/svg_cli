import type { ChangeSet } from '../../domain/ChangeSet.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import { NodeEditCommand } from './NodeEditCommand.js';

export class DeleteCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string) { super(session, id); }
  protected plan(node: SvgNode, document: SvgDocument): ChangeSet { return document.planDelete(node.id); }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    if (!undo) return Object.freeze({ kind: 'deleted', node: this.reference(node) });
    const parent = node.parent;
    return Object.freeze({ kind: 'restored', node: this.reference(node),
      parent: parent !== null && 'id' in parent ? Object.freeze({ id: parent.id, type: parent.type }) : null });
  }
}
