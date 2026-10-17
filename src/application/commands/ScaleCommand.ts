import type { ChangeSet } from '../../domain/ChangeSet.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import { SvgNumber } from '../../domain/SvgNumber.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import { NodeEditCommand } from './NodeEditCommand.js';

export class ScaleCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string, private readonly factor: string | number) { super(session, id); }
  protected plan(node: SvgNode): ChangeSet { return node.planScale(SvgNumber.parse(this.factor, 'scale factor')); }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    return Object.freeze({ kind: 'scaled', node: this.reference(node), factor: SvgNumber.parse(this.factor, 'scale factor'), undo });
  }
}
