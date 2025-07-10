import ip from 'ip';
import { ENV, LOG_LEVEL, SERVER_PORT } from '../env-config';
import logger from './logger';
import { Server } from 'http';
import { initEmailProducer } from './producers/emailProducer';
import { extractError } from 'utils-node/logger';
import app from './app';
import registerShutdownHooks from './shutdown';

logger.info('Starting API server...');

(async () => {
	logger.info('Initializing pulsar producers...')

	try {
		await initEmailProducer();
	} catch (err) {
		logger.error('Failed to initialize email producer', { error: extractError(err) });
		process.exit(1);
	}
})();

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

export default app;
