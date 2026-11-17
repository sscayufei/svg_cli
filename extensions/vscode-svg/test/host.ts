import { ok, equal } from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import * as vscode from 'vscode';
import type { ExtensionLifecycle } from '../src/ExtensionLifecycle';

/** test-electron invokes this export inside the real Extension Host. */
export async function run(): Promise<void> {
  equal(vscode.version, '1.143.1', 'recorded test host version must match the pinned target');
  const extension = vscode.extensions.getExtension<ExtensionLifecycle>('svgframe-local.svg-cli-companion');
  ok(extension, 'development extension must be discoverable');
  const api = await extension.activate();
  equal(extension.isActive, true);
  equal(api.disposed, false);
  api.dispose();
  equal(api.disposed, true);
  const evidence = { vscode: vscode.version, versions: process.versions, activation: 'passed', disposal: 'passed' };
  console.log(JSON.stringify(evidence));
  const evidencePath = process.env.SVG_EXTENSION_EVIDENCE;
  if (evidencePath) writeFileSync(evidencePath, JSON.stringify(evidence, null, 2) + '\n');
}
