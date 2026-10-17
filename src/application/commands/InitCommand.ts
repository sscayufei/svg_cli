import { SvgNumber } from '../../domain/SvgNumber.js';
import type { CommandResult } from '../CommandResult.js';
import type { EditorSession } from '../EditorSession.js';
import type { Command } from './Command.js';

export class InitCommand implements Command {
  public constructor(
    private readonly session: EditorSession,
    private readonly width: string | number = 800,
    private readonly height: string | number = 600,
  ) {}

  public get kind(): 'document' { return 'document'; }

  public execute(): CommandResult {
    const document = this.session.initialize(
      SvgNumber.parse(this.width, 'width'), SvgNumber.parse(this.height, 'height'),
    );
    return Object.freeze({ kind: 'canvas', operation: 'created', width: document.width, height: document.height });
  }
}
