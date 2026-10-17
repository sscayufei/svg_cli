import type { CommandHelp } from '../application/CommandResult.js';
import type { EditorSession } from '../application/EditorSession.js';
import { CanvasCommand } from '../application/commands/CanvasCommand.js';
import type { Command } from '../application/commands/Command.js';
import { CreateCommand } from '../application/commands/CreateCommand.js';
import { HelpCommand } from '../application/commands/HelpCommand.js';
import { InitCommand } from '../application/commands/InitCommand.js';
import { ShowCommand } from '../application/commands/ShowCommand.js';
import { TreeCommand } from '../application/commands/TreeCommand.js';
import type { CommandToken } from './CommandToken.js';
import { CommandTokenizer } from './CommandTokenizer.js';

interface CommandDefinition extends CommandHelp {
  readonly build: (args: readonly CommandToken[]) => Command;
}

/** Client and sole command-name dispatch point; future refactor: registration. */
export class CommandDispatcher {
  readonly #tokenizer = new CommandTokenizer();
  readonly #definitions: ReadonlyMap<string, CommandDefinition>;

  public constructor(private readonly session: EditorSession) {
    this.#definitions = new Map<string, CommandDefinition>([
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
      ['help', { syntax: 'help', description: 'show command syntax', build: a => {
        this.count(a, 0, 0, 'help');
        return new HelpCommand([
          ...this.#definitions.values(),
          { syntax: 'create rect <id> <x> <y> <w> <h> [fill]', description: 'rectangle' },
          { syntax: 'create circle <id> <cx> <cy> <r> [fill]', description: 'circle' },
          { syntax: 'create ellipse <id> <cx> <cy> <rx> <ry> [fill]', description: 'ellipse' },
          { syntax: 'create line <id> <x1> <y1> <x2> <y2> [stroke]', description: 'line' },
          { syntax: 'create text <id> <x> <y> "content"', description: 'text' },
          { syntax: 'create g <id>', description: 'empty group; all creates accept in <containerId>' },
        ], [
          'read <file.svg>', 'save [file.svg]', 'move <id> <dx> <dy>', 'scale <id> <factor>',
          'set <id> <attr> <value>', 'delete <id>', 'group <newGid> <id1> <id2>...',
          'ungroup <gid>', 'addto <gid> <id>', 'front <id>', 'back <id>', 'undo', 'redo',
        ]);
      } }],
    ]);
  }

  public parse(line: string): Command | null {
    const [name, ...args] = this.#tokenizer.tokenize(line);
    if (name === undefined) return null;
    const definition = this.#definitions.get(name.value);
    if (definition === undefined) throw new Error(`unknown command: ${name.value}`);
    return definition.build(args);
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
