import { LOG_LEVEL, LOGGER, LOGGER_URL } from '../env-config';
import { createLogger } from 'utils-node/logger';
import { Logger } from 'winston';

const logger: Logger = createLogger('API', LOGGER, LOG_LEVEL, LOGGER_URL);

export default logger;
