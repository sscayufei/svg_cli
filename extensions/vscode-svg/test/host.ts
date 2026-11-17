import { ok, equal } from 'node:assert/strict';
import { existsSync, writeFileSync } from 'node:fs';
import * as vscode from 'vscode';
import type { ExtensionLifecycle } from '../src/ExtensionLifecycle';
import { dirname, resolve } from 'node:path';
import { WorkbenchProbe } from './WorkbenchProbe';
import { SvgFileDecorationProvider } from '../src/SvgFileDecorationProvider';
import { createHash } from 'node:crypto';
import { verifySvgOutline } from './SvgOutlineHostChecks';

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function waitFor(predicate: () => boolean | Promise<boolean>, description: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await predicate()) return;
    await pause(200);
  }
  throw new Error(`Timed out: ${description}`);
}

async function verifyBadges(): Promise<object> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  ok(root);
  equal(vscode.workspace.textDocuments.some(doc => doc.uri.path.endsWith('.svg')), false, 'badges work before opening SVG');
  const provider = new SvgFileDecorationProvider();
  const cancellation = new vscode.CancellationTokenSource();
  const changes = new Set<string>();
  const changeKey = (uri: vscode.Uri) => process.platform === 'win32' ? uri.path.toLowerCase() : uri.path;
  const listener = provider.onDidChangeFileDecorations(uri => changes.add(changeKey(uri)));
  const example = vscode.Uri.joinPath(root, 'example.svg');
  const folder = vscode.Uri.joinPath(root, 'folder.svg');
  const created = vscode.Uri.joinPath(root, 'new.svg');
  const renamed = vscode.Uri.joinPath(root, 'renamed.svg');
  const text = vscode.Uri.joinPath(root, 'plain.txt');
  const snapshot = async () => Object.fromEntries(await Promise.all((await vscode.workspace.fs.readDirectory(root)).map(async ([name, type]) => [name, type === vscode.FileType.File ? createHash('sha256').update(await vscode.workspace.fs.readFile(vscode.Uri.joinPath(root, name))).digest('hex') : 'directory'])));
  await vscode.workspace.fs.createDirectory(folder);
  const before = await snapshot();
  const probe = await WorkbenchProbe.connect();
  try {
    equal((await provider.provideFileDecoration(example, cancellation.token))?.badge, '[]');
    equal((await provider.provideFileDecoration(example, cancellation.token))?.propagate, false);
    equal(await provider.provideFileDecoration(text, cancellation.token), undefined);
    equal(await provider.provideFileDecoration(folder, cancellation.token), undefined);
    equal(await provider.provideFileDecoration(root, cancellation.token), undefined);
    equal(await provider.provideFileDecoration(vscode.Uri.joinPath(root, 'missing.svg'), cancellation.token), undefined);
    await vscode.commands.executeCommand('workbench.view.explorer');
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(text));
    await vscode.commands.executeCommand('revealInExplorer', example);
    await vscode.commands.executeCommand('workbench.action.closeAuxiliaryBar');
    await vscode.commands.executeCommand('notifications.clearAll');
    const rowExpression = `Array.from(document.querySelectorAll('.monaco-list-row')).find(row => row.innerText.includes('example.svg'))`;
    const readBadge = `(() => { const row = ${rowExpression}; if (!row) return ''; return [row, ...row.querySelectorAll('*')].map(e => getComputedStyle(e,'::after').content + getComputedStyle(e,'::before').content).join(' '); })()`;
    const output = dirname(process.env.SVG_EXTENSION_EVIDENCE!);
    await pause(1200);
    writeFileSync(resolve(output, 'explorer-dom.json'), JSON.stringify(await probe.evaluate(`({html: (${rowExpression})?.outerHTML, badge: ${readBadge}})`), null, 2));
    await probe.capture(resolve(output, 'svg-badge.png'));
    await waitFor(async () => String(await probe.evaluate(readBadge)).includes('[]'), 'real Explorer badge rendered');
    await vscode.workspace.fs.writeFile(created, Buffer.from('<svg/>'));
    await waitFor(() => changes.has(changeKey(created)), 'create refresh');
    equal((await provider.provideFileDecoration(created, cancellation.token))?.badge, '[]');
    changes.clear();
    await vscode.workspace.fs.writeFile(created, Buffer.from('<svg id="edited"/>'));
    await waitFor(() => changes.has(changeKey(created)), 'edit refresh');
    changes.clear();
    await vscode.workspace.fs.rename(created, renamed);
    await waitFor(() => changes.has(changeKey(created)) && changes.has(changeKey(renamed)), 'rename refresh for both paths');
    equal(await provider.provideFileDecoration(created, cancellation.token), undefined);
    equal((await provider.provideFileDecoration(renamed, cancellation.token))?.badge, '[]');
    changes.clear();
    await vscode.workspace.fs.delete(renamed);
    await waitFor(() => changes.has(changeKey(renamed)), 'delete refresh');
    equal(await provider.provideFileDecoration(renamed, cancellation.token), undefined);
    cancellation.cancel();
    equal(await provider.provideFileDecoration(example, cancellation.token), undefined);
    const after = await snapshot();
    equal(JSON.stringify(before), JSON.stringify(after), 'fixture names and bytes unchanged');
    provider.dispose();
    const afterDisposal = new vscode.CancellationTokenSource();
    equal(await provider.provideFileDecoration(example, afterDisposal.token), undefined);
    afterDisposal.dispose();
    const evidence = { noSvgOpened: true, before, after, refresh: ['create', 'change', 'rename-old', 'rename-new', 'delete'], directoryExcluded: true, missingExcluded: true, cancellation: 'passed', disposal: 'passed', explorerBadge: await probe.evaluate(readBadge) };
    writeFileSync(resolve(output, 'badge-checks.json'), JSON.stringify(evidence, null, 2));
    return evidence;
  } finally { probe.dispose(); listener.dispose(); provider.dispose(); cancellation.dispose(); }
}

