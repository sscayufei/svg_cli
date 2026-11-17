import { describe, expect, it } from 'vitest';
import { AttributeService, ChangeSet, CommandExecutor, CommandHistory, EditorSession, ExtensionRegistry, SceneQuery, ShapeFactory, SvgGroup,
  type AttributeHandler, type AttributeTarget, type Command, type CommandDefinition, type CommandResult, type CommandToken, type ShapeProvider, type SvgNode, type TreeDecorator, type TreeRow } from '@svgframe/core';
import { createDefaultContext, createPluginContext } from '../../src/host/composition.js';
import { CommandDispatcher } from '../../src/host/cli/CommandDispatcher.js';
import { ResultFormatter } from '../../src/host/cli/ResultFormatter.js';
import { CreateCommand, SetAttributeCommand, TreeCommand } from '@svgframe/builtin-commands';

class ProbeShape extends SvgGroup { public override get type() { return 'probe'; } }
class ProbeProvider implements ShapeProvider {
  public readonly name = 'probe';
  public readonly help = { syntax: 'create probe <id>', description: 'test container' };
  public create(id: string) { return new ProbeShape(id); }
  public fromAttributes(id: string) { return new ProbeShape(id); }
}
class ProbeCommand implements Command {
  public readonly kind: Command['kind'] = 'query';
  public execute(): CommandResult { return { kind: 'lines', lines: ['plugin output'] }; }
}
class ProbeDefinition implements CommandDefinition {
  public readonly name = 'probe';
  public readonly syntax = 'probe';
  public readonly description = 'test query';
  public build(args: readonly CommandToken[]) { if (args.length) throw new Error('usage: probe'); return new ProbeCommand(); }
}
class ProbeHandler implements AttributeHandler {
  public constructor(public readonly name = 'probe-attribute') {}
  public handles(target: AttributeTarget, attribute: string) { return target.semanticType === 'probe' && attribute === 'color'; }
  public plan(node: SvgNode, _attribute: string, value: string | number): ChangeSet { return node.planSetAttribute('fill', value); }
}
class ProbeDecorator implements TreeDecorator {
  public constructor(public readonly name: string, private readonly text: string) {}
  public decorate(_row: TreeRow) { return this.text; }
}

