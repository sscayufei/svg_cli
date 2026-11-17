import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
function run(executable, args, options = {}) {
  const result = spawnSync(executable, args, { cwd: root, timeout: 180_000, maxBuffer: 32 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${executable} ${args.join(' ')} failed:\n${result.stderr?.toString()}`);
  return result;
}
function contained(base, candidate) {
  const path = relative(base, candidate);
  if (isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) throw new Error('path outside run directory');
  return candidate;
}
const revision = process.argv[2] ?? 'final';
const baselineSha = run('git', ['rev-parse', '--verify', `${revision}^{commit}`]).stdout.toString().trim();
const outputRoot = resolve(root, '.tmp/phase2');
mkdirSync(outputRoot, { recursive: true });
const output = mkdtempSync(resolve(outputRoot, 'baseline-'));
const baseline = resolve(output, 'source');
mkdirSync(baseline);
const files = run('git', ['ls-tree', '-r', '--name-only', baselineSha]).stdout.toString().trim().split('\n');
const selected = files.filter(name => name.startsWith('src/') || ['package.json', 'package-lock.json', 'tsconfig.json'].includes(name));
if (!selected.some(name => name === 'src/cli/main.ts')) throw new Error('baseline CLI source not found');
for (const name of selected) {
  const target = contained(baseline, resolve(baseline, name));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, run('git', ['show', `${baselineSha}:${name}`]).stdout);
}
// Use the historical lockfile, not the current workspace's dependency tree.
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('run through npm run verify:baseline so npm_execpath is available');
run(process.execPath, [npmCli, 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: baseline });
run(process.execPath, [resolve(baseline, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json'], { cwd: baseline });
const currentEntry = resolve(root, process.env.SVG_CLI_ENTRY ?? 'dist/host/main.js');
const transcripts = resolve(root, 'doc/transcript');
const cwd = resolve(output, 'cwd');
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
function outputs(directory, prefix = '') {
  const result = {};
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) Object.assign(result, outputs(resolve(directory, entry.name), `${name}/`));
    else result[name] = digest(readFileSync(resolve(directory, entry.name)));
  }
  return result;
}
function replay(entry, input) {
  // This is exclusively the generated run's cwd; verify before recursive cleanup.
  contained(output, cwd);
  rmSync(cwd, { recursive: true, force: true });
  mkdirSync(cwd);
  copyFileSync(resolve(transcripts, 'inputs/other.svg'), resolve(cwd, 'other.svg'));
  const result = run(process.execPath, [entry], { cwd, input });
  return { ...result, files: outputs(cwd) };
}
const sessions = readdirSync(transcripts).filter(name => /^cli-1.*\.txt$/.test(name)).sort();
if (!sessions.length) throw new Error('no transcripts found');
const evidence = { baselineSha, currentHead: run('git', ['rev-parse', 'HEAD']).stdout.toString().trim(), currentEntry, sessions: [] };
for (const name of sessions) {
  const input = readFileSync(resolve(transcripts, name));
  const before = replay(resolve(baseline, 'dist/cli/main.js'), input);
  cpSync(cwd, resolve(output, `${name}.final.files`), { recursive: true });
  const after = replay(currentEntry, input);
  cpSync(cwd, resolve(output, `${name}.current.files`), { recursive: true });
  for (const stream of ['stdout', 'stderr']) {
    writeFileSync(resolve(output, `${name}.final.${stream}`), before[stream]);
    writeFileSync(resolve(output, `${name}.current.${stream}`), after[stream]);
    const golden = readFileSync(resolve(transcripts, `expected/${name}.final.${stream}`));
    if (!before[stream].equals(golden)) throw new Error(`${name}: checked-in ${stream} golden differs from historical baseline`);
    if (!before[stream].equals(after[stream])) throw new Error(`${name}: raw ${stream} differs; evidence: ${output}`);
  }
  if (JSON.stringify(before.files) !== JSON.stringify(after.files)) throw new Error(`${name}: generated file bytes differ`);
  evidence.sessions.push({ name, inputSha256: digest(input), stdoutSha256: digest(after.stdout), stderrSha256: digest(after.stderr), files: after.files });
}
writeFileSync(resolve(output, 'result.json'), JSON.stringify(evidence, null, 2) + '\n');
console.log(`PASS: ${sessions.length} sessions match ${baselineSha} byte for byte. Evidence: ${output}`);
