import { test } from 'node:test';
import { deepStrictEqual, equal } from 'node:assert/strict';
import { ExtensionLifecycle } from '../src/ExtensionLifecycle';

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
