import { test } from 'node:test';
import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import { ExtensionLifecycle } from '../src/ExtensionLifecycle';
import { SvgBadgePolicy } from '../src/SvgBadgePolicy';
import { SvgOutlineParser } from '../src/SvgOutlineParser';

test('releases resources in reverse order exactly once', () => {
  const released: number[] = [];
  const lifecycle = new ExtensionLifecycle([
    { dispose: () => { released.push(1); } },
    { dispose: () => { released.push(2); } },
  ]);
  equal(lifecycle.disposed, false);
  lifecycle.dispose();
  lifecycle.dispose();
  equal(lifecycle.disposed, true);
  deepStrictEqual(released, [2, 1]);
});

test('outline includes root, nested groups, arbitrary elements and original/missing IDs', () => {
  const [root] = new SvgOutlineParser().parse('<svg><g id="flow"><path id="p" d="M0 0"/><g><text>hello</text></g></g></svg>');
  equal(root?.name, 'svg');
  equal(root?.id, undefined);
  const group = root?.children[0];
  equal(group?.id, 'flow');
  deepStrictEqual(group?.children.map(node => node.name), ['path', 'g']);
  equal(group?.children[1]?.children[0]?.name, 'text');
});

test('source ranges are UTF-16 offsets across CRLF, emoji, prefixes and multiline attributes', () => {
  const source = '<?xml version="1.0"?>\r\n<s:svg xmlns:s="http://www.w3.org/2000/svg">😀<!-- <fake/> --><![CDATA[<fake/>]]><s:g\r\n id="中文"><s:text>字😀</s:text><s:rect/></s:g></s:svg>';
  const [root] = new SvgOutlineParser().parse(source);
  ok(root);
  equal(source.slice(root.start, root.end), source.slice(source.indexOf('<s:svg')));
  const group = root.children[0]!;
  equal(group.start, source.indexOf('<s:g'));
  equal(source.slice(group.start + 1, group.nameEnd), 's:g');
  equal(group.id, '中文');
  equal(source.slice(group.start, group.end), '<s:g\r\n id="中文"><s:text>字😀</s:text><s:rect/></s:g>');
  equal(source.slice(group.children[1]!.start, group.children[1]!.end), '<s:rect/>');
});

test('incomplete/invalid XML clears the outline; subsequent valid input recovers', () => {
  const parser = new SvgOutlineParser();
  for (const source of ['', '<svg><g>', '<svg><g></svg>', '<svg id="', '<svg/><svg/>', '<html/>', '<!DOCTYPE svg><svg/>', '<svg>&undefined;</svg>']) {
    deepStrictEqual(parser.parse(source), []);
  }
  equal(parser.parse('<svg><rect/></svg>')[0]?.children[0]?.name, 'rect');
});

test('deep syntax trees do not require recursive construction', () => {
  const [root] = new SvgOutlineParser().parse('<svg>' + '<g>'.repeat(2000) + '<rect/>' + '</g>'.repeat(2000) + '</svg>');
  let current = root;
  let depth = 0;
  while (current?.children.length) { current = current.children[0]; depth++; }
  equal(depth, 2001);
  equal(current?.name, 'rect');
});

test('badges SVG files without propagating to parents, including uppercase extensions', async () => {
  for (const path of ['/example.svg', '/UPPER.SVG', '/空 格.svg']) {
    deepStrictEqual(await new SvgBadgePolicy().provide(path, async () => true, { isCancellationRequested: false }),
      { badge: '[]', tooltip: 'SVG file', propagate: false });
  }
});

test('directories, ordinary files and failed metadata reads receive no badge', async () => {
  const policy = new SvgBadgePolicy();
  equal(await policy.provide('/folder.svg', async () => false, { isCancellationRequested: false }), undefined);
  equal(await policy.provide('/plain.txt', async () => { throw new Error('must not stat'); }, { isCancellationRequested: false }), undefined);
  equal(await policy.provide('/missing.svg', async () => { throw new Error('unreadable'); }, { isCancellationRequested: false }), undefined);
});

test('cancellation before and during metadata access suppresses the result', async () => {
  const policy = new SvgBadgePolicy();
  equal(await policy.provide('/a.svg', async () => { throw new Error('must not stat'); }, { isCancellationRequested: true }), undefined);
  const token = { isCancellationRequested: false };
  equal(await policy.provide('/a.svg', async () => { token.isCancellationRequested = true; return true; }, token), undefined);
});
