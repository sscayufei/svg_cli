import type { SvgNode } from '../../domain/SvgNode.js';

/** Composite providers can request basic nodes without importing concrete shape packages. */
export interface ShapeConstructionPort {
  create(type: string, id: string, args: readonly string[]): SvgNode;
}
