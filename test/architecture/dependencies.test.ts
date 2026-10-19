import { readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../src/', import.meta.url));
const files = readdirSync(root, { recursive: true, encoding: 'utf8' })
  .filter(file => file.endsWith('.ts')).map(file => resolve(root, file));
const sources = files.map(file => ({ file, source: readFileSync(file, 'utf8'), layer: relative(root, file).split(sep)[0] }));
// Guards the current static imports/re-exports; code review also checks runtime dependencies.
const edges = sources.flatMap(entry => [...entry.source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(match => {
  const specifier = match[1] ?? '';
  const target = specifier.startsWith('.') ? resolve(dirname(entry.file), specifier.replace(/\.js$/, '.ts')) : null;
  return { ...entry, specifier, target, targetLayer: target === null ? null : relative(root, target).split(sep)[0] };
}));

describe('Layer boundaries and class organization', () => {
  it('keeps all domain dependencies inside domain', () => {
    for (const edge of edges.filter(edge => edge.layer === 'domain')) {
      expect(edge.targetLayer, `${edge.file}: ${edge.specifier}`).toBe('domain');
    }
  });

  it('keeps application independent of concrete infrastructure, CLI and Node I/O', () => {
    for (const edge of edges.filter(edge => edge.layer === 'application')) {
      expect(['application', 'domain'], `${edge.file}: ${edge.specifier}`).toContain(edge.targetLayer);
    }
  });

  it('allows only the CLI composition root to depend on concrete infrastructure', () => {
    for (const edge of edges.filter(edge => edge.layer === 'cli')) {
      if (edge.target === null) expect(edge.specifier).toMatch(/^node:/);
      else if (edge.targetLayer === 'infrastructure') expect(basename(edge.file)).toBe('main.ts');
      else expect(['cli', 'application'], `${edge.file}: ${edge.specifier}`).toContain(edge.targetLayer);
    }
  });

  it('restricts infrastructure application dependencies to ports', () => {
    for (const edge of edges.filter(edge => edge.layer === 'infrastructure')) {
      if (edge.target === null) expect(edge.specifier).toMatch(/^(?:node:|saxes$)/);
      else if (edge.targetLayer === 'application') {
        expect(relative(resolve(root, 'application/ports'), edge.target)).not.toMatch(/^\.\./);
      } else expect(['infrastructure', 'domain']).toContain(edge.targetLayer);
    }
  });

  it('keeps structural mutation symbols inside the aggregate implementation', () => {
    const target = resolve(root, 'domain/internal/TreeAccess.ts');
    expect(edges.filter(edge => edge.target === target).map(edge => basename(edge.file)).sort())
      .toEqual(['SvgDocument.ts', 'SvgGroup.ts', 'SvgNode.ts']);
  });

  it('places each exported production class in its own matching file', () => {
    for (const entry of sources) {
      const classes = [...entry.source.matchAll(/^export (?:abstract )?class\s+(\w+)/gm)].map(match => match[1]);
      expect(classes.length, entry.file).toBeLessThanOrEqual(1);
      if (classes.length === 1) expect(basename(entry.file, '.ts'), entry.file).toBe(classes[0]);
    }
  });
});
