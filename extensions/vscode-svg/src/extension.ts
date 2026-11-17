import { window, type ExtensionContext } from 'vscode';
import { ExtensionLifecycle } from './ExtensionLifecycle';
import { SvgFileDecorationProvider } from './SvgFileDecorationProvider';

/** Registers read-only Explorer metadata; the host owns presentation and naming. */
export function activate(context: ExtensionContext): ExtensionLifecycle {
  const provider = new SvgFileDecorationProvider();
  const lifecycle = new ExtensionLifecycle([provider, window.registerFileDecorationProvider(provider)]);
  context.subscriptions.push(lifecycle);
  return lifecycle;
}
