import Redis from 'ioredis';
import { config } from './index';

// Create Redis client
const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

// Connection event handlers
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('ready', () => {
  console.log('Redis is ready for operations');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('close', () => {
  console.log('Redis connection closed');
});

redis.on('reconnecting', () => {
  console.log('Reconnecting to Redis...');
});

// Helper functions for common operations
export const cacheGet = async (key: string): Promise<string | null> => {
  try {
    return await redis.get(key);
  } catch (err) {
    console.error('Redis GET error:', err);
    return null;
  }
};

export const cacheSet = async (key: string, value: string, ttl?: number): Promise<void> => {
  try {
    if (ttl) {
      await redis.setex(key, ttl, value);
    } else {
      await redis.set(key, value);
    }
  } catch (err) {
    console.error('Redis SET error:', err);
  }
};

export const cacheDelete = async (key: string): Promise<void> => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error('Redis DELETE error:', err);
  }
};

export const cacheSetJSON = async (key: string, value: any, ttl?: number): Promise<void> => {
  try {
    const jsonValue = JSON.stringify(value);
    await cacheSet(key, jsonValue, ttl);
  } catch (err) {
    console.error('Redis JSON SET error:', err);
  }
};

export const cacheGetJSON = async (key: string): Promise<any | null> => {
  try {
    const value = await cacheGet(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  } catch (err) {
    console.error('Redis JSON GET error:', err);
    return null;
  }
};

// Queue operations for job processing
export const addToQueue = async (queueName: string, job: any): Promise<void> => {
  try {
    await redis.lpush(queueName, JSON.stringify(job));
  } catch (err) {
    console.error('Redis QUEUE ADD error:', err);
  }
};

export const getFromQueue = async (queueName: string): Promise<any | null> => {
  try {
    const job = await redis.rpop(queueName);
    if (job) {
      return JSON.parse(job);
    }
    return null;
  } catch (err) {
    console.error('Redis QUEUE GET error:', err);
    return null;
  }
};

export const getQueueLength = async (queueName: string): Promise<number> => {
  try {
    return await redis.llen(queueName);
  } catch (err) {
    console.error('Redis QUEUE LENGTH error:', err);
    return 0;
  }
};

export default redis; 