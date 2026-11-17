import type { Command, CommandResult, EditorSession } from '@svgframe/core';

/** Read-only DFS statistics; container identity does not depend on a particular shape name. */
export class StatsCommand implements Command {
  public readonly kind = 'query';
  public constructor(private readonly session: Pick<EditorSession, 'requireDocument'>) {}

  public execute(): CommandResult {
    const counts = new Map<string, number>();
    let total = 0;
    let containers = 0;
    for (const node of this.session.requireDocument()) {
      if (node.isContainer) containers++;
      else {
        counts.set(node.type, (counts.get(node.type) ?? 0) + 1);
        total++;
      }
    }
    const parts = [...counts].map(([type, count]) => `${type}: ${count}`);
    parts.push(`(total ${total}, containers ${containers})`);
    return Object.freeze({ kind: 'lines', lines: Object.freeze([parts.join('  ')]) });
  }
}
