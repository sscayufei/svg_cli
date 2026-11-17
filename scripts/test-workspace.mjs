import { spawnSync } from 'node:child_process';
import { relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const packagePath = relative(root, process.cwd()).replaceAll('\\', '/');
if (!/^plugins\/[^/]+$/.test(packagePath)) throw new Error('run from a plugin workspace');
const result = spawnSync(process.execPath, [resolve(root, 'node_modules/vitest/vitest.mjs'), 'run', '--root', root, '--config', resolve(root, 'vitest.config.ts'), `${packagePath}/test`], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
