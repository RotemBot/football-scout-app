import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432', 10),
  database: process.env.TEST_DB_NAME || 'football_scout_test_db',
  user: process.env.TEST_DB_USER || process.env.USER || 'postgres',
  password: process.env.TEST_DB_PASSWORD || '',
};

// Test database pool
export const testPool = new Pool(testDbConfig);

// Test database query helper
export const testQuery = async (text: string, params?: any[]) => {
  try {
    const res = await testPool.query(text, params);
    return res;
  } catch (err) {
    console.error('Test query error', { text, error: err });
    throw err;
  }
};

// Initialize test database schema
export const initTestDatabase = async () => {
  try {
    // Drop existing tables if they exist (in reverse order to handle foreign keys)
    const tables = ['crawl_logs', 'search_results', 'search_queries', 'player_sources', 'players', 'sources'];
    
    for (const table of tables) {
      await testQuery(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    
    // Drop functions and extensions
    await testQuery(`DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE`);
    
    // Read schema file
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // Execute schema
    await testQuery(schema);
    console.log('Test database schema initialized');
  } catch (error) {
    console.error('Failed to initialize test database schema:', error);
    throw error;
  }
};

// Clean test database
export const cleanTestDatabase = async () => {
  try {
    // Clean tables in reverse order to handle foreign key constraints
    const tables = ['crawl_logs', 'search_results', 'search_queries', 'player_sources', 'players', 'sources'];
    
    for (const table of tables) {
      await testQuery(`DELETE FROM ${table}`);
    }
    
    console.log('Test database cleaned');
  } catch (error) {
    console.error('Failed to clean test database:', error);
    throw error;
  }
};

// Seed test data
export const seedTestData = async () => {
  try {
    // Insert test sources (schema already has initial data, but let's add more)
    await testQuery(`
      INSERT INTO sources (name, url, reliability_score, timeout_seconds) VALUES
      ('test_source_1', 'https://test1.com', 90, 30),
      ('test_source_2', 'https://test2.com', 85, 30)
      ON CONFLICT (name) DO NOTHING
    `);
    
    // Insert test players (using correct column names)
    await testQuery(`
      INSERT INTO players (name, position, age, nationality, current_club, market_value_euros, contract_expires) VALUES
      ('Lionel Messi', 'RW', 36, 'Argentina', 'Inter Miami', 35000000, '2025-12-31'),
      ('Erling Haaland', 'ST', 23, 'Norway', 'Manchester City', 180000000, '2027-06-30'),
      ('Kylian Mbappé', 'LW', 25, 'France', 'Real Madrid', 180000000, '2029-06-30'),
      ('Jude Bellingham', 'CM', 21, 'England', 'Real Madrid', 150000000, '2029-06-30')
    `);
    
    console.log('Test data seeded');
  } catch (error) {
    console.error('Failed to seed test data:', error);
    throw error;
  }
};

// Global test setup
beforeAll(async () => {
  await initTestDatabase();
  await seedTestData();
});

// Clean up after each test
afterEach(async () => {
  await cleanTestDatabase();
  await seedTestData();
});

// Global test teardown
afterAll(async () => {
  await cleanTestDatabase();
  await testPool.end();
});

// Export test utilities
export { testDbConfig }; 