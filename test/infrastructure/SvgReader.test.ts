import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { SvgReader } from '../../src/infrastructure/svg/SvgReader.js';
import { SvgWriter } from '../../src/infrastructure/svg/SvgWriter.js';

const svg = (body: string, attributes = 'width="400" height="300"') => `<svg ${attributes}>${body}</svg>`;
const state = (result: ReturnType<SvgReader['parse']>) => ({
  size: [result.document.width, result.document.height],
  nodes: [...result.document].map(node => ({
    id: node.id, type: node.type, attributes: node.getAttributes(),
    parent: node.parent !== null && 'id' in node.parent ? node.parent.id : null,
    children: node.children.map(child => child.id),
  })),
});

describe('SvgReader validated candidates', () => {
  it('reserves later explicit IDs before assigning missing and empty IDs in preorder', () => {
    const input = svg('<g><rect/><rect id="rect1"/><circle/><g id="g1"/></g><rect id="rect2"/><rect id=""/>');
    const reader = new SvgReader(); const result = reader.parse(input);
    expect([...result.document].map(node => node.id)).toEqual(['g2', 'rect3', 'rect1', 'circle1', 'g1', 'rect2', 'rect4']);
    expect(result.warnings).toEqual([
      'assigned id g2 to unnamed <g>', 'assigned id rect3 to unnamed <rect>',
      'assigned id circle1 to unnamed <circle>', 'assigned id rect4 to unnamed <rect>',
    ]);
    expect(reader.parse(input).warnings).toEqual(result.warnings);
    result.document.verifyInvariants();
  });

  it('imports the original other.svg fixture with its exact warning and seven elements', () => {
    const result = new SvgReader().parse(readFileSync(new URL('../fixtures/other.svg', import.meta.url), 'utf8'));
    expect(result.document.size).toBe(7);
    expect(result.warnings).toEqual(['assigned id rect1 to unnamed <rect>']);
    expect(result.document.requireById('r2').parent).toBe(result.document.requireById('g1'));
  });

  it('reads all shapes, defaults, px canvas dimensions and common styles through the shared factory', () => {
    const result = new SvgReader().parse(svg([
      '<g id="g" fill="red" stroke="blue" stroke-width="0">',
      '<rect id="r" x="0.1" height="4"/><circle id="c" r="2" fill="green"/>',
      '<ellipse id="e" rx="3"/><line id="l" x2="10"/><text id="t">中文😀</text></g>',
    ].join(''), 'width="400px" height="300px" viewBox="0,0,400,300"'));
    expect(result.warnings).toEqual([]);
    expect(result.document.requireById('r').getAttributes()).toEqual({ x: 0.1, y: 0, width: 0, height: 4 });
    expect(result.document.requireById('g').getAttributes()).toEqual({ fill: 'red', stroke: 'blue', 'stroke-width': 0 });
    expect(result.document.requireById('c').getAttributes()).toEqual({ cx: 0, cy: 0, r: 2, fill: 'green' });
    expect(result.document.requireById('t').getAttributes()).toEqual({ x: 0, y: 0, text: '中文😀' });
  });

  it('preserves decoded text, CDATA, empty text and writer-normalized attribute whitespace', () => {
    const input = svg('<text id="t" fill="red&#9;&#10;&#13;">  &lt;&amp;<![CDATA[<你好>]]>&#13;\n\t </text><text id="empty"/>');
    const reader = new SvgReader(); const first = reader.parse(input);
    expect(first.document.requireById('t').getAttributes().text).toBe('  <&<你好>\r\n\t ');
    expect(first.document.requireById('empty').getAttributes().text).toBe('');
    const output = new SvgWriter().serialize(first.document);
    expect(state(reader.parse(output))).toEqual(state(first));
  });

  it('accepts SVG namespace prefixes and ignores comments without losing shape order', () => {
    const result = new SvgReader().parse('<?xml version="1.0" encoding="UTF-8"?><!-- outside -->' +
      '<s:svg xmlns:s="http://www.w3.org/2000/svg" width="1" height="2"><!-- inside -->' +
      '<s:g id="g"><s:rect id="r"/></s:g></s:svg>');
    expect([...result.document].map(node => node.id)).toEqual(['g', 'r']);
  });

  it('round-trips all six types with styles, parents, order and case-sensitive IDs', () => {
    const reader = new SvgReader(); const writer = new SvgWriter();
    const input = svg('<g id="R" fill="red"><g id="nested"><rect id="r" x="1e-8"/>' +
      '<circle id="c" r="1"/><ellipse id="e" rx="2" ry="3"/><line id="l" stroke="black"/>' +
      '<text id="t">&lt;文本&gt;</text></g></g>');
    const first = reader.parse(input); const canonical = writer.serialize(first.document);
    const second = reader.parse(canonical);
    expect(state(second)).toEqual(state(first)); expect(second.warnings).toEqual([]);
    expect(writer.serialize(second.document)).toBe(canonical); second.document.verifyInvariants();
  });

  it.each([
    ['', 'invalid SVG'], [svg('<g>'), 'invalid SVG'], [svg('<rect x="1" x="2"/>'), 'invalid SVG'],
    [svg('<text>&unknown;</text>'), 'invalid SVG'], [svg('<text>\u0001</text>'), 'invalid SVG'],
    [svg('<rect id="same"/><g id="same"/>'), 'id already exists: same'],
    [svg('<path/>'), 'unknown shape type: path'], [svg('<g transform="translate(1,2)"/>'), 'unknown attribute: transform'],
    [svg('<rect style="fill:red"/>'), 'unknown attribute: style'], [svg('<text font-size="16"/>'), 'unknown attribute: font-size'],
    [svg('<g data-kind="box"/>'), 'unknown attribute: data-kind'], [svg('<rect text="bad"/>'), 'unknown attribute: text'],
    [svg('<text><tspan>nested</tspan></text>'), 'not a container'], [svg('<rect><g/></rect>'), 'not a container'],
    [svg('unexpected text'), 'unexpected text'], [svg('<g>unexpected</g>'), 'unexpected text'],
    [svg('<rect width="-1"/>'), 'non-negative'], [svg('<circle r="NaN"/>'), 'finite'],
    [svg('<rect x="10px"/>'), 'finite'], [svg('<g stroke-width="-1"/>'), 'non-negative'],
    [svg('', 'width="0" height="300"'), 'positive'], [svg('', 'height="300"'), 'width'],
    [svg('', 'width="100%" height="300"'), 'width'], [svg('', 'width="400" height="300" viewBox="10 0 400 300"'), 'viewBox'],
    [svg('', 'width="400" height="300" viewBox="0 0 800 600"'), 'viewBox'],
    [svg('', 'width="400" height="300" style="fill:red"'), 'unsupported svg attribute'],
    ['<!DOCTYPE svg SYSTEM "file:///should-not-be-read"><svg width="1" height="1"/>', 'DOCTYPE'],
    ['<?xml-stylesheet href="file:///style.css"?><svg width="1" height="1"/>', 'processing instruction'],
    ['<svg xmlns="urn:other" width="1" height="1"/>', 'namespace'],
    ['<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect xmlns=""/></svg>', 'namespace'],
    [svg('<g xmlns:x="urn:other" x:fill="red"/>'), 'attribute namespace'],
    ['<?xml version="1.1"?><svg width="1" height="1"/>', 'XML 1.0'],
    ['<?xml version="1.0" encoding="UTF-16"?><svg width="1" height="1"/>', 'UTF-8'],
  ])('rejects unsupported or malformed input %j (%s)', (input, error) => {
    expect(() => new SvgReader().parse(input)).toThrow(error);
  });
});
