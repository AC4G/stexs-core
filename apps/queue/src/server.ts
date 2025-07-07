import pulsarClient from './pulsar';
import logger from './logger';
import { extractError } from 'utils-node/logger';
import { getRegisteredConsumers } from './consumers/consumerRegistry';
import { registerShutdownHooks } from './shutdown';
import { setupConsumers } from './consumers/setupConsumers';

(async () => {
  try {
    logger.info('Initializing Pulsar consumers...');

    await setupConsumers();

    registerShutdownHooks(pulsarClient);

    await Promise.all(getRegisteredConsumers().map(c => c.loopPromise));
  } catch (err) {
    logger.error('Failed to start consumers', { error: extractError(err) });
    process.exit(1);
  }
})();
