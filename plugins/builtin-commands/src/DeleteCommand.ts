import type { ChangeSet } from '@svgframe/core';
import type { SvgDocument } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { NodeEditCommand } from '@svgframe/core';

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
