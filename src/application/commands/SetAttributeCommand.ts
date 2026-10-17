import type { ChangeSet } from '../../domain/ChangeSet.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import { NodeEditCommand } from './NodeEditCommand.js';

export class SetAttributeCommand extends NodeEditCommand {
  public constructor(session: EditorSession, id: string, private readonly attribute: string, private readonly value: string | number) {
    super(session, id);
  }
  protected plan(node: SvgNode): ChangeSet { return node.planSetAttribute(this.attribute, this.value); }
  protected result(node: SvgNode): CommandResult {
    return Object.freeze({ kind: 'updated', node: this.reference(node), attribute: this.attribute, value: node.getAttributes()[this.attribute] });
  }
}
