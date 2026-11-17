import { languages, window, type ExtensionContext } from 'vscode';
import { ExtensionLifecycle } from './ExtensionLifecycle';
import { SvgFileDecorationProvider } from './SvgFileDecorationProvider';
import { SvgDocumentSymbolProvider } from './SvgDocumentSymbolProvider';

/** Registers read-only Explorer metadata; the host owns presentation and naming. */
export function activate(context: ExtensionContext): ExtensionLifecycle {
  const provider = new SvgFileDecorationProvider();
  const lifecycle = new ExtensionLifecycle([
    provider, window.registerFileDecorationProvider(provider),
    languages.registerDocumentSymbolProvider({ scheme: 'file', pattern: '**/*.[sS][vV][gG]' }, new SvgDocumentSymbolProvider(), { label: 'SVG outline' }),
  ]);
  context.subscriptions.push(lifecycle);
  return lifecycle;
}
