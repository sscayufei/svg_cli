import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import { SceneQuery } from '../SceneQuery.js';
import type { Command } from './Command.js';

export class TreeCommand implements Command {
  public constructor(private readonly session: EditorSession, private readonly id?: string) {}
  public get kind(): 'query' { return 'query'; }
  public execute(): CommandResult {
    return Object.freeze({ kind: 'tree', snapshot: new SceneQuery().tree(this.session.requireDocument(), this.id) });
  }
}
