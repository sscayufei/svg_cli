import type { ChangeSet } from '@svgframe/core';
import { SceneEditor } from '@svgframe/core';
import type { SvgDocument } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { NodeEditCommand } from '@svgframe/core';

export class AddToCommand extends NodeEditCommand {
  public constructor(session: EditorSession, private readonly containerId: string, id: string) { super(session, id); }
  protected plan(node: SvgNode, document: SvgDocument): ChangeSet { return new SceneEditor(document).planAddTo(this.containerId, node.id); }
  protected result(node: SvgNode): CommandResult {
    const parent = node.parent;
    return Object.freeze({ kind: 'reparented', node: this.reference(node),
      parent: parent !== null && 'id' in parent ? Object.freeze({ id: parent.id, type: parent.type }) : null });
  }
}
