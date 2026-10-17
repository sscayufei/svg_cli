import { SvgCli } from './SvgCli.js';

const cli = new SvgCli(process.stdin, process.stdout, process.stderr);

cli.run().catch(() => {
  process.stderr.write('error: CLI input failed\n');
  process.exitCode = 1;
});
