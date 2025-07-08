import { testQuery, testPool } from './setup';

describe('Test Database Setup', () => {
  test('should connect to test database', async () => {
    const result = await testQuery('SELECT 1 as test');
    expect(result.rows[0].test).toBe(1);
  });

  test('should have test data seeded', async () => {
    const playersResult = await testQuery('SELECT COUNT(*) as count FROM players');
    expect(parseInt(playersResult.rows[0].count)).toBeGreaterThan(0);
    
    const sourcesResult = await testQuery('SELECT COUNT(*) as count FROM sources');
    expect(parseInt(sourcesResult.rows[0].count)).toBeGreaterThan(0);
  });

  test('should have expected test players', async () => {
    const result = await testQuery('SELECT name FROM players WHERE name = $1', ['Lionel Messi']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('Lionel Messi');
  });

  test('should have expected test sources', async () => {
    // Check for our test source data
    const result = await testQuery('SELECT name FROM sources WHERE name = $1', ['test_source_1']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].name).toBe('test_source_1');
    
    // Check that we have at least 2 sources (our test data)
    const allSources = await testQuery('SELECT COUNT(*) as count FROM sources');
    expect(parseInt(allSources.rows[0].count)).toBeGreaterThanOrEqual(2);
  });
}); 