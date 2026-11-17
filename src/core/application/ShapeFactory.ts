import { SvgNode } from '../domain/SvgNode.js';
import type { ShapeProvider, ShapeRestoreInput } from '../extensions/Contracts.js';
import { SvgGroup } from '../domain/SvgGroup.js';
import { SubtreeBuilder } from '../domain/SubtreeBuilder.js';
import { ExtensionRegistry, type ExtensionRegistrations } from '../extensions/ExtensionRegistry.js';
import { OutputLines } from './OutputLines.js';
import type { ShapeConstructionPort } from './ports/ShapeConstructionPort.js';

export class ShapeFactory implements ShapeConstructionPort {
  public constructor(private readonly providers: ExtensionRegistrations<ShapeProvider> = new ExtensionRegistry<ShapeProvider>('shapes')) {}
  public create(type: string, id: string, args: readonly string[]): SvgNode {
    return this.validate(this.provider(type).create(id, args), type, id);
  }
  public fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, content = ''): SvgNode {
    return this.validate(this.provider(type).fromAttributes(id, attributes, content), type, id);
  }
  public help() { return this.providers.values().map(provider => provider.help); }
  /** Restore complete subtrees, routing generic composite metadata without type branches. */
  public restore(input: ShapeRestoreInput): SvgNode {
    const { ['data-kind']: kind, ...ordinary } = input.attributes;
    const marked = input.tag === 'g' && kind !== undefined;
    const type = marked && this.providers.get(kind) ? kind : input.tag;
    const provider = this.provider(type);
    const normalized = Object.freeze({ ...input, attributes: marked ? Object.freeze(ordinary) : input.attributes });
    let node: SvgNode;
    if (marked && type === kind) {
      if (!provider.restore) throw new Error(`composite restore not supported: ${type}`);
      node = provider.restore(normalized);
    } else if (provider.restore) node = provider.restore(normalized);
    else {
      node = provider.fromAttributes(input.id, normalized.attributes, input.content);
      if (input.children.length) {
        if (!(node instanceof SvgGroup)) throw new Error(`not a container: ${input.id}`);
        SubtreeBuilder.assemble(node, input.children);
      }
    }
    this.validate(node, type, input.id);
    if (node instanceof SvgGroup) node.verifyStructure();
    return node;
  }
  public creationFeedback(node: SvgNode, parent: SvgNode | null): readonly string[] | undefined {
    const lines = this.provider(node.type).creationFeedback?.(node, parent);
    return lines === undefined ? undefined : OutputLines.copy(lines);
  }
  private provider(type: string): ShapeProvider {
    const provider = this.providers.get(type);
    if (!provider) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return provider;
  }
  private validate(node: SvgNode, type: string, id: string): SvgNode {
    if (!(node instanceof SvgNode) || node.id !== id || node.type !== type || node.document !== null || node.parent !== null) throw new Error(`invalid shape provider result: ${type}`);
    return node;
  }
}
