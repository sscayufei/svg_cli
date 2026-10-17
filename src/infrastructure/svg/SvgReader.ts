import { SaxesParser, type SaxesTagNS } from 'saxes';
import type { SvgReadContent } from '../../application/ports/SvgReadPort.js';
import { ShapeFactory } from '../../domain/ShapeFactory.js';
import { SvgDocument } from '../../domain/SvgDocument.js';
import type { SvgNode } from '../../domain/SvgNode.js';
import { SvgNumber } from '../../domain/SvgNumber.js';

interface ElementInput {
  readonly type: string;
  readonly uri: string;
  readonly attributes: Readonly<Record<string, string>>;
  readonly parent: ElementInput | null;
  content: string;
}

/** XML adapter: collect, reserve IDs, then build a detached validated candidate. */
export class SvgReader {
  public constructor(private readonly factory = new ShapeFactory()) {}

  public parse(xml: string): SvgReadContent {
    let input: { root: ElementInput; elements: readonly ElementInput[] };
    try {
      input = this.parseInput(xml);
    } catch (error) {
      throw new Error(`invalid SVG: ${error instanceof Error ? error.message : 'cannot parse document'}`);
    }
    return this.buildCandidate(input.root, input.elements);
  }

  private parseInput(xml: string): { root: ElementInput; elements: readonly ElementInput[] } {
    const parser = new SaxesParser({ xmlns: true, defaultXMLVersion: '1.0', forceXMLVersion: true });
    const elements: ElementInput[] = [];
    const stack: ElementInput[] = [];
    let root: ElementInput | undefined;
    parser.on('opentag', tag => {
      const parent = stack.at(-1) ?? null;
      if (tag.uri !== '' && tag.uri !== 'http://www.w3.org/2000/svg') throw new Error(`unsupported namespace: ${tag.uri}`);
      if (parent !== null && root?.uri !== '' && tag.uri === '') throw new Error('unsupported empty element namespace');
      const element: ElementInput = {
        type: tag.local, uri: tag.uri, attributes: this.attributes(tag), parent, content: '',
      };
      if (parent === null) {
        if (root !== undefined || tag.local !== 'svg') throw new Error('expected one svg root');
        root = element;
      } else elements.push(element);
      stack.push(element);
    });
    parser.on('closetag', () => { stack.pop(); });
    const text = (value: string) => {
      const current = stack.at(-1);
      if (current !== undefined) current.content += value;
      else if (value.trim().length > 0) throw new Error('unexpected text outside svg');
    };
    parser.on('text', text); parser.on('cdata', text);
    parser.on('doctype', () => { throw new Error('DOCTYPE is not supported'); });
    parser.on('processinginstruction', () => { throw new Error('unsupported processing instruction'); });
    parser.on('xmldecl', declaration => {
      if (declaration.version !== '1.0') throw new Error('only XML 1.0 is supported');
      if (declaration.encoding !== undefined && !/^utf-8$/i.test(declaration.encoding)) throw new Error('only UTF-8 is supported');
    });
    parser.on('error', error => { throw error; });
    parser.write(xml).close();
    if (root === undefined) throw new Error('expected svg root');
    return { root, elements };
  }

  private buildCandidate(root: ElementInput, elements: readonly ElementInput[]): SvgReadContent {
    const document = this.canvas(root);
    const reserved = new Set<string>();
    for (const element of elements) {
      const id = element.attributes.id;
      if (id !== undefined && id !== '') {
        if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
        reserved.add(id);
      }
    }
    const counters = new Map<string, number>();
    const nodes = new Map<ElementInput, SvgNode>();
    const warnings: string[] = [];
    for (const element of elements) {
      const parent = element.parent === root ? null : element.parent === null ? undefined : nodes.get(element.parent);
      if (parent === undefined) throw new Error('missing parent in candidate');
      if (parent !== null) document.requireContainer(parent.id);
      const { id: explicitId, ...attributes } = element.attributes;
      let id = explicitId;
      if (id === undefined || id === '') {
        let sequence = counters.get(element.type) ?? 0;
        do { id = `${element.type}${++sequence}`; } while (reserved.has(id));
        counters.set(element.type, sequence); reserved.add(id);
        warnings.push(`assigned id ${id} to unnamed <${element.type}>`);
      }
      const node = this.factory.fromAttributes(element.type, id, attributes, element.content);
      document.append(node, parent); nodes.set(element, node);
    }
    document.verifyInvariants();
    return Object.freeze({ document, warnings: Object.freeze(warnings) });
  }

  private attributes(tag: SaxesTagNS): Readonly<Record<string, string>> {
    const entries: [string, string][] = [];
    for (const attribute of Object.values(tag.attributes)) {
      if (attribute.uri === 'http://www.w3.org/2000/xmlns/') continue;
      if (attribute.uri !== '') throw new Error(`unsupported attribute namespace: ${attribute.name}`);
      entries.push([attribute.local, attribute.value]);
    }
    return Object.freeze(Object.fromEntries(entries));
  }

  private canvas(root: ElementInput): SvgDocument {
    for (const name of Object.keys(root.attributes)) {
      if (!['width', 'height', 'viewBox'].includes(name)) throw new Error(`unsupported svg attribute: ${name}`);
    }
    if (root.content.trim().length > 0) throw new Error('unexpected text in svg');
    const width = this.dimension(root.attributes.width, 'width');
    const height = this.dimension(root.attributes.height, 'height');
    const document = new SvgDocument(width, height);
    const viewBox = root.attributes.viewBox;
    if (viewBox !== undefined) {
      const values = viewBox.trim().split(/[\s,]+/).map(value => SvgNumber.parse(value, 'viewBox'));
      if (values.length !== 4 || values[0] !== 0 || values[1] !== 0 || values[2] !== width || values[3] !== height) {
        throw new Error('unsupported viewBox: expected 0 0 width height');
      }
    }
    return document;
  }

  private dimension(value: string | undefined, name: string): number {
    if (value === undefined) throw new Error(`svg ${name} is required`);
    return SvgNumber.parse(value.trim().replace(/px$/, ''), name);
  }
}
