import type { SvgNode } from '../domain/SvgNode.js';
import type { CommandHelp } from '../application/CommandResult.js';
import type { Command } from '../application/commands/Command.js';
import type { CommandToken } from './CommandToken.js';
import type { NodeSnapshot } from '../application/SceneSnapshot.js';
import type { SvgAttributes } from '../domain/SvgAttributes.js';

export interface ShapeProvider {
  readonly name: string;
  readonly help: CommandHelp;
  create(id: string, args: readonly string[]): SvgNode;
  fromAttributes(id: string, attributes: Readonly<Record<string, string>>, content: string): SvgNode;
  restore?(input: ShapeRestoreInput): SvgNode;
  creationFeedback?(node: SvgNode, parent: SvgNode | null): readonly string[];
}
export interface CommandDefinition extends CommandHelp {
  readonly name: string;
  build(args: readonly CommandToken[]): Command;
}
export interface AttributeTarget {
  readonly id: string;
  readonly semanticType: string;
  readonly isContainer: boolean;
  readonly attributes: SvgAttributes;
  readonly children: readonly { readonly id: string; readonly semanticType: string }[];
}
export interface ShapeRestoreInput {
  readonly tag: string;
  readonly id: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly content: string;
  readonly children: readonly SvgNode[];
}
/** Matching is pure; edits are only exposed through the scoped transaction. */
export interface AttributeHandler {
  readonly name: string;
  handles(target: AttributeTarget, attribute: string): boolean;
  apply(target: AttributeTarget, attribute: string, value: string | number, transaction: AttributeEdits): OperationFeedback | void;
}
export interface AttributeEdits {
  read(id: string): AttributeTarget;
  setAttribute(id: string, attribute: string, value: string | number): void;
}
/** Both forms are validated inside the transaction; redo reuses applied feedback. */
export interface OperationFeedback { readonly applied: readonly string[]; readonly undone: readonly string[] }
export interface TreeRow {
  readonly node: NodeSnapshot | null;
  readonly canvas: { readonly width: number; readonly height: number };
}
export interface TreeDecorator {
  readonly name: string;
  decorate(row: TreeRow): string | undefined;
}
