import { StatsPlugin } from '@svgframe/command-stats';
import { runApplication } from '../../../dist/host/bootstrap.js';

// Keep the stats-only A/B suite independent of later optional code contributions.
await runApplication({ codePlugins: [{ module: '@svgframe/command-stats', plugin: new StatsPlugin() }] });
