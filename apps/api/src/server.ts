import ip from 'ip';
import { ENV, LOG_LEVEL, SERVER_PORT } from '../env-config';
import logger from './logger';
import { initEmailProducer } from './producers/emailProducer';
import { extractError } from 'utils-node/logger';
import app from './app';
import registerShutdownHooks from './shutdown';

(async () => {
	logger.info('Starting API server...');

	try {
		logger.info('Initializing pulsar producers...')

		await initEmailProducer();

		const server = app.listen(SERVER_PORT, () => {
			logger.info('API server started', {
				ENV,
				LOG_LEVEL,
				SERVER_PORT,
				SERVER_IP: ip.address(),
			});
		});

		registerShutdownHooks(server);
	} catch (err) {
		logger.error('Failed to initialize email producer', { error: extractError(err) });
		process.exit(1);
	}
})();
