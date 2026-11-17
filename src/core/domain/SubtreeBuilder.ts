import type { SvgNode } from './SvgNode.js';
import type { SvgGroup } from './SvgGroup.js';

export class SubtreeBuilder {
  public static assemble<T extends SvgGroup>(container: T, children: readonly SvgNode[]): T {
    container.initializeChildren(children);
    return container;
  }
}
