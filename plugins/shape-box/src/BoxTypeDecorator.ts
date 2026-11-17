import type { TreeDecorator, TreeRow } from '@svgframe/core';

export class BoxTypeDecorator implements TreeDecorator {
  public readonly name = 'box-type-label';
  public decorate(row: TreeRow): string | undefined { return row.node?.semanticType === 'box' ? '(box)' : undefined; }
}
