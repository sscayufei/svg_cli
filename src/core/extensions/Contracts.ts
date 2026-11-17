import type { SvgNode } from '../domain/SvgNode.js';
import type { ChangeSet } from '../domain/ChangeSet.js';
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
}
/** Initial planning contract; controlled multi-operation transactions arrive in P2-2b. */
export interface AttributeHandler {
  readonly name: string;
  handles(target: AttributeTarget, attribute: string): boolean;
  plan(target: SvgNode, attribute: string, value: string | number): ChangeSet;
  feedback?(target: SvgNode, attribute: string, value: string | number): OperationFeedback;
}
/** Both forms are prepared before mutation; redo reuses applied feedback. */
export interface OperationFeedback { readonly applied: readonly string[]; readonly undone: readonly string[] }
export interface TreeRow {
  readonly node: NodeSnapshot | null;
  readonly canvas: { readonly width: number; readonly height: number };
}
export interface TreeDecorator {
  readonly name: string;
  decorate(row: TreeRow): string | undefined;
}
