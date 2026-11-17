import { describe, expect, it } from 'vitest';
import { ExtensionRegistry, SvgGroup, type CommandDefinition, type PluginContext, type PluginManifest } from '@svgframe/core';
import { createPluginContext } from '../../src/host/composition.js';
import { PluginInstaller } from '../../src/host/loading/PluginInstaller.js';

class ProbeDefinition {
  public readonly name = 'probe'; public readonly syntax = 'probe'; public readonly description = 'fixture';
  public build() { return { kind: 'query' as const, execute: () => ({ kind: 'lines' as const, lines: ['fixture'] }) }; }
}
class ProbeShape extends SvgGroup { public override get type() { return 'probe'; } }
class ProbeProvider {
  public readonly name = 'probe'; public readonly help = { syntax: 'create probe', description: 'fixture' };
  public create(id: string) { return new ProbeShape(id); } public fromAttributes(id: string) { return this.create(id); }
}
const manifest: PluginManifest = { name: '@fixture/probe', contributes: { shapes: ['probe'], commands: ['probe'], attributes: ['probe'], decorators: ['probe'] } };
function contribute(ctx: PluginContext) {
  ctx.shapeProviders.register(new ProbeProvider()); ctx.commands.register(new ProbeDefinition());
  ctx.attributes.register({ name: 'probe', handles: () => false, apply: () => {} });
  ctx.decorators.register({ name: 'probe', decorate: () => undefined });
}
function names(ctx: PluginContext) { return [ctx.shapeProviders, ctx.commands, ctx.decorators, ctx.attributes].map(reg => reg.values().map(entry => entry.name)); }

