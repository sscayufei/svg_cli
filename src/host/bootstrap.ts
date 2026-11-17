import { CommandExecutor } from '@svgframe/core';
import { createApplication, type ApplicationOptions } from './composition.js';
import { SvgCli } from './cli/SvgCli.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { ResultFormatter } from './cli/ResultFormatter.js';

/** Both assembly styles enter the same CLI and stream protocol. */
export async function runApplication(options: ApplicationOptions = {}): Promise<void> {
  const application = await createApplication(options);
  try {
    for (const diagnostic of application.diagnostics) process.stderr.write(`error: ${diagnostic}\n`);
    const context = application.context;
    await new SvgCli(process.stdin, process.stdout, process.stderr, new CommandDispatcher(context.commands),
      new CommandExecutor(context.history), new ResultFormatter()).run();
  } finally { application.dispose(); }
}
