import { runApplication } from './bootstrap.js';

runApplication({ args: process.argv.slice(2) }).catch(() => {
  process.stderr.write('error: CLI input failed\n');
  process.exitCode = 1;
});
