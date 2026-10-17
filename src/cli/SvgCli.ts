import { createInterface } from 'node:readline';
import type { Readable, Writable } from 'node:stream';
import type { CommandExecutor } from '../application/CommandExecutor.js';
import type { CommandDispatcher } from './CommandDispatcher.js';
import type { ResultFormatter } from './ResultFormatter.js';

/** REPL adapter; commands own requests and receivers own business rules. */
export class SvgCli {
  public constructor(
    private readonly input: Readable,
    private readonly output: Writable,
    private readonly errors: Writable,
    private readonly dispatcher: CommandDispatcher,
    private readonly executor: CommandExecutor,
    private readonly formatter: ResultFormatter,
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
        try {
          const command = this.dispatcher.parse(line);
          if (command !== null) {
            const outcome = this.executor.execute(command);
            if (outcome.ok) {
              this.output.write(this.formatter.format(outcome.result).join('\n') + '\n');
            } else {
              this.writeError(outcome.error);
            }
          }
        } catch (error) {
          this.writeError(error instanceof Error ? error.message : 'invalid command');
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

  private writeError(message: string): void {
    this.errors.write(`error: ${message.replace(/[\r\n]+/g, ' ')}\n`);
  }
}
