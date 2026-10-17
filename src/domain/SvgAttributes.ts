/** Read-only value snapshots; these objects never expose a node's backing state. */
export type SvgAttributes = Readonly<Record<string, string | number>>;
export type SvgGeometry = Readonly<Record<string, number>>;

/** Geometric meaning only; no CLI or XML syntax. */
export type SvgGeometryDescription =
  | { readonly kind: 'properties'; readonly values: SvgGeometry }
  | { readonly kind: 'point'; readonly x: number; readonly y: number }
  | { readonly kind: 'segment'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number };

export interface SvgStyle {
  readonly fill?: string;
  readonly stroke?: string;
  readonly 'stroke-width'?: number;
}
