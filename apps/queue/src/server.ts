import pulsar from 'pulsar-client';
import pulsarClient from './pulsar';
import logger from './logger';
import { extractError } from 'utils-node/logger';
import { startEmailConsumer, startEmailDlqConsumer } from './consumers/emailConsumer';

const controller = { shuttingDown: false };

let emailConsumerObj: { consumer: pulsar.Consumer; loopPromise: Promise<void> } | null = null;
let dlqConsumerObj: { consumer: pulsar.Consumer; loopPromise: Promise<void> } | null = null;

const cleanupAndExit = async (exitCode = 0) => {
  if (controller.shuttingDown) return;
  controller.shuttingDown = true;

  logger.info('Shutting down gracefully...');

  const timeout = (ms: number) =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cleanup timeout')), ms)
    );

  try {
    await Promise.race([
      (async () => {
        if (emailConsumerObj?.consumer) {
          await emailConsumerObj.consumer.close();
          logger.info('Closed email consumer.');
        }
        if (dlqConsumerObj?.consumer) {
          await dlqConsumerObj.consumer.close();
          logger.info('Closed DLQ consumer.');
        }

        await Promise.all(
          [emailConsumerObj?.loopPromise, dlqConsumerObj?.loopPromise].filter(Boolean) as Promise<void>[]
        );

        await pulsarClient.close();
        logger.info('Closed Pulsar client.');
      })(),
      timeout(10000),
    ]);
  } catch (err) {
    logger.error('Error during shutdown', { error: extractError(err) });
  } finally {
    process.exit(exitCode);
  }
};

process.on('SIGINT', () => cleanupAndExit(0));
process.on('SIGTERM', () => cleanupAndExit(0));
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  cleanupAndExit(1);
});

(async () => {
  logger.info('Initializing Pulsar client...');

  try {
    emailConsumerObj = await startEmailConsumer(controller);
    dlqConsumerObj = await startEmailDlqConsumer(controller);

    await Promise.all([
      emailConsumerObj.loopPromise,
      dlqConsumerObj.loopPromise
    ]);
  } catch (err) {
    logger.error('Failed to start email consumer', { error: extractError(err) });
    await cleanupAndExit(1);
  }
})();
