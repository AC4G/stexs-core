import ip from 'ip';
import { ENV, LOG_LEVEL, SERVER_PORT } from '../env-config';
import logger from './logger';
import { Server } from 'http';
import { initEmailProducer } from './producers/emailProducer';
import { extractError } from 'utils-node/logger';
import app from './app';
import registerShutdownHooks from './shutdown';

async function bootstrapServer(): Promise<void> {
	logger.info('Starting API server...');

	try {
		logger.info('Initializing Pulsar producers...');
		await initEmailProducer();

		let server: Server | undefined;

		if (ENV !== 'test') {
			server = app.listen(SERVER_PORT, () => {
				logger.info('API server started', {
					ENV,
					LOG_LEVEL,
					SERVER_PORT,
					SERVER_IP: ip.address(),
				});
			});
		}

		registerShutdownHooks(server);
	} catch (err) {
		logger.error('Failed to initialize app', { error: extractError(err) });
		process.exit(1);
	}
}

bootstrapServer();
