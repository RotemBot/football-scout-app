import { AIQueryParserService } from '../../services/ai-query-parser.service';
import { SearchParameters } from '../../models';

// Mock OpenAI
const mockOpenAI = {
  chat: {
    completions: {
      create: jest.fn()
    }
  }
};

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => mockOpenAI);
});

describe('AIQueryParserService', () => {
  let service: AIQueryParserService;

  beforeEach(() => {
    service = new AIQueryParserService();
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up to prevent memory leaks
    service.destroy();
  });

  describe('parseQuery', () => {
    it('should parse a simple striker query correctly', async () => {
      // Mock OpenAI response for striker query
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: JSON.stringify({
                originalQuery: 'young striker from Brazil',
                parsedIntent: 'Find young Brazilian striker players',
                position: ['ST', 'CF'],
                age: { min: 18, max: 25 },
                nationality: ['Brazil'],
                priorityFactors: ['position', 'age', 'nationality']
              })
            }
          }
        }],
        usage: { total_tokens: 150 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.parseQuery('young striker from Brazil');

      expect(result).toMatchObject({
        searchParameters: expect.objectContaining({
          originalQuery: 'young striker from Brazil',
          parsedIntent: 'Find young Brazilian striker players',
          position: ['ST', 'CF'],
          age: { min: 18, max: 25 },
          nationality: ['Brazil']
        }),
        confidence: expect.any(Number),
        fallbackUsed: false,
        processingTime: expect.any(Number)
      });

      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should parse a complex midfielder query with multiple criteria', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: JSON.stringify({
                originalQuery: 'creative midfielder from Premier League under 28 worth less than 50M',
                parsedIntent: 'Find creative midfielder from Premier League, under 28 years old, market value under 50 million',
                position: ['CM', 'CAM'],
                age: { max: 28 },
                league: ['Premier League'],
                marketValue: { max: 50000000 },
                keywords: ['creative', 'playmaker'],
                priorityFactors: ['position', 'league', 'age', 'market_value', 'creativity']
              })
            }
          }
        }],
        usage: { total_tokens: 200 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.parseQuery('creative midfielder from Premier League under 28 worth less than 50M');

      expect(result.searchParameters).toMatchObject({
        position: ['CM', 'CAM'],
        age: { max: 28 },
        league: ['Premier League'],
        marketValue: { max: 50000000 },
        keywords: ['creative', 'playmaker']
      });
    });

    it('should handle goalkeeper queries with specific requirements', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: JSON.stringify({
                originalQuery: 'tall goalkeeper from Germany or Netherlands over 1.90m',
                parsedIntent: 'Find tall goalkeeper from Germany or Netherlands with height over 1.90m',
                position: ['GK'],
                nationality: ['Germany', 'Netherlands'],
                height: { min: 190 },
                priorityFactors: ['position', 'nationality', 'height']
              })
            }
          }
        }],
        usage: { total_tokens: 180 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result = await service.parseQuery('tall goalkeeper from Germany or Netherlands over 1.90m');

      expect(result.searchParameters).toMatchObject({
        position: ['GK'],
        nationality: ['Germany', 'Netherlands'],
        height: { min: 190 }
      });
    });

    it('should use fallback parsing when OpenAI fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('OpenAI API error'));

      const result = await service.parseQuery('striker from Brazil');

      expect(result).toMatchObject({
        fallbackUsed: true,
        confidence: 0.6,
        searchParameters: expect.objectContaining({
          originalQuery: 'striker from Brazil'
        })
      });
    });

    it('should cache results and return cached responses', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: JSON.stringify({
                originalQuery: 'defender from Spain',
                position: ['CB', 'LB', 'RB'],
                nationality: ['Spain']
              })
            }
          }
        }],
        usage: { total_tokens: 120 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      // First call should hit OpenAI
      const result1 = await service.parseQuery('defender from Spain');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1);
      expect(result1.cacheHit).toBeUndefined();

      // Second call should use cache
      const result2 = await service.parseQuery('defender from Spain');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(1); // No additional calls
      expect(result2.cacheHit).toBe(true);
      expect(result2.searchParameters).toEqual(result1.searchParameters);
    });

    it('should handle edge cases and malformed queries gracefully', async () => {
      // Empty query
      const result1 = await service.parseQuery('');
      expect(result1.fallbackUsed).toBe(true);

      // Very short query
      const result2 = await service.parseQuery('x');
      expect(result2.fallbackUsed).toBe(true);

      // Non-football related query
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: JSON.stringify({
                originalQuery: 'buy groceries',
                parsedIntent: 'Non-football related query',
                priorityFactors: []
              })
            }
          }
        }],
        usage: { total_tokens: 50 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const result3 = await service.parseQuery('buy groceries');
      expect(result3.confidence).toBeLessThan(0.5);
    });

    it('should calculate confidence scores correctly', async () => {
      const testCases = [
        {
          query: 'young striker from Brazil under 25',
          expectedConfidence: 0.9, // High confidence - clear, specific query
          factors: ['position', 'nationality', 'age']
        },
        {
          query: 'player',
          expectedConfidence: 0.3, // Low confidence - too vague
          factors: []
        },
        {
          query: 'midfielder from top league with good passing',
          expectedConfidence: 0.7, // Medium confidence - good but somewhat vague
          factors: ['position', 'league', 'skills']
        }
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          choices: [{
            message: {
              function_call: {
                name: 'parse_search_query',
                arguments: JSON.stringify({
                  originalQuery: testCase.query,
                  priorityFactors: testCase.factors
                })
              }
            }
          }],
          usage: { total_tokens: 100 }
        };
        mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

        const result = await service.parseQuery(testCase.query);
        
        // Allow some tolerance in confidence calculation
        expect(result.confidence).toBeCloseTo(testCase.expectedConfidence, 1);
      }
    });
  });

  describe('fallback parsing', () => {
    it('should extract positions from query text', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API error'));

      const queries = [
        { text: 'striker from Brazil', expectedPositions: ['ST', 'CF'] },
        { text: 'midfielder with good passing', expectedPositions: ['CM', 'CAM', 'CDM'] },
        { text: 'defender for Champions League', expectedPositions: ['CB', 'LB', 'RB'] },
        { text: 'goalkeeper under 30', expectedPositions: ['GK'] }
      ];

      for (const query of queries) {
        const result = await service.parseQuery(query.text);
        expect(result.fallbackUsed).toBe(true);
        expect(result.searchParameters.position).toEqual(
          expect.arrayContaining(query.expectedPositions)
        );
      }
    });

    it('should extract age ranges from query text', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API error'));

      const queries = [
        { text: 'player under 25', expectedAge: { max: 25 } },
        { text: 'young player under 23', expectedAge: { max: 23 } },
        { text: 'experienced player over 30', expectedAge: { min: 30 } },
        { text: 'player between 25 and 30', expectedAge: { min: 25, max: 30 } }
      ];

      for (const query of queries) {
        const result = await service.parseQuery(query.text);
        expect(result.searchParameters.age).toEqual(query.expectedAge);
      }
    });

    it('should extract nationalities and leagues from query text', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API error'));

      const queries = [
        { text: 'player from Brazil', expectedNationality: ['Brazil'] },
        { text: 'Premier League striker', expectedLeague: ['Premier League'] },
        { text: 'La Liga or Serie A midfielder', expectedLeague: ['La Liga', 'Serie A'] },
        { text: 'German or Dutch defender', expectedNationality: ['Germany', 'Netherlands'] }
      ];

      for (const query of queries) {
        const result = await service.parseQuery(query.text);
        
        if (query.expectedNationality) {
          expect(result.searchParameters.nationality).toEqual(
            expect.arrayContaining(query.expectedNationality)
          );
        }
        
        if (query.expectedLeague) {
          expect(result.searchParameters.league).toEqual(
            expect.arrayContaining(query.expectedLeague)
          );
        }
      }
    });
  });

  describe('performance and reliability', () => {
    it('should handle multiple concurrent requests', async () => {
      const mockResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: JSON.stringify({
                originalQuery: 'test query',
                position: ['ST']
              })
            }
          }
        }],
        usage: { total_tokens: 100 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(mockResponse);

      const queries = [
        'striker from Brazil',
        'midfielder from Spain',
        'defender from England',
        'goalkeeper from Italy'
      ];

      const promises = queries.map(query => service.parseQuery(query));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toHaveProperty('searchParameters');
        expect(result).toHaveProperty('confidence');
        expect(result.processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      });
    });

    it('should retry failed requests with exponential backoff', async () => {
      // First two calls fail, third succeeds
      mockOpenAI.chat.completions.create
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({
          choices: [{
            message: {
              function_call: {
                name: 'parse_search_query',
                arguments: JSON.stringify({
                  originalQuery: 'test query',
                  position: ['ST']
                })
              }
            }
          }],
          usage: { total_tokens: 100 }
        });

      const result = await service.parseQuery('striker from Brazil');

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledTimes(3);
      expect(result.fallbackUsed).toBe(false);
      expect(result.searchParameters.position).toEqual(['ST']);
    });

    it('should respect rate limits and usage tracking', () => {
      const stats = service.getUsageStats();
      
      expect(stats).toHaveProperty('totalQueries');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('fallbackUsed');
      expect(stats).toHaveProperty('totalTokens');
      expect(stats).toHaveProperty('averageProcessingTime');
      
      // All values should be numbers
      Object.values(stats).forEach(value => {
        expect(typeof value).toBe('number');
      });
    });
  });

  describe('validation and error handling', () => {
    it('should validate parsed results against schema', async () => {
      const invalidResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: JSON.stringify({
                originalQuery: 'test',
                age: { min: 50, max: 20 }, // Invalid: min > max
                position: ['INVALID_POSITION'], // Invalid position
                marketValue: { min: -1000000 } // Invalid: negative value
              })
            }
          }
        }],
        usage: { total_tokens: 100 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(invalidResponse);

      const result = await service.parseQuery('test query');
      
      // Should fall back to safer parsing when validation fails
      expect(result.fallbackUsed).toBe(true);
    });

    it('should handle malformed JSON responses gracefully', async () => {
      const malformedResponse = {
        choices: [{
          message: {
            function_call: {
              name: 'parse_search_query',
              arguments: '{ invalid json'
            }
          }
        }],
        usage: { total_tokens: 50 }
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(malformedResponse);

      const result = await service.parseQuery('test query');
      
      expect(result.fallbackUsed).toBe(true);
      expect(result.searchParameters).toHaveProperty('originalQuery', 'test query');
    });

    it('should handle network timeouts and errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Network timeout'));

      const result = await service.parseQuery('test query');
      
      expect(result.fallbackUsed).toBe(true);
      expect(result.confidence).toBe(0.6);
    });
  });
}); 