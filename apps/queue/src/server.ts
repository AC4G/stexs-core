import pulsarClient from './pulsar';
import logger from './logger';
import { extractError } from 'utils-node/logger';
import { getRegisteredConsumers } from './consumers/consumerRegistry';
import { registerShutdownHooks } from './shutdown';
import { setupConsumers } from './consumers/setupConsumers';

(async () => {
  logger.info('Starting QUEUE server...');

  try {
    logger.info('Initializing Pulsar consumers...');

    await setupConsumers();

    const allConsumers = getRegisteredConsumers();
    logger.info(`Finished registering consumers. Total: ${allConsumers.length}`, {
      consumers: allConsumers.map(c => c.subscription),
    });

    registerShutdownHooks(pulsarClient);

    await Promise.all(getRegisteredConsumers().map(c => c.loopPromise));
  } catch (err) {
    logger.error('Failed to start consumers', { error: extractError(err) });
    process.exit(1);
  }
})();
