import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Server configuration
  server: {
    port: parseInt(process.env['PORT'] || '3000', 10),
    host: process.env['HOST'] || 'localhost',
  },

  // Database configuration
  database: {
    host: process.env['DB_HOST'] || 'localhost',
    port: parseInt(process.env['DB_PORT'] || '5432', 10),
    name: process.env['DB_NAME'] || 'football_scout_db',
    user: process.env['DB_USER'] || process.env['USER'] || 'postgres',
    password: process.env['DB_PASSWORD'] || '',
  },

  // Redis configuration
  redis: {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379', 10),
    password: process.env['REDIS_PASSWORD'] || '',
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env['OPENAI_API_KEY'] || '',
  },

  // Crawling configuration
  crawling: {
    timeout: parseInt(process.env['CRAWL_TIMEOUT'] || '30000', 10),
    userAgent: process.env['USER_AGENT'] || 'FootballScoutBot/1.0',
    maxRetries: parseInt(process.env['MAX_RETRIES'] || '3', 10),
    retryDelay: parseInt(process.env['RETRY_DELAY'] || '1000', 10),
  },

  // Development mode
  isDevelopment: process.env['NODE_ENV'] === 'development',
  isProduction: process.env['NODE_ENV'] === 'production',
}; 