/** Read-only value snapshots; these objects never expose a node's backing state. */
export type SvgAttributes = Readonly<Record<string, string | number>>;
export type SvgGeometry = Readonly<Record<string, number>>;

export interface SvgStyle {
  readonly fill?: string;
  readonly stroke?: string;
  readonly 'stroke-width'?: number;
}
