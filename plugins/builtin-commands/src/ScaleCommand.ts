import type { ChangeSet } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';
import { SvgNumber } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { NodeEditCommand } from '@svgframe/core';

export class ScaleCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string, private readonly factor: string | number) { super(session, id); }
  protected plan(node: SvgNode): ChangeSet { return node.planScale(SvgNumber.parse(this.factor, 'scale factor')); }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    return Object.freeze({ kind: 'scaled', node: this.reference(node), factor: SvgNumber.parse(this.factor, 'scale factor'), undo });
  }
}
