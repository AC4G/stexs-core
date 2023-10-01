import {
    signInRateLimiter,
    emailRateLimiter,
    securityRateLimiter
} from '../services/rateLimiter';
import logger from '../loggers/logger';
import { errorMessages } from '../services/messageBuilderService';
import { INTERNAL_ERROR, RATE_LIMIT_EXCEEDED } from '../constants/errors';
import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';
import { NextFunction } from 'express';
import { Request, Response } from 'express';

function setRateLimitHeaders(res: Response, rateLimiter: RateLimiterRedis, rateLimiterRes: RateLimiterRes) {
    res.setHeader('X-RateLimit-Limit', rateLimiter.points);
    res.setHeader('X-RateLimit-Duration', rateLimiter.duration);
    res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());
}

function rateLimitMiddleware(rateLimiter: RateLimiterRedis) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const clientIP = req.ip;

        rateLimiter.consume(clientIP)
            .then((rateLimiterRes) => {
                setRateLimitHeaders(res, rateLimiter, rateLimiterRes);
                return next();
            })
            .catch((rejRes) => {
                if (rejRes instanceof Error) {
                    logger.error(`Error during rate limiter call. Error: ${(rejRes instanceof Error) ? rejRes.message : rejRes}`);
                    return res.status(500).json(errorMessages([{ info: INTERNAL_ERROR }]));
                }

                logger.warn(`Rate limit exceeded for IP ${clientIP}`);
                
                setRateLimitHeaders(res, rateLimiter, rejRes);

                return res.status(429).json(errorMessages([{
                    info: RATE_LIMIT_EXCEEDED,
                    data: {
                        retryAfter: Math.round(rejRes.msBeforeNext / 1000)
                    }
                }]));
            });
    };
}

export const signInRateLimit = rateLimitMiddleware(signInRateLimiter);
export const emailRateLimit = rateLimitMiddleware(emailRateLimiter);
export const securityRateLimit = rateLimitMiddleware(securityRateLimiter);
