import { RateLimiterRedis } from "rate-limiter-flexible";
import redis from '../redis';

export const signInRateLimiter = new RateLimiterRedis({
    storeClient: redis,
    points: 5,
    duration: 300,
    keyPrefix: 'sign-in-rate-limiter'
});

export const emailRateLimiter = new RateLimiterRedis({
    storeClient: redis,
    points: 1,
    duration: 60,
    keyPrefix: 'email-rate-limiter'
});

export const securityRateLimiter = new RateLimiterRedis({
    storeClient: redis,
    points: 5,
    duration: 600,
    keyPrefix: 'security-rate-limiter'
});
