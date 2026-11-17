import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { measureFiles } from './lib/source-metrics.mjs';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2); const before = args.shift() ?? 'final'; const after = args.shift() ?? 'HEAD';
const outputIndex = args.indexOf('--output');
if (args.length && (args.length !== 2 || outputIndex !== 0)) throw new Error('usage: metrics <before> <after> [--output <prefix>]');
const rules = JSON.parse(readFileSync(new URL('./metrics-rules.json', import.meta.url), 'utf8'));
function git(args) { const result = spawnSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 }); if (result.error) throw result.error; if (result.status) throw new Error(result.stderr.toString()); return result.stdout; }
function collect(revision) {
  const sha = git(['rev-parse','--verify',`${revision}^{commit}`]).toString().trim();
  const entries = git(['ls-tree','-r','--name-only','-z',sha]).toString().split('\0').filter(path => path.endsWith('.ts') && !path.endsWith('.d.ts') && !path.split('/').some(part => rules.exclusions.includes(part)))
    .map(path => ({ path, rule: rules.categories.find(rule => rule.prefixes.some(prefix => path.startsWith(prefix))) })).filter(entry => entry.rule);
  if (!entries.some(entry => entry.rule.category === 'core') || !entries.some(entry => entry.rule.category === 'host')) throw new Error(`unsupported source layout: ${sha}`);
  const temporary = resolve(root, '.tmp/phase2'); mkdirSync(temporary, { recursive: true }); const cwd = mkdtempSync(resolve(temporary, 'metrics-'));
  writeFileSync(resolve(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions: { target: 'ESNext', module: 'NodeNext', moduleResolution: 'NodeNext', noLib: true }, include: ['**/*.ts'] }));
  for (const entry of entries) { const file = resolve(cwd, entry.path); mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, git(['show',`${sha}:${entry.path}`]).toString('utf8').replace(/\r\n?/g,'\n')); }
  const files = measureFiles(entries.map(entry => resolve(cwd, entry.path)), cwd).map((measurement, index) => ({ ...measurement, file: relative(cwd, measurement.file).replaceAll('\\','/'), category: entries[index].rule.category, responsibility: entries[index].rule.responsibility }));
  const totals = Object.fromEntries([...rules.categories.map(rule => rule.category), 'cliTotal'].map(category => {
    const selected = files.filter(file => category === 'cliTotal' ? file.category !== 'vscode' : file.category === category);
    return [category, Object.fromEntries(['fileCount','physicalLines','codeLines','functionCount','functionComplexity','topLevelDecisions'].map(key => [key, key === 'fileCount' ? selected.length : selected.reduce((sum, file) => sum + file[key], 0)]))];
  }));
  return { revision, sha, totals, files };
}
const baseline = collect(before); const current = collect(after);
const delta = Object.fromEntries(Object.entries(current.totals).map(([category, values]) => [category, Object.fromEntries(Object.entries(values).map(([key,value]) => [key, value - baseline.totals[category][key]]))]));
const result = { schemaVersion: 1, tools: { node: process.version, typescript: ts.version }, rules, baseline, current, delta,
  note: 'Historical Git blobs only. Moving built-in commands/shapes into plugins redistributes categories; compare cliTotal too. VSCode is separate. This snapshot does not include uncommitted work.' };
const prefix = resolve(root, outputIndex === 0 ? args[1] : `docs/metrics/${baseline.sha.slice(0,7)}-to-${current.sha.slice(0,7)}`);
mkdirSync(dirname(prefix), { recursive: true }); writeFileSync(`${prefix}.json`, JSON.stringify(result,null,2)+'\n');
const table = ['| Category | Files before/after | Code lines before/after | Function complexity before/after | Top-level decisions before/after |','|---|---|---|---|---|',
  ...Object.keys(current.totals).map(category => { const a=baseline.totals[category], b=current.totals[category]; return `| ${category} | ${a.fileCount}/${b.fileCount} | ${a.codeLines}/${b.codeLines} | ${a.functionComplexity}/${b.functionComplexity} | ${a.topLevelDecisions}/${b.topLevelDecisions} |`; })];
writeFileSync(`${prefix}.md`, `# Historical source metrics\n\nBefore: ${baseline.sha}\n\nAfter: ${current.sha}\n\n${result.note}\n\n${table.join('\n')}\n\nRules: ${rules.complexity}\n\nLines: ${rules.lines}\n\nTools: Node ${process.version}, TypeScript ${ts.version}. File responsibilities, physical lines, per-function details and deltas are in the adjacent JSON.\n`);
console.log(`Metrics: ${prefix}.json / .md (${baseline.sha} -> ${current.sha})`);
