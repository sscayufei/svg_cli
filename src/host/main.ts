import { CommandExecutor } from '@svgframe/core';
import { createDefaultContext } from './composition.js';
import { SvgCli } from './cli/SvgCli.js';
import { CommandDispatcher } from './cli/CommandDispatcher.js';
import { ResultFormatter } from './cli/ResultFormatter.js';

const context = createDefaultContext();
const cli = new SvgCli(process.stdin, process.stdout, process.stderr,
  new CommandDispatcher(context.commands), new CommandExecutor(context.history), new ResultFormatter());
cli.run().catch(() => {
  process.stderr.write('error: CLI input failed\n');
  process.exitCode = 1;
});
