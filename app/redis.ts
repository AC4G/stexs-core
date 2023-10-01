import { RD_URL } from '../env-config';
import logger from './loggers/logger';
const Redis = require('ioredis');
const redis = new Redis(RD_URL, { enableOfflineQueue: false });

redis.on('error', (error: any) => logger.error(`Failed to connect to redis. Error: ${error.message}`) );

export default redis;
