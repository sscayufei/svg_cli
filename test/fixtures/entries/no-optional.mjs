import { fileURLToPath } from 'node:url';
import { runApplication } from '../../../dist/host/bootstrap.js';

// Baseline wrapper: the frozen bootstrap and explicit empty config disable optional code contributions.
await runApplication({ args: ['--config', fileURLToPath(new URL('./no-optional.json', import.meta.url))] });
