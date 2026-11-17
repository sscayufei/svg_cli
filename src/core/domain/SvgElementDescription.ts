/** XML representation is independent of semantic type and tree display type. */
export interface SvgElementDescription {
  readonly tag: string;
  readonly attributes: Readonly<Record<string, string | number>>;
  readonly text: string | undefined;
}
