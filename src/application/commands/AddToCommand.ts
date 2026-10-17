import type { ChangeSet } from '../../domain/ChangeSet.js';
import { SceneEditor } from '../../domain/SceneEditor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import { NodeEditCommand } from './NodeEditCommand.js';

export class AddToCommand extends NodeEditCommand {
  public constructor(session: EditorSession, private readonly containerId: string, id: string) { super(session, id); }
  protected plan(node: SvgNode, document: SvgDocument): ChangeSet { return new SceneEditor(document).planAddTo(this.containerId, node.id); }
  protected result(node: SvgNode): CommandResult {
    const parent = node.parent;
    return Object.freeze({ kind: 'reparented', node: this.reference(node),
      parent: parent !== null && 'id' in parent ? Object.freeze({ id: parent.id, type: parent.type }) : null });
  }
}
