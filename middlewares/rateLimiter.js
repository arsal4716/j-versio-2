import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { ApiResponse } from '../utils/responseHelper.js';
import logger from '../utils/logger.js';

let redisClient;

if (process.env.REDIS_URL) {
  redisClient = new Redis(process.env.REDIS_URL);
} else if (process.env.NODE_ENV === 'production') {
  redisClient = new Redis();
}

export const submissionRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // requests per window
  message: 'Too many form submissions from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return req.user ? req.user._id.toString() : req.ip;
  },
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      userId: req.user?._id,
      ip: req.ip,
      endpoint: req.originalUrl
    });
    
    return ApiResponse.error(res, {
      message: 'Too many requests. Please try again later.',
      status: 429
    });
  },
  // Use Redis store in production
  store: redisClient ? new RedisStore({
    client: redisClient,
    prefix: 'rl:submit:'
  }) : undefined
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    return ApiResponse.error(res, {
      message: 'Too many login attempts. Please try again in 15 minutes.',
      status: 429
    });
  }
});