import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// Final four-plugin assembly replay. This tool never changes Git refs or production source.
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--source')) throw new Error('usage: node scripts/verify-phase2-release.mjs [--source built-source-directory]');
const source = args.length ? resolve(args[1]) : root;
const main = resolve(source, 'dist/host/main.js'); const config = resolve(source, 'plugins.config.json');
if (!existsSync(main) || !existsSync(config)) throw new Error('build the source directory first');
const manifests = ['command-stats', 'command-dir', 'shape-box', 'tree-star'];
const modules = manifests.map(name => JSON.parse(readFileSync(resolve(source, 'plugins', name, 'package.json'), 'utf8')).name);
const configured = JSON.parse(readFileSync(config, 'utf8')).plugins;
if (JSON.stringify(configured) !== JSON.stringify(modules.map(module => ({ module })))) throw new Error('root configuration must contain the four release plugins in order without options');
const outputRoot = resolve(root, '.tmp/phase2'); mkdirSync(outputRoot, { recursive: true });
const output = mkdtempSync(resolve(outputRoot, 'release-'));
const digest = value => createHash('sha256').update(value).digest('hex');
const cases = [
  ['basics', 'cli-1-basics.txt'], ['lecture', 'cli-1.txt'], ['flowchart', 'cli-1-flowchart.txt'],
  ['box', 'cli-2-box.txt'], ['commands', 'cli-2-commands.txt', true], ['labels', 'cli-2-star-release.txt', true],
];
function files(directory, prefix = '') {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).flatMap(entry => {
    const name = prefix + entry.name; const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) return [[name, `link:${digest(readlinkSync(path))}`]];
    return entry.isDirectory() ? Object.entries(files(path, `${name}/`)) : [[name, digest(readFileSync(path))]];
  }));
}
const results = [];
for (const [name, transcript, directoryFixture] of cases) {
  const inputPath = resolve(root, 'doc/transcript', transcript); const input = readFileSync(inputPath);
  const evidence = resolve(output, name); const work = resolve(evidence, 'work'); const cwd = resolve(work, 'cwd');
  mkdirSync(evidence);
  writeFileSync(resolve(evidence, 'input.txt'), input);
  function replay(label, cliArgs) {
    const path = relative(output, work);
    if (!path || isAbsolute(path) || path === '..' || path.startsWith(`..${sep}`)) throw new Error('refuse cleanup outside generated run');
    rmSync(work, { recursive: true, force: true }); mkdirSync(cwd, { recursive: true });
    if (directoryFixture) cpSync(resolve(root, 'doc/transcript/inputs/dir-workspace'), cwd, { recursive: true });
    else cpSync(resolve(root, 'doc/transcript/inputs/other.svg'), resolve(cwd, 'other.svg'));
    const command = [main, ...cliArgs];
    const result = spawnSync(process.execPath, command, { cwd, input, maxBuffer: 32 * 1024 * 1024, timeout: 120_000 });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${name}/${label} exited ${result.status}: ${result.stderr}`);
    for (const stream of ['stdout', 'stderr']) writeFileSync(resolve(evidence, `${label}.${stream}`), result[stream]);
    const generated = files(work);
    cpSync(work, resolve(evidence, `${label}.files`), { recursive: true });
    return { command, result, generated };
  }
  const a = replay('code', []); const b = replay('config', ['--config', config]);
  for (const stream of ['stdout', 'stderr']) if (!a.result[stream].equals(b.result[stream])) throw new Error(`${name}: raw ${stream} differs; evidence ${evidence}`);
  if (JSON.stringify(a.generated) !== JSON.stringify(b.generated)) throw new Error(`${name}: generated files differ; evidence ${evidence}`);
  if (name === 'labels') {
    // Raw equality above is independent of this separate human-authored semantic expectation.
    const expected = readFileSync(resolve(root, 'doc/transcript/expected/cli-2-star.stdout.txt'), 'utf8')
      .replaceAll('star-saved.svg', '../star-saved.svg').replaceAll('star-roundtrip.svg', '../star-roundtrip.svg').trim();
    const actual = a.result.stdout.toString('utf8').replace(/\r\n/g, '\n').replace(/^(?:svg> )+/gm, '').trim();
    const expectedErrors = readFileSync(resolve(root, 'doc/transcript/expected/cli-2-star.stderr.txt'), 'utf8').replaceAll('missing/fail.svg', '../missing/fail.svg');
    if (actual !== expected || a.result.stderr.toString('utf8') !== expectedErrors) throw new Error('labels differ from manual expectations');
    if (!a.generated['star-saved.svg'] || !a.generated['star-roundtrip.svg'] || Object.keys(a.generated).some(path => /^cwd\/star-/.test(path))) throw new Error('label save targets must stay outside the listed directory');
  }
  results.push({ name, transcript, cwd, inputSha256: digest(input), codeCommand: a.command, configCommand: b.command,
    stdoutSha256: digest(a.result.stdout), stderrSha256: digest(a.result.stderr), files: a.generated });
}
const result = { node: process.version, source, modules, config, cases: results };
writeFileSync(resolve(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`PASS: ${results.length} complete four-plugin A/B sessions match raw streams and all generated files. Evidence: ${output}`);
