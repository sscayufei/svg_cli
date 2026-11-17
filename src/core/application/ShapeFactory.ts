import { SvgNode } from '../domain/SvgNode.js';
import type { ShapeProvider } from '../extensions/Contracts.js';
import { ExtensionRegistry } from '../extensions/ExtensionRegistry.js';
import { OutputLines } from './OutputLines.js';

export class ShapeFactory {
  public constructor(private readonly providers = new ExtensionRegistry<ShapeProvider>('shapes')) {}
  public create(type: string, id: string, args: readonly string[]): SvgNode {
    return this.validate(this.provider(type).create(id, args), type, id);
  }
  public fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, content = ''): SvgNode {
    return this.validate(this.provider(type).fromAttributes(id, attributes, content), type, id);
  }
  public help() { return this.providers.values().map(provider => provider.help); }
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
