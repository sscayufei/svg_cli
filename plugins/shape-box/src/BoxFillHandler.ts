import type { AttributeEdits, AttributeHandler, AttributeTarget, OperationFeedback } from '@svgframe/core';
import { BoxShape } from './BoxShape.js';

export class BoxFillHandler implements AttributeHandler {
  public readonly name = 'box-fill';
  public handles(target: AttributeTarget, attribute: string): boolean { return target.semanticType === 'box' && target.isContainer && attribute === 'fill'; }
  public apply(target: AttributeTarget, _attribute: string, value: string | number, edits: AttributeEdits): OperationFeedback {
    const id = BoxShape.rectId(target.id);
    if (!target.children.some(child => child.id === id && child.semanticType === 'rect')) throw new Error(`invalid box structure: ${target.id}`);
    const before = edits.read(id).attributes.fill;
    edits.setAttribute(id, 'fill', value);
    return { applied: [`box#${target.id} fill propagated to ${id}`], undone: [`box#${target.id} fill restored: ${before === undefined ? '(unset)' : JSON.stringify(before)}`] };
  }
}
