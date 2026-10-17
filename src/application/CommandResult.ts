import type { NodeReference, NodeSnapshot, TreeSnapshot } from './SceneSnapshot.js';
import type { SvgPoint } from '../domain/SvgAttributes.js';

export interface CommandHelp {
  readonly syntax: string;
  readonly description: string;
}

/** Immutable result values; concrete CLI rendering stays outside application. */
export type CommandResult =
  | { readonly kind: 'help'; readonly entries: readonly CommandHelp[]; readonly pending: readonly string[] }
  | { readonly kind: 'canvas'; readonly operation: 'created' | 'queried' | 'resized'; readonly width: number; readonly height: number }
  | { readonly kind: 'tree'; readonly snapshot: TreeSnapshot }
  | { readonly kind: 'show'; readonly node: NodeSnapshot }
  | { readonly kind: 'saved'; readonly path: string; readonly count: number }
  | { readonly kind: 'created'; readonly node: NodeReference; readonly parent: NodeReference | null }
  | { readonly kind: 'grouped'; readonly node: NodeReference; readonly count: number }
  | { readonly kind: 'ungrouped'; readonly node: NodeReference }
  | { readonly kind: 'reparented'; readonly node: NodeReference; readonly parent: NodeReference | null }
  | { readonly kind: 'ordered'; readonly node: NodeReference; readonly direction: 'front' | 'back'; readonly undo: boolean }
  | { readonly kind: 'restored'; readonly node: NodeReference; readonly parent: NodeReference | null }
  | { readonly kind: 'moved'; readonly node: NodeReference; readonly position: SvgPoint | null; readonly dx: number; readonly dy: number; readonly undo: boolean }
  | { readonly kind: 'scaled'; readonly node: NodeReference; readonly factor: number; readonly undo: boolean }
  | { readonly kind: 'updated'; readonly node: NodeReference; readonly attribute: string; readonly value: string | number | undefined }
  | { readonly kind: 'deleted'; readonly node: NodeReference };

export type ExecutionResult =
  | { readonly ok: true; readonly result: CommandResult }
  | { readonly ok: false; readonly error: string };