describe('Four extension contracts and default assembly', () => {
  it('starts a completely empty core with no concrete defaults', () => {
    const context = createPluginContext();
    context.session.initialize();
    expect(context.shapeProviders.values()).toEqual([]);
    expect(new ShapeFactory().help()).toEqual([]);
    expect(() => context.shapes.create('rect', 'r', [])).toThrow('unknown shape type: rect (is the plugin loaded?)');
    expect(() => new CommandDispatcher(context.commands).parse('probe')).toThrow('unknown command: probe');
    expect(new ResultFormatter().format({ kind: 'tree', snapshot: new SceneQuery().tree(context.session.requireDocument()) })).toEqual(['svg (800x600)']);
  });
  it('assembles six shapes and nineteen commands from independent built-in packages', () => {
    const context = createDefaultContext();
    expect(context.shapeProviders.values().map(p => p.name)).toEqual(['rect','circle','ellipse','line','text','g']);
    expect(context.commands.values()).toHaveLength(19);
    const command = new CommandDispatcher(context.commands).parse('help')!;
    expect(new ResultFormatter().format(command.execute())).toContain('create g <id> — empty group; all creates accept in <containerId>');
  });
  it('uses a class provider for creation, restore and dynamic shape help', () => {
    const context = createDefaultContext();
    context.shapeProviders.register(new ProbeProvider());
    context.session.initialize();
    new CreateCommand(context.session, 'probe', 'p', []).execute();
    expect(context.session.requireDocument().requireById('p').isContainer).toBe(true);
    expect(context.shapes.fromAttributes('probe', 'q', {}).type).toBe('probe');
    const help = new CommandDispatcher(context.commands).parse('help')!.execute();
    expect(new ResultFormatter().format(help)).toContain('create probe <id> — test container');
  });
  it('dispatches a new command, preserves history, and adds its help without changing the formatter', () => {
    const context = createDefaultContext();
    context.commands.register(new ProbeDefinition());
    const dispatcher = new CommandDispatcher(context.commands);
    const history = context.history.status;
    const result = new CommandExecutor(context.history).execute(dispatcher.parse('probe')!);
    expect(result.ok).toBe(true);
    if (result.ok) expect(new ResultFormatter().format(result.result)).toEqual(['plugin output']);
    expect(context.history.status).toEqual(history);
    expect(new ResultFormatter().format(dispatcher.parse('help')!.execute())).toContain('probe — test query');
    expect(() => dispatcher.parse('probe extra')).toThrow('usage: probe');
  });
  it('calls attribute handlers first, falls back to old rules, and rejects conflicts', () => {
    const context = createPluginContext();
    context.shapeProviders.register(new ProbeProvider());
    context.attributes.register(new ProbeHandler());
    const document = context.session.initialize();
    const node = context.shapes.create('probe', 'p', []); document.append(node);
    const executor = new CommandExecutor(context.history);
    expect(executor.execute(new SetAttributeCommand(context.session, 'p', 'color', 'red')).ok).toBe(true);
    expect(node.getAttributes().fill).toBe('red');
    context.history.undo(); expect(node.getAttributes().fill).toBeUndefined();
    context.history.redo(); expect(node.getAttributes().fill).toBe('red');
    expect(executor.execute(new SetAttributeCommand(context.session, 'p', 'fill', 'blue')).ok).toBe(true);
    expect(executor.execute(new SetAttributeCommand(context.session, 'p', 'label', 'bad')).ok).toBe(false);
    context.attributes.register(new ProbeHandler('conflicting'));
    const status = context.history.status;
    expect(executor.execute(new SetAttributeCommand(context.session, 'p', 'color', 'green'))).toMatchObject({ ok: false, error: 'attribute handler conflict: probe-attribute, conflicting' });
    expect(node.getAttributes().fill).toBe('blue'); expect(context.history.status).toEqual(status);
  });
  it('decorates root and subtree rows in registration order, preserving empty defaults', () => {
    const context = createDefaultContext(); context.session.initialize();
    new CreateCommand(context.session, 'g', 'g', []).execute();
    context.decorators.register(new ProbeDecorator('first', '(one)'));
    context.decorators.register(new ProbeDecorator('second', '*'));
    const formatter = new ResultFormatter();
    expect(formatter.format(new TreeCommand(context.session).execute())).toEqual(['svg (800x600) (one) *', '└── g#g (one) *']);
    expect(formatter.format(new TreeCommand(context.session, 'g').execute())).toEqual(['g#g (one) *']);
    expect(new SceneQuery().show(context.session.requireDocument(), 'g')).toMatchObject({ semanticType: 'g', displayType: 'g', isContainer: true });
  });
  it.each(['shapes','commands','attributes','decorators'])('rejects duplicate %s registration without replacing the old instance', category => {
    const registry = new ExtensionRegistry(category);
    const extension = category === 'shapes' ? new ProbeProvider() : category === 'commands' ? new ProbeDefinition() : category === 'attributes' ? new ProbeHandler() : new ProbeDecorator('probe', '*');
    registry.register(extension);
    expect(() => registry.register(extension)).toThrow(`duplicate registration: ${category}/${extension.name}`);
    expect(registry.get(extension.name)).toBe(extension);
  });
  it('rejects malformed registrations, invalid provider output and bad tree labels', () => {
    expect(() => new ExtensionRegistry('commands').register({ name: 'broken' })).toThrow('invalid registration contract: commands/broken');
    class BrokenProvider extends ProbeProvider { public override create() { return new ProbeShape('wrong-id'); } }
    const providers = new ExtensionRegistry<ShapeProvider>('shapes'); providers.register(new BrokenProvider());
    expect(() => new ShapeFactory(providers).create('probe', 'wanted', [])).toThrow('invalid shape provider result: probe');
    const context = createDefaultContext(); context.session.initialize();
    context.decorators.register(new ProbeDecorator('invalid', 'line\nbreak'));
    expect(() => new TreeCommand(context.session).execute()).toThrow('invalid tree decorator result: invalid');
  });
  it('accepts the public undo protocol without depending on the EditCommand implementation', () => {
    class ReversibleProbe extends ProbeCommand {
      public override readonly kind = 'edit' as const;
      public undo() { return this.execute(); }
      public redo() { return this.execute(); }
    }
    const history = new CommandHistory();
    expect(new CommandExecutor(history).execute(new ReversibleProbe()).ok).toBe(true);
    expect(history.status.undoCount).toBe(1); history.undo(); expect(history.status.redoCount).toBe(1);
  });
  it('supports generic creation and attribute feedback through apply/undo/redo', () => {
    class FeedbackProvider extends ProbeProvider { public creationFeedback(node: SvgNode) { return [`made ${node.id}`]; } }
    class FeedbackHandler extends ProbeHandler {
      public feedback(node: SvgNode, _attribute: string, value: string | number) {
        return { applied: [`color ${value}`], undone: [`restore ${node.getAttributes().fill ?? 'absent'}`] };
      }
    }
    const context = createPluginContext(); context.session.initialize();
    context.shapeProviders.register(new FeedbackProvider()); context.attributes.register(new FeedbackHandler());
    const formatter = new ResultFormatter();
    expect(formatter.format(new CreateCommand(context.session, 'probe', 'p', []).execute())).toEqual(['made p']);
    const result = new CommandExecutor(context.history).execute(new SetAttributeCommand(context.session, 'p', 'color', 'red'));
    if (!result.ok) throw new Error(result.error);
    expect(formatter.format(result.result)).toEqual(['color red']);
    expect(formatter.format(context.history.undo())).toEqual(['restore absent']);
    expect(formatter.format(context.history.redo())).toEqual(['color red']);
  });
  it('validates feedback before changing a document or history', () => {
    class BrokenFeedback extends ProbeProvider { public creationFeedback() { return ['invalid\nline']; } }
    const context = createPluginContext(); const document = context.session.initialize();
    context.shapeProviders.register(new BrokenFeedback());
    const status = context.history.status;
    expect(new CommandExecutor(context.history).execute(new CreateCommand(context.session, 'probe', 'p', []))).toMatchObject({ ok: false, error: 'invalid command output lines' });
    expect(document.size).toBe(0); expect(context.history.status).toEqual(status);
  });
});
