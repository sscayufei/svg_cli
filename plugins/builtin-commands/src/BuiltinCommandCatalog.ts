import type { PluginContext } from '@svgframe/core';
import { BuiltinCommandDefinition } from './BuiltinCommandDefinition.js';
import type { CommandHelp } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import type { CommandHistory } from '@svgframe/core';
import type { SvgSavePort } from '@svgframe/core';
import type { SvgReadPort } from '@svgframe/core';
import { ReadCommand } from './ReadCommand.js';
import { SaveCommand } from './SaveCommand.js';
import { UndoCommand } from './UndoCommand.js';
import { RedoCommand } from './RedoCommand.js';
import { CanvasCommand } from './CanvasCommand.js';
import type { Command } from '@svgframe/core';
import { CreateCommand } from './CreateCommand.js';
import { HelpCommand } from './HelpCommand.js';
import { InitCommand } from './InitCommand.js';
import { ShowCommand } from './ShowCommand.js';
import { TreeCommand } from './TreeCommand.js';
import { MoveCommand } from './MoveCommand.js';
import { ScaleCommand } from './ScaleCommand.js';
import { SetAttributeCommand } from './SetAttributeCommand.js';
import { DeleteCommand } from './DeleteCommand.js';
import { GroupCommand } from './GroupCommand.js';
import { UngroupCommand } from './UngroupCommand.js';
import { AddToCommand } from './AddToCommand.js';
import { FrontCommand } from './FrontCommand.js';
import { BackCommand } from './BackCommand.js';
import type { CommandToken } from '@svgframe/core';

interface CatalogDefinition extends CommandHelp {
  readonly build: (args: readonly CommandToken[]) => Command;
}

/** Default command syntax and help, registered by the built-in plugin. */
export class BuiltinCommandCatalog {
  readonly #definitions: ReadonlyMap<string, CatalogDefinition>;

