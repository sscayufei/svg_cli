import type { Command, CommandDefinition, ExtensionRegistry } from '@svgframe/core';
import { CommandTokenizer } from './CommandTokenizer.js';

export class CommandDispatcher {
  readonly #tokenizer = new CommandTokenizer();
  public constructor(private readonly commands: ExtensionRegistry<CommandDefinition>) {}
  public parse(line: string): Command | null {
    const [name, ...args] = this.#tokenizer.tokenize(line);
    if (name === undefined) return null;
    const definition = this.commands.get(name.value);
    if (!definition) throw new Error(`unknown command: ${name.value}`);
    const command = definition.build(args);
    if (!command || typeof command.execute !== 'function' || !['edit', 'query', 'document', 'history'].includes(command.kind)) throw new Error(`invalid command definition result: ${name.value}`);
    return command;
  }
}
