import type { SvgDocument } from '@svgframe/core';
import type { SvgNode } from '@svgframe/core';

/** Pure SVG serialization over the public Component/Iterator contracts. */
export class SvgWriter {
  public serialize(document: SvgDocument): string {
    document.verifyInvariants();
    const lines = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${document.width}" height="${document.height}" viewBox="0 0 ${document.width} ${document.height}">`,
    ];
    const ancestors: { node: SvgNode; tag: string }[] = [];
    for (const node of document) {
      while (ancestors.length > 0 && ancestors.at(-1)?.node !== node.parent) this.close(ancestors, lines);
      const description = node.describeSvg();
      const tag = this.name(description.tag);
      const attributes = description.attributes;
      if (Object.hasOwn(attributes, 'id')) throw new Error('serialized attributes must not redefine id');
      if (description.text !== undefined && node.children.length) throw new Error('cannot serialize text and children together');
      const values = [`id="${this.escape(node.id, true)}"`];
      for (const [name, value] of Object.entries(attributes)) {
        values.push(`${this.name(name)}="${this.escape(String(value), true)}"`);
      }
      const start = `${'  '.repeat(ancestors.length + 1)}<${tag} ${values.join(' ')}`;
      if (description.text !== undefined) {
        lines.push(`${start}>${this.escape(description.text)}</${tag}>`);
      } else if (node.children.length > 0) {
        lines.push(`${start}>`); ancestors.push({ node, tag });
      } else {
        lines.push(`${start}/>`);
      }
    }
    while (ancestors.length > 0) this.close(ancestors, lines);
    lines.push('</svg>', '');
    return lines.join('\n');
  }

  private close(ancestors: { node: SvgNode; tag: string }[], lines: string[]): void {
    const node = ancestors.pop();
    if (node !== undefined) lines.push(`${'  '.repeat(ancestors.length + 1)}</${node.tag}>`);
  }

  private name(value: string): string {
    if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value)) throw new Error('invalid XML name');
    return value;
  }

  private escape(value: string, attribute = false): string {
    for (const character of value) {
      const code = character.codePointAt(0) ?? 0;
      if (!(code === 9 || code === 10 || code === 13 || (code >= 0x20 && code <= 0xd7ff)
        || (code >= 0xe000 && code <= 0xfffd) || (code >= 0x10000 && code <= 0x10ffff))) {
        throw new Error('invalid XML character');
      }
    }
    const entities: Readonly<Record<string, string>> = {
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;', '\r': '&#13;',
    };
    return value.replace(/[&<>"'\r\n\t]/g, character => {
      if (attribute && character === '\n') return '&#10;';
      if (attribute && character === '\t') return '&#9;';
      return entities[character] ?? character;
    });
  }
}