  public constructor(private readonly session: EditorSession, history: CommandHistory, store: SvgSavePort & SvgReadPort, private readonly context: PluginContext) {
    this.#definitions = new Map<string, CatalogDefinition>([
      ['init', { syntax: 'init [w] [h]', description: 'create canvas (default 800x600)', build: a => {
        this.count(a, 0, 2, 'init [w] [h]');
        return new InitCommand(this.session, a[0]?.value ?? 800, a[1]?.value ?? 600);
      } }],
      ['canvas', { syntax: 'canvas [w h]', description: 'inspect or resize canvas', build: a => {
        if (a.length === 0) return new CanvasCommand(this.session);
        this.count(a, 2, 2, 'canvas [w h]');
        return new CanvasCommand(this.session, [a[0]?.value ?? '', a[1]?.value ?? '']);
      } }],
      ['create', { syntax: 'create <type> <id> [params...] [in <containerId>]', description: 'create a shape',
        build: a => this.create(a) }],
      ['tree', { syntax: 'tree [id]', description: 'show scene or subtree', build: a => {
        this.count(a, 0, 1, 'tree [id]');
        return new TreeCommand(this.session, a[0]?.value);
      } }],
      ['show', { syntax: 'show <id>', description: 'show parent and attributes', build: a => {
        this.count(a, 1, 1, 'show <id>');
        return new ShowCommand(this.session, a[0]?.value ?? '');
      } }],
      ['move', { syntax: 'move <id> <dx> <dy>', description: 'translate a shape or group', build: a => {
        this.count(a, 3, 3, 'move <id> <dx> <dy>');
        return new MoveCommand(this.session, a[0]?.value ?? '', a[1]?.value ?? '', a[2]?.value ?? '');
      } }],
      ['scale', { syntax: 'scale <id> <factor>', description: 'scale all geometry by a positive factor', build: a => {
        this.count(a, 2, 2, 'scale <id> <factor>');
        return new ScaleCommand(this.session, a[0]?.value ?? '', a[1]?.value ?? '');
      } }],
      ['set', { syntax: 'set <id> <attr> <value>', description: 'set a whitelisted attribute', build: a => {
        this.count(a, 3, 3, 'set <id> <attr> <value>');
        return new SetAttributeCommand(this.session, a[0]?.value ?? '', a[1]?.value ?? '', a[2]?.value ?? '');
      } }],
      ['delete', { syntax: 'delete <id>', description: 'delete a shape and its descendants', build: a => {
        this.count(a, 1, 1, 'delete <id>');
        return new DeleteCommand(this.session, a[0]?.value ?? '');
      } }],
      ['group', { syntax: 'group <newGid> <id1> <id2>...', description: 'group existing shapes in document order', build: a => {
        this.count(a, 3, Infinity, 'group <newGid> <id1> <id2>...');
        return new GroupCommand(this.session, a[0]?.value ?? '', a.slice(1).map(token => token.value));
      } }],
      ['ungroup', { syntax: 'ungroup <gid>', description: 'promote a nested group\'s children', build: a => {
        this.count(a, 1, 1, 'ungroup <gid>'); return new UngroupCommand(this.session, a[0]?.value ?? '');
      } }],
      ['addto', { syntax: 'addto <gid> <id>', description: 'move an existing shape into a container', build: a => {
        this.count(a, 2, 2, 'addto <gid> <id>'); return new AddToCommand(this.session, a[0]?.value ?? '', a[1]?.value ?? '');
      } }],
      ['front', { syntax: 'front <id>', description: 'move to the last sibling slot (painted in front)', build: a => {
        this.count(a, 1, 1, 'front <id>'); return new FrontCommand(this.session, a[0]?.value ?? '');
      } }],
      ['back', { syntax: 'back <id>', description: 'move to the first sibling slot', build: a => {
        this.count(a, 1, 1, 'back <id>'); return new BackCommand(this.session, a[0]?.value ?? '');
      } }],
      ['read', { syntax: 'read <file.svg>', description: 'load SVG as the current document', build: a => {
        this.count(a, 1, 1, 'read <file.svg>'); return new ReadCommand(this.session, store, a[0]?.value ?? '');
      } }],
      ['save', { syntax: 'save [file.svg]', description: 'save SVG (path required without a read source)', build: a => {
        this.count(a, 0, 1, 'save [file.svg]'); return new SaveCommand(this.session, store, a[0]?.value);
      } }],
      ['undo', { syntax: 'undo', description: 'undo the last edit', build: a => {
        this.count(a, 0, 0, 'undo'); return new UndoCommand(this.session, history);
      } }],
      ['redo', { syntax: 'redo', description: 'redo the last undone edit', build: a => {
        this.count(a, 0, 0, 'redo'); return new RedoCommand(this.session, history);
      } }],
      ['help', { syntax: 'help', description: 'show command syntax', build: a => {
        this.count(a, 0, 0, 'help');
        return new HelpCommand([
          ...this.context.commands.values(),
          ...this.context.shapes.help(),
        ], []);
      } }],
    ]);
  }

  public register(): void {
    for (const [name, definition] of this.#definitions) {
      this.context.commands.register(new BuiltinCommandDefinition(name, definition.syntax, definition.description, definition.build));
    }
  }

  private create(args: readonly CommandToken[]): CreateCommand {
    const [type, id] = args;
    if (type === undefined || id === undefined) {
      throw new Error('usage: create <type> <id> [params...] [in <containerId>]');
    }
    let parameters = args.slice(2);
    let containerId: string | undefined;
    const marker = parameters.at(-2);
    const target = parameters.at(-1);
    if (marker?.value === 'in' && !marker.quoted && target !== undefined) {
      containerId = target.value;
      parameters = parameters.slice(0, -2);
    }
    return new CreateCommand(this.session, type.value, id.value, parameters.map(token => token.value), containerId);
  }

  private count(args: readonly CommandToken[], minimum: number, maximum: number, syntax: string): void {
    if (args.length < minimum || args.length > maximum) throw new Error(`usage: ${syntax}`);
  }
}
