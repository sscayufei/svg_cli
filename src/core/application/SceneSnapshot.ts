import type { SvgAttributes, SvgGeometry, SvgGeometryDescription } from '../domain/SvgAttributes.js';

export interface NodeReference {
  readonly id: string;
  readonly type: string;
}

export interface NodeSnapshot extends NodeReference {
  readonly semanticType: string;
  readonly displayType: string;
  readonly isContainer: boolean;
  readonly childIds: readonly string[];
  readonly parent: NodeReference | null;
  readonly geometry: SvgGeometry;
  readonly description: SvgGeometryDescription;
  readonly attributes: SvgAttributes;
}

export interface SceneState {
  readonly width: number;
  readonly height: number;
  readonly rootIds: readonly string[];
  readonly nodes: readonly NodeSnapshot[];
}

export interface SessionSnapshot {
  readonly sourcePath: string | null;
  readonly document: SceneState | null;
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
