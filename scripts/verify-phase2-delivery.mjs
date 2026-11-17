import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Read-only Git validation plus optional historical metrics generation. No commit/tag/push.
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2); let revision = 'HEAD'; let remote = false; let metrics = false;
while (args.length) {
  const arg = args.shift();
  if (arg === '--revision' && args.length) revision = args.shift();
  else if (arg === '--remote') remote = true;
  else if (arg === '--metrics') metrics = true;
  else throw new Error('usage: node scripts/verify-phase2-delivery.mjs [--revision HEAD|p2] [--metrics] [--remote]');
}
function git(args) {
  const result = spawnSync('git', args, { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  return result.stdout.toString().trim();
}
const recorded = JSON.parse(readFileSync(resolve(root, 'doc/evidence/phase2/p2-6-runtime-source.json'), 'utf8'));
const before = JSON.parse(readFileSync(resolve(root, 'doc/evidence/phase2/p2-6-remote-before.json'), 'utf8'));
const source = git(['rev-parse', '--verify', '--end-of-options', `${recorded.sourceSha}^{commit}`]);
const candidate = git(['rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`]);
const protectedPaths = ['src', 'plugins', 'extensions', 'package.json', 'package-lock.json', 'tsconfig.base.json', 'tsconfig.host.json'];
if (git(['diff', '--name-only', source, candidate, '--', ...protectedPaths])) throw new Error('candidate changes validated runtime/packages/build configuration');
if (git(['diff', '--name-only', source, '--', ...protectedPaths])) throw new Error('working tree changes validated runtime/packages/build configuration');
if (git(['rev-parse', 'final^{commit}']) !== before.localFinalCommit || git(['rev-parse', 'refs/tags/final']) !== before.localFinalTagObject) throw new Error('final tag moved');
const outputRoot = resolve(root, '.tmp/phase2'); mkdirSync(outputRoot, { recursive: true });
const output = mkdtempSync(resolve(outputRoot, 'delivery-'));
let recomputedMetrics;
if (metrics) {
  const prefix = resolve(output, 'final-to-candidate');
  const result = spawnSync(process.execPath, [resolve(root, 'scripts/metrics.mjs'), 'final', candidate, '--output', prefix], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  const actual = JSON.parse(readFileSync(`${prefix}.json`, 'utf8'));
  const expected = JSON.parse(readFileSync(resolve(root, 'docs/metrics/phase2-source.json'), 'utf8'));
  for (const value of ['totals', 'files']) if (JSON.stringify(actual.current[value]) !== JSON.stringify(expected.current[value])) throw new Error(`recomputed ${value} differ from source metrics`);
  if (JSON.stringify(actual.delta) !== JSON.stringify(expected.delta)) throw new Error('recomputed metric deltas differ');
  recomputedMetrics = { file: `${prefix}.json`, sha: actual.current.sha, identicalCountsAndFiles: true };
}
let remoteRefs;
if (remote) {
  if (revision !== 'p2') throw new Error('--remote requires --revision p2');
  remoteRefs = Object.fromEntries(git(['ls-remote', '--heads', '--tags', 'origin']).split('\n').filter(Boolean).map(line => line.split('\t').reverse()));
  const proof = JSON.parse(readFileSync(resolve(root, 'doc/evidence/phase2/p2-4-proof.json'), 'utf8'));
  const required = {
    'refs/heads/master': candidate,
    'refs/heads/phase2/box-a-f5236b5': proof.C_A,
    'refs/heads/phase2/box-b-f5236b5': proof.C_B,
    'refs/tags/final': before.localFinalTagObject,
    'refs/tags/final^{}': before.localFinalCommit,
    'refs/tags/p2': git(['rev-parse', 'refs/tags/p2']),
    'refs/tags/p2^{}': candidate,
  };
  for (const [ref, sha] of Object.entries(required)) if (remoteRefs[ref] !== sha) throw new Error(`remote ref missing or differs: ${ref}`);
}
const result = { revision, candidate, source, runtimeIdentical: true, runtimeFingerprint: recorded.sha256,
  finalTagUnchanged: true, recomputedMetrics: recomputedMetrics ?? null, remoteRefs: remoteRefs ?? null, gitWrites: false };
writeFileSync(resolve(output, 'result.json'), JSON.stringify(result, null, 2) + '\n');
console.log(`PASS: reviewed source, final tag${metrics ? ', historical metrics' : ''}${remote ? ' and remote delivery refs' : ''} verified. Evidence: ${output}`);
