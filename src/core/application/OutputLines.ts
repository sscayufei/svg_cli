/** Validates plugin feedback before edits are committed and owns immutable output. */
export class OutputLines {
  public static copy(lines: readonly string[]): readonly string[] {
    if (!Array.isArray(lines) || lines.some(line => typeof line !== 'string' || /[\r\n]/.test(line))) throw new Error('invalid command output lines');
    return Object.freeze([...lines]);
  }
}
