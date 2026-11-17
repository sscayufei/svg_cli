import * as vscode from 'vscode';
import { SvgOutlineParser, type OutlineElement } from './SvgOutlineParser';

/** Adapts the syntax tree to native Outline navigation, independent of language ID. */
export class SvgDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
  readonly #parser = new SvgOutlineParser();

  public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.DocumentSymbol[] {
    if (token.isCancellationRequested) return [];
    const version = document.version;
    const elements = this.#parser.parse(document.getText());
    const result: vscode.DocumentSymbol[] = [];
    const pending: { element: OutlineElement; target: vscode.DocumentSymbol[] }[] =
      [...elements].reverse().map(element => ({ element, target: result }));
    while (pending.length) {
      if (token.isCancellationRequested || document.version !== version) return [];
      const { element, target } = pending.pop()!;
      const symbol = new vscode.DocumentSymbol(
        element.name + (element.id ? `#${element.id}` : ''), '',
        element.children.length ? vscode.SymbolKind.Object : vscode.SymbolKind.Field,
        new vscode.Range(document.positionAt(element.start), document.positionAt(element.end)),
        new vscode.Range(document.positionAt(element.start + 1), document.positionAt(element.nameEnd)),
      );
      target.push(symbol);
      for (const child of [...element.children].reverse()) pending.push({ element: child, target: symbol.children });
    }
    return token.isCancellationRequested || document.version !== version ? [] : result;
  }
}
