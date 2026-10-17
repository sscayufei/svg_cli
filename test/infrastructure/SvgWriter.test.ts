import { describe, expect, it } from 'vitest';
import { SvgWriter } from '../../src/infrastructure/svg/SvgWriter.js';
import { SvgDocument } from '../../src/domain/SvgDocument.js';
import { ShapeFactory } from '../../src/domain/ShapeFactory.js';
import type { SvgNode } from '../../src/domain/SvgNode.js';

describe('SvgWriter', () => {
  it('serializes all six types, nested order, optional styles and text as XML content', () => {
    const document = new SvgDocument(400, 200); const factory = new ShapeFactory();
    const group = factory.create('g', 'scene', []); document.append(group);
    const nested = factory.create('g', 'nested', []); document.append(nested, group);
    group.setAttribute('fill', '#abc'); group.setAttribute('stroke-width', 0);
    const definitions = [
      ['rect', 'r', ['0.1', '2', '0', '4', 'red']], ['circle', 'c', ['5', '6', '0']],
      ['ellipse', 'e', ['7', '8', '9', '10']], ['line', 'l', ['1', '2', '3', '4', 'black']],
      ['text', 't', ['11', '12', '开始 & <end> "quote" \'apostrophe\'']],
    ] as const;
    for (const [type, id, args] of definitions) document.append(factory.create(type, id, args), nested);
    document.append(factory.create('g', 'empty', []), group);
    const before = [...document].map(node => ({ node, attributes: node.getAttributes(), parent: node.parent }));
    const writer = new SvgWriter(); const output = writer.serialize(document);
    expect(output).toBe([
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">',
      '  <g id="scene" fill="#abc" stroke-width="0">', '    <g id="nested">',
      '      <rect id="r" x="0.1" y="2" width="0" height="4" fill="red"/>',
      '      <circle id="c" cx="5" cy="6" r="0"/>',
      '      <ellipse id="e" cx="7" cy="8" rx="9" ry="10"/>',
      '      <line id="l" x1="1" y1="2" x2="3" y2="4" stroke="black"/>',
      '      <text id="t" x="11" y="12">开始 &amp; &lt;end&gt; &quot;quote&quot; &apos;apostrophe&apos;</text>',
      '    </g>', '    <g id="empty"/>', '  </g>', '</svg>', '',
    ].join('\n'));
    expect(writer.serialize(document)).toBe(output);
    expect([...document].map(node => ({ node, attributes: node.getAttributes(), parent: node.parent }))).toEqual(before);
    document.verifyInvariants();
  });

  it('escapes attribute delimiters and preserves XML-normalized whitespace and Unicode', () => {
    const document = new SvgDocument(); const factory = new ShapeFactory();
    const node = factory.create('text', 'id"<&\t\n\r', ['0', '0', '中文😀\r\n\t']);
    node.setAttribute('fill', 'x"/><evil a="&\t\n\r'); document.append(node);
    const xml = new SvgWriter().serialize(document);
    expect(xml).toContain('id="id&quot;&lt;&amp;&#9;&#10;&#13;"');
    expect(xml).toContain('fill="x&quot;/&gt;&lt;evil a=&quot;&amp;&#9;&#10;&#13;"');
    expect(xml).toContain('>中文😀&#13;\n\t</text>');
    expect(xml).not.toContain('<evil');
  });

  it.each(['\0', '\u0001', '\u000b', '\ud800', '\udfff', '\ufffe', '\uffff'])('rejects invalid XML characters %j', value => {
    const document = new SvgDocument(); document.append(new ShapeFactory().create('text', 't', ['0', '0', value]));
    expect(() => new SvgWriter().serialize(document)).toThrow('invalid XML character');
  });

  it('retains empty text and serializes an empty canvas', () => {
    const document = new SvgDocument(); const writer = new SvgWriter();
    expect(writer.serialize(document)).toContain('viewBox="0 0 800 600">\n</svg>\n');
    document.append(new ShapeFactory().create('text', 't', ['0', '0', '']));
    expect(writer.serialize(document)).toContain('<text id="t" x="0" y="0"></text>');
  });

  it('uses preorder traversal without overflowing the call stack on deep groups', () => {
    const document = new SvgDocument(); const factory = new ShapeFactory(); let parent: SvgNode | null = null;
    for (let index = 0; index < 1500; index++) {
      const group = factory.create('g', `g${index}`, []); document.append(group, parent); parent = group;
    }
    const xml = new SvgWriter().serialize(document);
    expect(xml.match(/<g /g)).toHaveLength(1500);
    expect(xml.match(/<\/g>/g)).toHaveLength(1499);
  });
});
