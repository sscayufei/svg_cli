import { SvgGroup, type SvgNode, type SvgStyle } from '@svgframe/core';

/** Protected Composite: semantic identity, tree identity and XML identity remain separate. */
export class BoxShape extends SvgGroup {
  public constructor(id: string, style: SvgStyle = {}) { super(id, style); }
  public override get type(): string { return 'box'; }
  public override get displayType(): string { return 'g'; }
  public static rectId(id: string): string { return `${id}-rect`; }
  public static labelId(id: string): string { return `${id}-label`; }

  public override verifyStructure(): void {
    for (const [id, type] of [[BoxShape.rectId(this.id), 'rect'], [BoxShape.labelId(this.id), 'text']]) {
      const child = this.children.find(node => node.id === id);
      if (!child || child.type !== type || child.isContainer) throw new Error(`invalid box structure: ${this.id}`);
    }
  }
  public override assertCanRelease(child: SvgNode): void {
    if ([BoxShape.rectId(this.id), BoxShape.labelId(this.id)].includes(child.id)) throw new Error(`cannot remove required component: ${child.id}`);
  }
  public override assertCanUngroup(): void { throw new Error(`cannot ungroup composite shape: ${this.id}`); }
  public override describeSvg() {
    return Object.freeze({ tag: 'g', attributes: Object.freeze({ 'data-kind': this.type, ...this.getAttributes() }), text: undefined });
  }
}
