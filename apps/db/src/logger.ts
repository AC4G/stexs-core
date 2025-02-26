import { ENV, LOGGER_URL } from '../env-config';
import { createLogger } from 'utils-node/logger';

const logger = createLogger(ENV, LOGGER_URL);

export default logger;
