import type { ChangeSet } from '@svgframe/core';
import { SceneEditor } from '@svgframe/core';
import type { SvgDocument } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { NodeEditCommand } from '@svgframe/core';

export class FrontCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string) { super(session, id); }
  protected plan(node: SvgNode, document: SvgDocument): ChangeSet { return new SceneEditor(document).planFront(node.id); }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    return Object.freeze({ kind: 'ordered', node: this.reference(node), direction: 'front', undo });
  }
}
