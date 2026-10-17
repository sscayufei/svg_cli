import type { NodeReference, NodeSnapshot, TreeSnapshot } from '../application/SceneSnapshot.js';

/** Formats generic geometry descriptions; never dispatches on shape type/tag. */
export class NodeFormatter {
  public reference(node: NodeReference): string {
    return `${node.type}#${node.id}`;
  }

  public tree(snapshot: TreeSnapshot): readonly string[] {
    const lines: string[] = [];
    if (snapshot.canvas !== null) {
      lines.push(`svg (${snapshot.canvas.width}x${snapshot.canvas.height})`);
    }
    const branches: string[] = [];
    for (const entry of snapshot.entries) {
      const label = this.summary(entry.node);
      if (entry.depth === 0) {
        lines.push(label);
      } else {
        const prefix = branches.slice(1, entry.depth).join('');
        lines.push(`${prefix}${entry.last ? '└── ' : '├── '}${label}`);
      }
      branches[entry.depth] = entry.last ? '    ' : '│   ';
    }
    return lines;
  }

  public show(node: NodeSnapshot): readonly string[] {
    const lines = [`${this.reference(node)}  parent=${node.parent === null ? 'svg' : this.reference(node.parent)}`];
    const geometry = Object.entries(node.geometry).map(([name, value]) => `${name}=${value}`).join(' ');
    if (geometry.length > 0) lines.push(`  ${geometry}`);
    const attributes = this.otherAttributes(node, false);
    if (attributes.length > 0) lines.push(`  ${attributes}`);
    return lines;
  }

  private summary(node: NodeSnapshot): string {
    const description = node.description;
    let geometry: string;
    if (description.kind === 'point') {
      geometry = `(${description.x},${description.y})`;
    } else if (description.kind === 'segment') {
      geometry = `(${description.x1},${description.y1}) -> (${description.x2},${description.y2})`;
    } else {
      const aliases: Readonly<Record<string, string>> = { width: 'w', height: 'h' };
      geometry = Object.entries(description.values).map(([name, value]) => `${aliases[name] ?? name}=${value}`).join(' ');
    }
    const details = [geometry, this.otherAttributes(node, true)].filter(value => value.length > 0).join(' ');
    return this.reference(node) + (details.length > 0 ? `  ${details}` : '');
  }

  private otherAttributes(node: NodeSnapshot, inlineText: boolean): string {
    return Object.entries(node.attributes)
      .filter(([name]) => !Object.hasOwn(node.geometry, name))
      .map(([name, value]) => {
        const text = name === 'text' ? JSON.stringify(value) : String(value);
        return inlineText && name === 'text' ? text : `${name}=${text}`;
      }).join(' ');
  }
}
