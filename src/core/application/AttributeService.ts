import type { SvgNode } from '../domain/SvgNode.js';
import { ChangeSet } from '../domain/ChangeSet.js';
import type { AttributeHandler, OperationFeedback } from '../extensions/Contracts.js';
import { ExtensionRegistry } from '../extensions/ExtensionRegistry.js';
import { OutputLines } from './OutputLines.js';

export interface AttributeOperation { readonly change: ChangeSet; readonly feedback: OperationFeedback | undefined }

export class AttributeService {
  public constructor(private readonly handlers = new ExtensionRegistry<AttributeHandler>('attributes')) {}
  public plan(node: SvgNode, attribute: string, value: string | number): ChangeSet {
    return this.resolve(node, attribute, value).change;
  }
  public resolve(node: SvgNode, attribute: string, value: string | number): AttributeOperation {
    const view = Object.freeze({ id: node.id, semanticType: node.type, isContainer: node.isContainer, attributes: node.getAttributes() });
    const matches = this.handlers.values().filter(handler => handler.handles(view, attribute));
    if (matches.length > 1) throw new Error(`attribute handler conflict: ${matches.map(handler => handler.name).join(', ')}`);
    const handler = matches[0];
    const change = handler ? handler.plan(node, attribute, value) : node.planSetAttribute(attribute, value);
    if (!(change instanceof ChangeSet)) throw new Error(`invalid attribute handler result: ${handler?.name}`);
    const feedback = handler?.feedback?.(node, attribute, value);
    return Object.freeze({ change, feedback: feedback === undefined ? undefined : Object.freeze({ applied: OutputLines.copy(feedback.applied), undone: OutputLines.copy(feedback.undone) }) });
  }
}
