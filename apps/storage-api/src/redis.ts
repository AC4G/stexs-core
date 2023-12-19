import { RedisClientType, createClient } from 'redis';
import { REDIS_URL } from '../env-config';

const redis: RedisClientType = createClient({
    url: REDIS_URL
});

redis.connect();

export default redis;

