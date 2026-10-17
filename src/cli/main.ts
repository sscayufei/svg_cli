import { SvgCli } from './SvgCli.js';
import { EditorSession } from '../application/EditorSession.js';
import { CommandExecutor } from '../application/CommandExecutor.js';
import { CommandDispatcher } from './CommandDispatcher.js';
import { ResultFormatter } from './ResultFormatter.js';

const session = new EditorSession();
const cli = new SvgCli(
  process.stdin, process.stdout, process.stderr,
  new CommandDispatcher(session), new CommandExecutor(), new ResultFormatter(),
);

cli.run().catch(() => {
  process.stderr.write('error: CLI input failed\n');
  process.exitCode = 1;
});
