import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';

/** M0 REPL shell. Command construction and dispatch arrive in M2. */
export class SvgCli {
  public constructor(
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly errors: Writable,
  ) {}

  public async run(): Promise<void> {
    const lines = createInterface({
      input: this.input,
      output: this.output,
      prompt: 'svg> ',
      crlfDelay: Infinity,
    });
    let closed = false;
    lines.once('close', () => { closed = true; });

    this.output.write("svg-editor 0.1 — type 'help' for commands\n");
    lines.prompt();

    try {
      for await (const line of lines) {
        const input = line.trim();

        if (input.length > 0 && !input.startsWith('#')) {
          if (input === 'help') {
            this.output.write(
              'M0: help — show this message; EOF — exit (Ctrl+Z then Enter on Windows).\n'
              + 'Document, shape editing, inspection and undo/redo commands are not implemented yet.\n',
            );
          } else {
            this.errors.write('error: command not implemented in M0. use \'help\'\n');
          }
        }

        // EOF can close readline before the final buffered line is consumed.
        if (!closed) {
          lines.prompt();
        }
      }
    } finally {
      lines.close();
      this.output.write('\n');
    }
  }
}
