import type { SvgAttributes, SvgGeometry, SvgGeometryDescription } from '../domain/SvgAttributes.js';

export interface NodeReference {
  readonly id: string;
  readonly type: string;
}

export interface NodeSnapshot extends NodeReference {
  readonly semanticType: string;
  readonly displayType: string;
  readonly isContainer: boolean;
  readonly parent: NodeReference | null;
  readonly geometry: SvgGeometry;
  readonly description: SvgGeometryDescription;
  readonly attributes: SvgAttributes;
}

export interface TreeEntry {
  readonly suffixes?: readonly string[];
  readonly node: NodeSnapshot;
  readonly depth: number;
  readonly last: boolean;
}

export interface TreeSnapshot {
  readonly rootSuffixes?: readonly string[];
  readonly canvas: { readonly width: number; readonly height: number } | null;
  readonly entries: readonly TreeEntry[];
}
