import type { AttributeEdits, AttributeHandler, AttributeTarget, OperationFeedback } from '@svgframe/core';
import { BoxShape } from './BoxShape.js';

export class BoxLabelHandler implements AttributeHandler {
  public readonly name = 'box-label';
  public handles(target: AttributeTarget, attribute: string): boolean { return target.semanticType === 'box' && target.isContainer && attribute === 'label'; }
  public apply(target: AttributeTarget, _attribute: string, value: string | number, edits: AttributeEdits): OperationFeedback {
    const id = BoxShape.labelId(target.id);
    if (!target.children.some(child => child.id === id && child.semanticType === 'text')) throw new Error(`invalid box structure: ${target.id}`);
    const before = edits.read(id).attributes.text;
    edits.setAttribute(id, 'text', value);
    return { applied: [`box#${target.id} label updated: ${JSON.stringify(String(value))}`], undone: [`box#${target.id} label restored: ${JSON.stringify(String(before ?? ''))}`] };
  }
}
