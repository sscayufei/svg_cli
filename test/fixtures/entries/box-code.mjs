import { StatsPlugin } from '@svgframe/command-stats';
import { DirPlugin } from '@svgframe/command-dir';
import { BoxPlugin } from '@svgframe/shape-box';
import { runApplication } from '../../../dist/host/bootstrap.js';

await runApplication({ codePlugins: [
  { module: '@svgframe/command-stats', plugin: new StatsPlugin() },
  { module: '@svgframe/command-dir', plugin: new DirPlugin() },
  { module: '@svgframe/shape-box', plugin: new BoxPlugin() },
] });
