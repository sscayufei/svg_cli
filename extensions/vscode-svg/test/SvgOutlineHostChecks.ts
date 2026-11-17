import { deepStrictEqual, equal, ok } from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import * as vscode from 'vscode';
import { SvgDocumentSymbolProvider } from '../src/SvgDocumentSymbolProvider';
import { WorkbenchProbe } from './WorkbenchProbe';

/** Checks the registered provider and real native Outline, including unsaved edits. */
export async function verifySvgOutline(): Promise<void> {
  const rootUri = vscode.workspace.workspaceFolders?.[0]?.uri;
  ok(rootUri);
  const uri = vscode.Uri.joinPath(rootUri, 'example.svg');
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
  const original = document.getText();
  const output = dirname(process.env.SVG_EXTENSION_EVIDENCE!);
  const pause = () => new Promise(resolve => setTimeout(resolve, 200));
  async function waitFor(check: () => Promise<boolean>, description: string): Promise<void> {
    for (let i = 0; i < 60; i++) { if (await check()) return; await pause(); }
    throw new Error(`Timeout: ${description}`);
  }
  const symbols = async () => await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', uri) ?? [];
  const replace = async (text: string) => {
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(document.positionAt(0), document.positionAt(document.getText().length)), text);
    ok(await vscode.workspace.applyEdit(edit));
  };
  await waitFor(async () => (await symbols()).length > 0, 'registered SVG symbols');
  const initial = await symbols();
  equal(initial[0]?.name, 'svg');
  const flow = initial[0]?.children[0];
  equal(flow?.name, 'g#flow');
  deepStrictEqual(flow?.children.map(node => node.name), ['rect#start', 'g#nested']);
  equal(flow?.children[1]?.children[0]?.name, 'text');
  const rect = flow!.children[0]!;
  equal(rect.selectionRange.start.line, 2);
  equal(document.getText(rect.selectionRange), 'rect');
  ok(document.getText(rect.range).endsWith('/>'));
  const cancelled = new vscode.CancellationTokenSource();
  cancelled.cancel();
  deepStrictEqual(new SvgDocumentSymbolProvider().provideDocumentSymbols(document, cancelled.token), []);
  cancelled.dispose();
  let versionReads = 0;
  const stale = new Proxy(document, { get(target, property) { return property === 'version' ? ++versionReads : Reflect.get(target, property, target); } });
  const activeToken = new vscode.CancellationTokenSource();
  deepStrictEqual(new SvgDocumentSymbolProvider().provideDocumentSymbols(stale, activeToken.token), []);
  activeToken.dispose();
  await vscode.commands.executeCommand('outline.focus');
  const probe = await WorkbenchProbe.connect();
  const text = () => probe.evaluate<string>(`document.querySelector('.outline-pane')?.innerText ?? ''`);
  try {
    await waitFor(async () => (await text()).includes('svg'), 'native SVG Outline');
    for (let i = 0; i < 8; i++) {
      if (!await probe.evaluate<boolean>(`!!document.querySelector('.outline-pane .monaco-list-row[aria-expanded="false"]')`)) break;
      await probe.click(`document.querySelector('.outline-pane .monaco-list-row[aria-expanded="false"] .monaco-tl-twistie')`);
      await pause();
    }
    await waitFor(async () => (await text()).includes('rect#start') && (await text()).includes('text'), 'expanded root/container/leaf hierarchy');
    await pause();
    await probe.click(`Array.from(document.querySelectorAll('.outline-pane .monaco-list-row')).find(row => row.innerText.includes('rect#start')).querySelector('.label-name')`);
    await pause();
    await probe.capture(resolve(output, 'svg-outline-navigation.png'));
    await waitFor(async () => vscode.window.activeTextEditor?.selection.active.line === 2, 'click navigates to rect source');
    const initialUi = await text();
    await replace(original.replace('id="start"', 'id="updated"'));
    await waitFor(async () => (await text()).includes('rect#updated') && !(await text()).includes('rect#start'), 'unsaved editing update');
    await probe.capture(resolve(output, 'svg-outline-updated.png'));
    const updatedUi = await text();
    await replace('<svg><g id="unfinished">');
    await waitFor(async () => (await symbols()).length === 0 && !(await text()).includes('rect#updated'), 'invalid XML clears stale symbols');
    await probe.capture(resolve(output, 'svg-outline-incomplete.png'));
    const invalidUi = await text();
    await replace(original);
    await waitFor(async () => (await symbols())[0]?.children[0]?.children[0]?.name === 'rect#start', 'XML recovery');
    await waitFor(async () => await probe.evaluate<boolean>(`Array.from(document.querySelectorAll('.outline-pane .label-name')).some(e => e.textContent === 'svg')`), 'native Outline recovers');
    for (let i = 0; i < 8; i++) {
      if (!await probe.evaluate<boolean>(`!!document.querySelector('.outline-pane .monaco-list-row[aria-expanded="false"]')`)) break;
      await probe.click(`document.querySelector('.outline-pane .monaco-list-row[aria-expanded="false"] .monaco-tl-twistie')`);
      await pause();
    }
    await waitFor(async () => (await text()).includes('rect#start'), 'native recovered leaf');
    const recoveredUi = await text();
    await probe.capture(resolve(output, 'svg-outline-recovered.png'));
    // The same .SVG path remains supported even when its editor language is XML.
    const uppercase = vscode.Uri.joinPath(rootUri, 'UPPER.SVG');
    await vscode.workspace.fs.writeFile(uppercase, Buffer.from('<svg><path/></svg>'));
    const upperDoc = await vscode.workspace.openTextDocument(uppercase);
    await vscode.languages.setTextDocumentLanguage(upperDoc, 'xml');
    const upperSymbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', uppercase);
    equal(upperSymbols?.[0]?.children[0]?.name, 'path');
    await vscode.workspace.fs.delete(uppercase);
    // Provider range mapping uses UTF-16 offsets, not the XML parser's columns.
    const edgeText = '<svg xmlns:s="http://www.w3.org/2000/svg">\r\n<!--😀--><s:g\r\n id="中文"><s:rect/></s:g></svg>';
    await replace(edgeText);
    const edge = await symbols();
    const prefixed = edge[0]?.children[0];
    equal(prefixed?.name, 's:g#中文');
    equal(prefixed?.selectionRange.start.line, 1);
    equal(document.getText(prefixed!.selectionRange), 's:g');
    equal(document.getText(prefixed!.children[0]!.range), '<s:rect/>');
    writeFileSync(resolve(output, 'outline-checks.json'), JSON.stringify({
      initialUi, updatedUi, invalidUi, recoveredUi, clickLine: 3, nesting: 'passed', noId: 'passed', unsavedUpdate: 'passed', incompleteXml: 'passed', recovery: 'passed', cancellation: 'passed', staleVersion: 'passed', xmlLanguageUppercasePath: 'passed', utf16Ranges: 'passed', installed: !!process.env.SVG_TEST_VSIX,
    }, null, 2));
  } finally {
    await replace(original);
    await vscode.commands.executeCommand('workbench.action.files.revert');
    probe.dispose();
  }
}
