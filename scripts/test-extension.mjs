import { runTests } from '@vscode/test-electron';
import { cpSync, mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';

const root = fileURLToPath(new URL('../', import.meta.url));
const outputRoot = resolve(root, '.tmp/phase2');
mkdirSync(outputRoot, { recursive: true });
const runDirectory = mkdtempSync(resolve(outputRoot, 'extension-'));
const workspace = resolve(runDirectory, 'workspace');
cpSync(resolve(root, 'extensions/vscode-svg/fixtures'), workspace, { recursive: true });
const server = createServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const debugPort = server.address().port;
await new Promise(resolve => server.close(resolve));
// Codex/VSCode terminals may inherit this flag; the test child must run as Electron.
delete process.env.ELECTRON_RUN_AS_NODE;
await runTests({
  version: '1.143.1',
  ...(process.env.SVG_VSCODE_EXECUTABLE ? { vscodeExecutablePath: process.env.SVG_VSCODE_EXECUTABLE } : {}),
  extensionDevelopmentPath: resolve(root, 'extensions/vscode-svg'),
  extensionTestsPath: resolve(root, 'extensions/vscode-svg/dist/test/host.js'),
  extensionTestsEnv: { SVG_EXTENSION_EVIDENCE: resolve(runDirectory, 'host.json'), SVG_CDP_PORT: String(debugPort) },
  launchArgs: [
    workspace,
    '--user-data-dir', resolve(runDirectory, 'user-data'),
    '--extensions-dir', resolve(runDirectory, 'extensions'),
    '--disable-extensions', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust',
    `--remote-debugging-port=${debugPort}`,
  ],
});
console.log(`Extension evidence: ${resolve(runDirectory, 'host.json')}`);
