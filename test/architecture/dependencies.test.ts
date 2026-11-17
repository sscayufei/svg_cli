import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as ts from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../', import.meta.url));
const files = ['src/core', 'src/host', 'plugins', 'extensions/vscode-svg/src'].flatMap(directory => readdirSync(resolve(root, directory), { recursive: true, encoding: 'utf8' })
  .filter(name => name.endsWith('.ts') && !name.endsWith('.d.ts') && !name.replaceAll('\\', '/').split('/').some(part => part === 'dist' || part === 'test'))
  .map(name => resolve(root, directory, name)));
const sources = files.map(file => ({ file, path: relative(root, file).replaceAll('\\', '/'), source: readFileSync(file, 'utf8') }));
// TS 7 exposes native snapshots rather than the removed TS 5 createSourceFile API.
const edges = (() => {
const api = new API({ cwd: root });
const snapshot = api.updateSnapshot({ openFiles: files });
try { return sources.flatMap(entry => {
  const specifiers: string[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text);
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) && node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) specifiers.push(node.moduleReference.expression.text);
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText() === 'require')) {
      const argument = node.arguments[0];
      if (argument && ts.isStringLiteral(argument)) specifiers.push(argument.text);
      else if (!entry.path.startsWith('src/host/loading/')) throw new Error(`nonliteral module dependency: ${entry.path}`);
    }
    node.forEachChild(visit);
  };
  const source = snapshot.getDefaultProjectForFile(entry.file)?.program.getSourceFile(entry.file);
  if (!source) throw new Error(`architecture source was not parsed: ${entry.path}`);
  visit(source);
  return specifiers.map(specifier => ({ ...entry, specifier, target: specifier.startsWith('.') ? relative(root, resolve(dirname(entry.file), specifier.replace(/\.js$/, '.ts'))).replaceAll('\\', '/') : null }));
}); } finally { snapshot.dispose(); api.close(); }
})();

describe('Core, host and plugin boundaries', () => {
  it('keeps core independent of host, plugins, Node and external libraries', () => {
    for (const edge of edges.filter(e => e.path.startsWith('src/core/'))) expect(edge.target, `${edge.path}: ${edge.specifier}`).toMatch(/^src\/core\//);
    for (const edge of edges.filter(e => e.path.startsWith('src/core/domain/'))) expect(edge.target, `${edge.path}: ${edge.specifier}`).toMatch(/^src\/core\/domain\//);
  });
  it('restricts plugin imports to their own package and the core public API', () => {
    for (const edge of edges.filter(e => e.path.startsWith('plugins/'))) {
      if (edge.target === null) expect(edge.specifier, edge.path).toBe('@svgframe/core');
      else expect(edge.target, edge.path).toMatch(new RegExp(`^${edge.path.split('/').slice(0, 2).join('/')}/`));
    }
  });
  it('lets only composition import concrete CLI plugins', () => {
    for (const edge of edges.filter(e => e.path.startsWith('src/host/'))) {
      if (edge.specifier.startsWith('@svgframe/') && edge.specifier !== '@svgframe/core') expect(edge.path).toBe('src/host/composition.ts');
      if (edge.path.startsWith('src/host/cli/') && edge.target) expect(edge.target).toMatch(/^src\/host\/cli\//);
      if (edge.target) expect(edge.target).not.toMatch(/^src\/core\//);
    }
  });
  it('isolates infrastructure and the VSCode package from plugin implementations', () => {
    for (const edge of edges.filter(e => e.path.startsWith('src/host/svg/'))) {
      if (edge.target) expect(edge.target).toMatch(/^src\/host\/svg\//);
      else expect(edge.specifier).toMatch(/^(?:@svgframe\/core|node:.*|saxes)$/);
    }
    for (const edge of edges.filter(e => e.path.startsWith('extensions/'))) {
      if (edge.target) expect(edge.target).toMatch(/^extensions\/vscode-svg\/src\//);
      else expect(edge.specifier).toMatch(/^(?:vscode|saxes)$/);
    }
  });
  it('keeps structural mutation symbols private to the aggregate', () => {
    expect(edges.filter(e => e.target === 'src/core/domain/internal/TreeAccess.ts').map(e => basename(e.file)).sort()).toEqual(['SvgDocument.ts', 'SvgGroup.ts', 'SvgNode.ts']);
    expect(readFileSync(resolve(root, 'src/core/public.ts'), 'utf8')).not.toContain('internal');
    const manifest = JSON.parse(readFileSync(resolve(root, 'src/core/package.json'), 'utf8'));
    expect(Object.keys(manifest.exports)).toEqual(['.']);
  });
  it('retains one exported production class per matching file across all packages', () => {
    for (const entry of sources) {
      const classes = [...entry.source.matchAll(/^export (?:abstract )?class\s+(\w+)/gm)].map(match => match[1]);
      expect(classes.length, entry.path).toBeLessThanOrEqual(1);
      if (classes.length) expect(basename(entry.file, '.ts'), entry.path).toBe(classes[0]);
    }
  });
});
