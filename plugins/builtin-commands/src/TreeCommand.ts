import type { CommandResult } from '@svgframe/core';
import type { EditorSession } from '@svgframe/core';
import { SceneQuery } from '@svgframe/core';
import type { Command } from '@svgframe/core';

export class TreeCommand implements Command {
  public constructor(private readonly session: EditorSession, private readonly id?: string) {}
  public get kind(): 'query' { return 'query'; }
  public execute(): CommandResult {
    return Object.freeze({ kind: 'tree', snapshot: new SceneQuery(this.session.decorators).tree(this.session.requireDocument(), this.id) });
  }
}
