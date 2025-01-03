import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { runSeeds } from './seed-handler';

yargs(hideBin(process.argv))
  .command('seed', 'Run all seeds', {}, async () => {
    await runSeeds();
    process.exit(0);
  })
  .demandCommand(1, 'You need at least one command to proceed')
  .help()
  .argv;
