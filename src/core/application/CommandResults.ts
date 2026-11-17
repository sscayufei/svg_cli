import type { CommandResult } from './CommandResult.js';
import { OutputLines } from './OutputLines.js';

export class CommandResults {
  public static validate(result: CommandResult): CommandResult {
    return result.kind === 'lines' ? Object.freeze({ kind: 'lines', lines: OutputLines.copy(result.lines) }) : result;
  }
}
