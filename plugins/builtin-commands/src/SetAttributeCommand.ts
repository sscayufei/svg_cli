import type { ChangeSet } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { NodeEditCommand } from '@svgframe/core';
import type { OperationFeedback } from '@svgframe/core';

export class SetAttributeCommand extends NodeEditCommand {
  readonly #attributes;
  #feedback: OperationFeedback | undefined;
  public constructor(session: EditorSession, id: string, private readonly attribute: string, private readonly value: string | number) {
    super(session, id);
    this.#attributes = session.attributes;
  }
  protected plan(node: SvgNode): ChangeSet {
    const operation = this.#attributes.resolve(node, this.attribute, this.value);
    this.#feedback = operation.feedback;
    return operation.change;
  }
  protected result(node: SvgNode, undo: boolean): CommandResult {
    if (this.#feedback) return Object.freeze({ kind: 'lines', lines: undo ? this.#feedback.undone : this.#feedback.applied });
    return Object.freeze({ kind: 'updated', node: this.reference(node), attribute: this.attribute, value: node.getAttributes()[this.attribute] });
  }
}
