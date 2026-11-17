import { test } from 'node:test';
import { deepStrictEqual, equal } from 'node:assert/strict';
import { ExtensionLifecycle } from '../src/ExtensionLifecycle';
import { SvgBadgePolicy } from '../src/SvgBadgePolicy';

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
