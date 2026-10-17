import type { ChangeSet } from '../../domain/ChangeSet.js';
import { SceneEditor } from '../../domain/SceneEditor.js';
import type { SvgDocument } from '../../domain/SvgDocument.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import { NodeEditCommand } from './NodeEditCommand.js';

export class FrontCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string) { super(session, id); }
  protected plan(node: SvgNode, document: SvgDocument): ChangeSet { return new SceneEditor(document).planFront(node.id); }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    return Object.freeze({ kind: 'ordered', node: this.reference(node), direction: 'front', undo });
  }
}
