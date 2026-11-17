import { ChangeSet } from '../domain/ChangeSet.js';
import type { SvgDocument } from '../domain/SvgDocument.js';
import type { SvgNode } from '../domain/SvgNode.js';
import type { AttributeTarget, AttributeEdits } from '../extensions/Contracts.js';

/** Scoped attribute edits. No writable model objects or arbitrary callback steps escape. */
export class EditTransaction {
  readonly #changes: ChangeSet[] = [];
  #closed = false;
  public constructor(private readonly document: SvgDocument) {}
  public get edits(): AttributeEdits {
    return Object.freeze({ read: (id: string) => this.read(id), setAttribute: (id: string, attribute: string, value: string | number) => this.setAttribute(id, attribute, value) });
  }
  public static view(node: SvgNode): AttributeTarget {
    return Object.freeze({ id: node.id, semanticType: node.type, isContainer: node.isContainer, attributes: Object.freeze({ ...node.getAttributes() }),
      children: Object.freeze(node.children.map(child => Object.freeze({ id: child.id, semanticType: child.type }))) });
  }
  public read(id: string): AttributeTarget { this.check(); return EditTransaction.view(this.document.requireById(id)); }
  public setAttribute(id: string, attribute: string, value: string | number): void {
    this.check();
    const change = this.document.requireById(id).planSetAttribute(attribute, value);
    change.apply();
    this.#changes.push(change);
  }
  public commit(): ChangeSet {
    this.check();
    const result = ChangeSet.fromApplied(this.#changes);
    this.#closed = true;
    return result;
  }
  public rollback(): void {
    if (this.#closed) throw new Error('transaction is closed');
    for (const change of this.#changes.toReversed()) change.revert();
    this.#closed = true;
  }
  private check(): void { if (this.#closed) throw new Error('transaction is closed'); }
}
