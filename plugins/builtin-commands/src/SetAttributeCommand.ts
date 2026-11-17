import type { ChangeSet } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { NodeEditCommand } from '@svgframe/core';
import type { AttributeOperation } from '@svgframe/core';

export class SetAttributeCommand extends NodeEditCommand {
  readonly #attributes;
  #operation: AttributeOperation | undefined;
  public constructor(session: EditorSession, id: string, private readonly attribute: string, private readonly value: string | number) {
    super(session, id);
    this.#attributes = session.attributes;
  }
  protected plan(node: SvgNode): ChangeSet {
    const operation = this.#attributes.resolve(node, this.attribute, this.value);
    this.#operation = operation;
    return operation.change;
  }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    const feedback = this.#operation?.feedback;
    if (feedback) return Object.freeze({ kind: 'lines', lines: undo ? feedback.undone : feedback.applied });
    return Object.freeze({ kind: 'updated', node: this.reference(node), attribute: this.attribute, value: node.getAttributes()[this.attribute] });
  }
}
