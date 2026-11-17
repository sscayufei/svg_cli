import { readdirSync, readFileSync, rmSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const directories = manifest.workspaces.flatMap(pattern => pattern.endsWith('/*')
  ? readdirSync(resolve(root, pattern.slice(0, -2)), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => pattern.slice(0, -1) + entry.name)
  : [pattern]);
const projects = directories.filter(path => process.argv.includes('--all') || !path.startsWith('extensions/')).map(path => ({ path, ...JSON.parse(readFileSync(resolve(root, path, 'package.json'), 'utf8')) }));
const byName = new Map(projects.map(project => [project.name, project]));
const completed = new Set();
const visiting = new Set();
function clean(directory) {
  const target = resolve(root, directory, 'dist');
  const local = relative(root, target);
  if (!local || isAbsolute(local) || local.startsWith('..')) throw new Error('build output outside workspace');
  rmSync(target, { recursive: true, force: true });
}
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
function build(project) {
  if (completed.has(project.name)) return;
  if (visiting.has(project.name)) throw new Error(`workspace dependency cycle: ${project.name}`);
  visiting.add(project.name);
  for (const name of Object.keys({ ...project.dependencies, ...project.devDependencies }).sort()) if (byName.has(name)) build(byName.get(name));
  clean(project.path);
  run([process.env.npm_execpath, 'run', 'build', '--workspace', project.name]);
  visiting.delete(project.name);
  completed.add(project.name);
}
for (const project of projects.sort((a, b) => a.name.localeCompare(b.name))) build(project);
clean('.');
run([resolve(root, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.json']);
