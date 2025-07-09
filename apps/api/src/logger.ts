import {
    LOG_LEVEL,
    LOGGER,
    LOGGER_URL,
    ENV
} from '../env-config';
import { createLogger } from 'utils-node/logger';

const logger = createLogger({
    service: 'API',
    logger: LOGGER,
    logLevel: LOG_LEVEL,
    loggerUrl: LOGGER_URL,
    env: ENV
});

export default logger;