async function observeOutline(): Promise<void> {
  const root = vscode.workspace.workspaceFolders?.[0]?.uri;
  ok(root);
  const uri = vscode.Uri.joinPath(root, 'outline-observation.ts');
  const document = await vscode.workspace.openTextDocument(uri);
  await vscode.window.showTextDocument(document);
  await vscode.commands.executeCommand('outline.focus');
  const probe = await WorkbenchProbe.connect();
  try {
    let symbols: vscode.DocumentSymbol[] = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      symbols = await vscode.commands.executeCommand<vscode.DocumentSymbol[]>('vscode.executeDocumentSymbolProvider', uri) ?? [];
      if (symbols.length) break;
      await pause(250);
    }
    ok(symbols.some(symbol => symbol.name === 'Flow'));
    await pause(1000);
    const flowRow = `Array.from(document.querySelectorAll('.outline-pane .monaco-list-row')).find(row => row.innerText.includes('Flow'))`;
    await probe.click(`(${flowRow}).querySelector('.monaco-tl-twistie')`);
    await waitFor(async () => !String(await probe.evaluate(`document.querySelector('.outline-pane')?.innerText`)).includes('start'), 'outline collapse');
    await probe.click(`(${flowRow}).querySelector('.monaco-tl-twistie')`);
    await waitFor(async () => String(await probe.evaluate(`document.querySelector('.outline-pane')?.innerText`)).includes('start'), 'outline expand');
    const before = await probe.evaluate<string>(`document.querySelector('.outline-pane')?.innerText`);
    await probe.click(`Array.from(document.querySelectorAll('.outline-pane .monaco-list-row')).find(row => row.innerText.includes('finish'))`);
    await pause(300);
    equal(vscode.window.activeTextEditor?.selection.active.line, 6);
    const output = dirname(process.env.SVG_EXTENSION_EVIDENCE!);
    await probe.capture(resolve(output, 'outline-before.png'));
    const edit = new vscode.WorkspaceEdit();
    edit.replace(uri, new vscode.Range(6, 9, 6, 15), 'complete');
    ok(await vscode.workspace.applyEdit(edit));
    for (let attempt = 0; attempt < 40; attempt++) {
      if (await probe.evaluate<boolean>(`document.querySelector('.outline-pane')?.innerText.includes('complete')`)) break;
      await pause(250);
    }
    const after = await probe.evaluate<string>(`document.querySelector('.outline-pane')?.innerText`);
    ok(after.includes('complete'));
    await probe.capture(resolve(output, 'outline-after.png'));
    writeFileSync(resolve(output, 'outline-observation.json'), JSON.stringify({ before, after, collapseExpand: 'passed', clickLine: 7, symbols: symbols.map(s => ({ name: s.name, children: s.children.map(c => c.name) })) }, null, 2));
    await vscode.commands.executeCommand('workbench.action.files.revert');
  } finally { probe.dispose(); }
}

/** test-electron invokes this export inside the real Extension Host. */
export async function run(): Promise<void> {
  equal(vscode.version, '1.143.1', 'recorded test host version must match the pinned target');
  const extension = vscode.extensions.getExtension<ExtensionLifecycle>('svgframe-local.svg-cli-companion');
  ok(extension, 'development extension must be discoverable');
  if (process.env.SVG_TEST_VSIX) {
    ok(!extension.extensionPath.toLowerCase().startsWith(resolve(__dirname, '../../../..').toLowerCase()), 'installed bundle must be outside repository dependency tree');
    equal(existsSync(resolve(extension.extensionPath, 'node_modules')), false);
    equal(extension.packageJSON.version, '0.2.0');
  }
  await waitFor(() => extension.isActive, 'automatic startup activation');
  const api = await extension.activate();
  equal(extension.isActive, true);
  equal(api.disposed, false);
  if (process.env.SVG_OBSERVE_OUTLINE === '1') await observeOutline();
  else { await verifyBadges(); await verifySvgOutline(); }
  api.dispose();
  equal(api.disposed, true);
  const evidence = { vscode: vscode.version, versions: process.versions, activation: 'passed', disposal: 'passed', installedVsix: !!process.env.SVG_TEST_VSIX, extensionPath: extension.extensionPath };
  console.log(JSON.stringify(evidence));
  const evidencePath = process.env.SVG_EXTENSION_EVIDENCE;
  if (evidencePath) writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
}
