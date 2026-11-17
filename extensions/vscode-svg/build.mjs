import { build } from 'esbuild';
import { writeFileSync } from 'node:fs';
const result = await build({
  entryPoints: ['src/extension.ts'],
  outfile: 'dist/extension.cjs',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node22',
  external: ['vscode'],
  sourcemap: true,
  metafile: true,
});
writeFileSync('dist/bundle-meta.json', JSON.stringify(result.metafile, null, 2));
