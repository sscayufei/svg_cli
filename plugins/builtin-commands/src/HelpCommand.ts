import type { CommandHelp, CommandResult } from '@svgframe/core';
import type { Command } from '@svgframe/core';

export class HelpCommand implements Command {
  readonly #entries: readonly CommandHelp[];
  readonly #pending: readonly string[];
  public constructor(entries: readonly CommandHelp[], pending: readonly string[]) {
    this.#entries = Object.freeze(entries.map(({ syntax, description }) => Object.freeze({ syntax, description })));
    this.#pending = Object.freeze([...pending]);
  }
  public get kind(): 'query' { return 'query'; }
  public execute(): CommandResult {
    return Object.freeze({ kind: 'help', entries: this.#entries, pending: this.#pending });
  }
}
