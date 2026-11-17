import { SaxesParser } from 'saxes';

export interface OutlineElement {
  readonly name: string;
  readonly id: string | undefined;
  readonly start: number;
  readonly end: number;
  readonly nameEnd: number;
  readonly children: readonly OutlineElement[];
}

interface OpenElement {
  name: string;
  id: string | undefined;
  start: number;
  children: OutlineElement[];
}

/** Syntax-only XML tree with UTF-16 source offsets; never creates domain IDs. */
export class SvgOutlineParser {
  public parse(source: string): readonly OutlineElement[] {
    const parser = new SaxesParser({ xmlns: true, position: true });
    const stack: OpenElement[] = [];
    const roots: OutlineElement[] = [];
    let start = 0;
    parser.on('opentagstart', () => { start = source.lastIndexOf('<', parser.position - 1); });
    parser.on('opentag', tag => {
      if (stack.length === 0 && (tag.local !== 'svg' || !['', 'http://www.w3.org/2000/svg'].includes(tag.uri))) {
        throw new Error('expected SVG root');
      }
      const id = Object.values(tag.attributes).find(attribute => attribute.local === 'id' && attribute.uri === '')?.value;
      stack.push({ name: tag.name, id, start, children: [] });
    });
    parser.on('closetag', () => {
      const open = stack.pop();
      if (!open) throw new Error('missing open element');
      const node: OutlineElement = Object.freeze({ ...open, end: parser.position, nameEnd: open.start + 1 + open.name.length, children: Object.freeze(open.children) });
      const parent = stack.at(-1);
      if (parent) parent.children.push(node);
      else roots.push(node);
    });
    parser.on('doctype', () => { throw new Error('DOCTYPE is not supported in outline'); });
    parser.on('error', error => { throw error; });
    try {
      parser.write(source).close();
      return Object.freeze(roots);
    } catch {
      // XML being typed may be incomplete; discard the whole partial tree.
      return Object.freeze([]);
    }
  }
}
