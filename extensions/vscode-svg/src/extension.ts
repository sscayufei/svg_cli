import type { ExtensionContext } from 'vscode';
import { ExtensionLifecycle } from './ExtensionLifecycle';

/** Minimal host entry; SVG providers are added in P2-1. */
export function activate(context: ExtensionContext): ExtensionLifecycle {
  const lifecycle = new ExtensionLifecycle();
  context.subscriptions.push(lifecycle);
  return lifecycle;
}
