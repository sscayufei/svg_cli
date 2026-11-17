import type { SvgNode } from '../domain/SvgNode.js';
import { ChangeSet } from '../domain/ChangeSet.js';
import type { AttributeHandler, OperationFeedback } from '../extensions/Contracts.js';
import { ExtensionRegistry } from '../extensions/ExtensionRegistry.js';
import { OutputLines } from './OutputLines.js';
import { EditTransaction } from './EditTransaction.js';

export interface AttributeOperation { readonly change: ChangeSet; readonly feedback: OperationFeedback | undefined }

export class AttributeService {
  public constructor(private readonly handlers = new ExtensionRegistry<AttributeHandler>('attributes')) {}
  public plan(node: SvgNode, attribute: string, value: string | number): ChangeSet {
    return this.resolve(node, attribute, value).change;
  }
  public resolve(node: SvgNode, attribute: string, value: string | number): AttributeOperation {
    const view = EditTransaction.view(node);
    const matches = this.handlers.values().filter(handler => handler.handles(view, attribute));
    if (matches.length > 1) throw new Error(`attribute handler conflict: ${matches.map(handler => handler.name).join(', ')}`);
    const handler = matches[0];
    if (!handler) return Object.freeze({ change: node.planSetAttribute(attribute, value), feedback: undefined });
    const document = node.document;
    if (!document) throw new Error('attribute handler target must belong to a document');
    let record: ChangeSet | undefined;
    let feedback: OperationFeedback | undefined;
    const change = new ChangeSet([{
      apply: () => {
        if (record) { record.apply(); return; }
        const transaction = new EditTransaction(document);
        try {
          const response = handler.apply(view, attribute, value, transaction.edits);
          const prepared = response === undefined ? undefined : Object.freeze({ applied: OutputLines.copy(response.applied), undone: OutputLines.copy(response.undone) });
          document.verifyInvariants();
          record = transaction.commit();
          feedback = prepared;
        } catch (error) { transaction.rollback(); throw error; }
      },
      revert: () => { if (!record) throw new Error('attribute operation is not applied'); record.revert(); },
    }]);
    return Object.freeze({ change, get feedback() { return feedback; } });
  }
}