describe('Shared plugin installation transaction', () => {
  it('commits all four categories together, preserves read-through services and owns subscriptions until disposal', () => {
    const ctx = createPluginContext(); const installer = new PluginInstaller(ctx); let staged: PluginContext | undefined; let notifications = 0; let released = 0;
    installer.install({ activate(scope: PluginContext, options: unknown) {
      expect(options).toEqual({ value: 'unchanged' }); staged = scope; contribute(scope);
      expect(scope.shapes.create('probe', 'p', []).type).toBe('probe');
      expect(names(ctx)).toEqual([[],[],[],[]]);
      scope.events.subscribe(() => { notifications++; }); scope.resources.add({ dispose: () => { released++; } });
      ctx.session.events.publish('init'); expect(notifications).toBe(0);
    } }, manifest, { value: 'unchanged' });
    expect(names(ctx)).toEqual([['probe'],['probe'],['probe'],['probe']]);
    expect(staged!.commands.values()).toHaveLength(1);
    expect(() => staged!.commands.register(new ProbeDefinition())).toThrow('plugin registration is closed');
    ctx.session.events.publish('init'); expect(notifications).toBe(1);
    installer.dispose(); installer.dispose(); ctx.session.events.publish('init'); expect(notifications).toBe(1); expect(released).toBe(1);
  });
  it.each(['throw','manifest','duplicate'] as const)('rolls back %s after partial contributions and subscriptions, keeping previous and later plugins usable', mode => {
    const ctx = createPluginContext(); const installer = new PluginInstaller(ctx); let notifications = 0; const released: number[] = [];
    installer.install({ activate(scope: PluginContext) { scope.commands.register({ ...new ProbeDefinition(), name: 'before', build: () => new ProbeDefinition().build() }); } }, { name: 'before', contributes: { commands: ['before'] } });
    expect(() => installer.install({ activate(scope: PluginContext) {
      contribute(scope); scope.events.subscribe(() => { notifications++; });
      scope.resources.add({ dispose: () => { released.push(1); } }); scope.resources.add({ dispose: () => { released.push(2); throw new Error('cleanup failed'); } });
      if (mode === 'throw') throw new Error('deliberate failure');
      if (mode === 'duplicate') scope.commands.register(new ProbeDefinition());
    } }, mode === 'manifest' ? { ...manifest, contributes: { commands: ['probe'] } } : manifest)).toThrow(mode === 'manifest' ? 'plugin manifest mismatch:' : mode === 'duplicate' ? 'duplicate registration: commands/probe' : 'plugin failed to activate: @fixture/probe (deliberate failure)');
    expect(names(ctx)).toEqual([[],['before'],[],[]]); expect(released).toEqual([2,1]); expect(installer.diagnostics).toContain('cleanup failed');
    installer.install({ activate(scope: PluginContext) { scope.commands.register(new ProbeDefinition()); } }, { name: 'after', contributes: { commands: ['probe'] } });
    expect(ctx.commands.get('before')!.build([]).execute()).toEqual({ kind: 'lines', lines: ['fixture'] });
    expect(ctx.commands.get('probe')!.build([]).execute()).toEqual({ kind: 'lines', lines: ['fixture'] });
    ctx.session.events.publish('init'); expect(notifications).toBe(0); installer.dispose();
  });
  it('rejects clashes with existing registrations and invalid default exports without replacing anything', () => {
    const ctx = createPluginContext(); ctx.commands.register(new ProbeDefinition()); const installer = new PluginInstaller(ctx);
    const existing = ctx.commands.get('probe');
    expect(() => installer.install({ activate: contribute }, manifest)).toThrow('duplicate registration: commands/probe');
    expect(names(ctx)).toEqual([[],['probe'],[],[]]); expect(ctx.commands.get('probe')).toBe(existing);
    for (const value of [undefined, null, 1, {}, () => ({})]) expect(() => installer.install(value, { name: 'invalid' })).toThrow('plugin failed to activate: invalid');
  });
  it('compares manifest sets in fixed category/name order with omitted categories empty', () => {
    const ctx = createPluginContext(); const installer = new PluginInstaller(ctx);
    expect(() => installer.install({ activate(scope: PluginContext) {
      scope.decorators.register({ name: 'z', decorate: () => '*' }); scope.decorators.register({ name: 'a', decorate: () => '*' });
    } }, { name: 'order', contributes: { attributes: ['expected'] } })).toThrow('plugin manifest mismatch: order (declared: shapes=[]; commands=[]; decorators=[]; attributes=[expected], registered: shapes=[]; commands=[]; decorators=[a,z]; attributes=[])');
    expect(names(ctx)).toEqual([[],[],[],[]]);
    installer.install({ activate(scope: PluginContext) {
      scope.decorators.register({ name: 'z', decorate: () => '*' }); scope.decorators.register({ name: 'a', decorate: () => '*' });
    } }, { name: 'order', contributes: { decorators: ['a','z'] } });
    expect(ctx.decorators.values().map(entry => entry.name)).toEqual(['z','a']);
  });
  it('rejects the whole transaction even if activation catches a duplicate registration error', () => {
    const ctx = createPluginContext();
    expect(() => new PluginInstaller(ctx).install({ activate(scope: PluginContext) {
      scope.commands.register(new ProbeDefinition());
      try { scope.commands.register(new ProbeDefinition()); } catch { /* A plugin cannot suppress an invalid transaction. */ }
    } }, { name: 'caught', contributes: { commands: ['probe'] } })).toThrow('duplicate registration: commands/probe');
    expect(ctx.commands.values()).toEqual([]);
  });
  it('rejects asynchronous activation and disposes subscriptions if event-source binding fails', () => {
    const ctx = createPluginContext(); const installer = new PluginInstaller(ctx);
    expect(() => installer.install({ async activate(scope: PluginContext) { scope.commands.register(new ProbeDefinition()); } }, { name: 'async', contributes: { commands: ['probe'] } })).toThrow('activate must be synchronous');
    expect(ctx.commands.values()).toEqual([]);
    const failing = new PluginInstaller({ ...ctx, events: { diagnostics: [], subscribe: () => { throw new Error('binding failed'); } } });
    expect(() => failing.install({ activate(scope: PluginContext) { scope.commands.register(new ProbeDefinition()); scope.events.subscribe(() => {}); } }, { name: 'binding', contributes: { commands: ['probe'] } })).toThrow('binding failed');
    expect(ctx.commands.values()).toEqual([]);
  });
  it('restores an earlier committed category if a later category fails during commit', () => {
    class FailingRegistry extends ExtensionRegistry<CommandDefinition> {
      public override registerBatch(): { dispose(): void } { throw new Error('commit failed'); }
    }
    const ctx = createPluginContext();
    const installer = new PluginInstaller({ ...ctx, commands: new FailingRegistry('commands') });
    expect(() => installer.install({ activate: contribute }, manifest)).toThrow('commit failed');
    expect(names(ctx)).toEqual([[],[],[],[]]);
  });
});
