import logger from './logger';
import { extractError } from 'utils-node/logger';
import { getRegisteredConsumers } from './consumers/consumerRegistry';
import type pulsar from 'pulsar-client';

export class ShutdownController {
  private shuttingDown = false;
  shutdown() {
    this.shuttingDown = true;
  }

  isShuttingDown() {
    return this.shuttingDown;
  }
}

export const shutdownController = new ShutdownController();

export function registerShutdownHooks(pulsarClient: pulsar.Client) {
  const cleanupAndExit = async (exitCode = 0) => {

    logger.info('Shutting down gracefully...');

    const consumers = getRegisteredConsumers();

    shutdownController.shutdown();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Cleanup timeout')), 10_000)
    );

    const cleanupPromise = (async () => {
      for (const { consumer, topic, subscription } of consumers) {
        await consumer.close();
        logger.info(`Closed consumer (${subscription}) on topic: ${topic}`);
      }

      await Promise.all(consumers.map(c => c.loopPromise));

      await pulsarClient.close();
      logger.info('Closed Pulsar client.');
    })();

    try {
      await Promise.race([cleanupPromise, timeoutPromise]);
    } catch (err) {
      logger.error('Error during shutdown', { error: extractError(err) });
    } finally {
      logger.info('Server shut down.');
      process.exit(exitCode);
    }
  };

  process.on('SIGINT', () => cleanupAndExit(0));
  process.on('SIGTERM', () => cleanupAndExit(0));
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception', { error: extractError(err) });
    cleanupAndExit(1);
  });
  process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Rejection', { error: extractError(err) });
    cleanupAndExit(1);
  });
}
