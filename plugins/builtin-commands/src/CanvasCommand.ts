import { SvgNumber } from '@svgframe/core';
import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import type { Command } from '@svgframe/core';

export class CanvasCommand implements Command {
  readonly #size: readonly [string | number, string | number] | undefined;

  public constructor(private readonly session: EditorSession, size?: readonly [string | number, string | number]) {
    this.#size = size === undefined ? undefined : Object.freeze([size[0], size[1]]);
  }

  public get kind(): 'query' | 'document' { return this.#size === undefined ? 'query' : 'document'; }

  public execute(): CommandResult {
    const document = this.session.requireDocument();
    if (this.#size !== undefined) {
      document.resize(SvgNumber.parse(this.#size[0], 'width'), SvgNumber.parse(this.#size[1], 'height'));
    }
    return Object.freeze({
      kind: 'canvas', operation: this.#size === undefined ? 'queried' : 'resized',
      width: document.width, height: document.height,
    });
  }
}
