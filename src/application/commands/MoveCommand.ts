import type { ChangeSet } from '../../domain/ChangeSet.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import { SvgNumber } from '../../domain/SvgNumber.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import { NodeEditCommand } from './NodeEditCommand.js';

export class MoveCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string, private readonly dx: string | number, private readonly dy: string | number) {
    super(session, id);
  }
  protected plan(node: SvgNode): ChangeSet {
    return node.planMove(SvgNumber.parse(this.dx, 'dx'), SvgNumber.parse(this.dy, 'dy'));
  }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    return Object.freeze({ kind: 'moved', node: this.reference(node), position: node.getPosition(), undo,
      dx: SvgNumber.parse(this.dx, 'dx') * (undo ? -1 : 1), dy: SvgNumber.parse(this.dy, 'dy') * (undo ? -1 : 1) });
  }
}
