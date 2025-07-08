import { MatchExplanationService } from '../../services/match-explanation.service';
import { Player } from '../../models';
import { AdvancedSearchParameters } from '../../schemas/search-parameters.schema';

describe('MatchExplanationService', () => {
  let service: MatchExplanationService;

  beforeEach(() => {
    service = new MatchExplanationService();
  });

  describe('generateMatchExplanation', () => {
    it('should generate comprehensive explanation for a perfect striker match', async () => {
      const player: Player = {
        id: 'player1',
        name: 'João Silva',
        position: 'ST',
        age: 23,
        nationality: 'Brazil',
        currentClub: 'Santos FC',
        marketValueEuros: 25000000,
        heightCm: 182,
        goalsThisSeason: 24,
        assistsThisSeason: 9,
        appearancesThisSeason: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['ST', 'CF'],
        age: { min: 20, max: 25 },
        nationality: ['Brazil'],
        marketValue: { max: 30000000 },
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position', 'age', 'nationality', 'market_value']
      };

      const explanation = await service.generateMatchExplanation(player, searchParams, {
        searchIntent: 'Find young Brazilian striker under 30M',
        priorityFactors: ['position', 'age', 'nationality', 'market_value'],
        originalQuery: 'young striker from Brazil under 30M',
        resultRank: 1,
        totalResults: 15
      });

      expect(explanation).toMatchObject({
        summary: expect.stringContaining('João Silva'),
        strengthScore: expect.any(Number),
        matchedCriteria: expect.arrayContaining([
          expect.objectContaining({
            criterion: 'Position'
          })
        ])
      });

      expect(explanation.strengthScore).toBeGreaterThan(0);
    });

    it('should handle partial matches with appropriate scoring', async () => {
      const player: Player = {
        id: 'player2',
        name: 'Marco Rossi',
        position: 'CF',
        age: 27,
        nationality: 'Italy',
        currentClub: 'AC Milan',
        marketValueEuros: 45000000,
        heightCm: 185,
        goalsThisSeason: 15,
        assistsThisSeason: 5,
        appearancesThisSeason: 25,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['ST', 'CF'],
        age: { min: 20, max: 25 },
        nationality: ['Brazil'],
        marketValue: { max: 30000000 },
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position', 'age', 'nationality', 'market_value']
      };

      const explanation = await service.generateMatchExplanation(player, searchParams, {
        searchIntent: 'Find young Brazilian striker under 30M',
        priorityFactors: ['position', 'age', 'nationality', 'market_value'],
        originalQuery: 'young striker from Brazil under 30M',
        resultRank: 2,
        totalResults: 15
      });

      expect(explanation.strengthScore).toBeLessThan(100);
      expect(explanation.potentialConcerns).toBeDefined();
      expect(explanation.potentialConcerns!.length).toBeGreaterThan(0);
    });

    it('should generate position-specific performance analysis for strikers', async () => {
      const striker: Player = {
        id: 'striker1',
        name: 'Goal Machine',
        position: 'ST',
        age: 25,
        nationality: 'Argentina',
        currentClub: 'Barcelona',
        goalsThisSeason: 27,
        assistsThisSeason: 8,
        appearancesThisSeason: 30,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['ST'],
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position', 'performance']
      };

      const explanation = await service.generateMatchExplanation(striker, searchParams, {
        searchIntent: 'Find high-scoring striker',
        priorityFactors: ['position', 'performance'],
        originalQuery: 'prolific goalscorer striker',
        resultRank: 1,
        totalResults: 10
      });

      expect(explanation.additionalContext).toBeDefined();
      expect(explanation.strengthScore).toBeGreaterThan(50);
    });

    it('should handle players with minimal data gracefully', async () => {
      const player: Player = {
        id: 'minimal',
        name: 'Unknown Player',
        position: 'CB',
        age: 24,
        nationality: 'France',
        currentClub: 'Unknown FC',
        goalsThisSeason: 0,
        assistsThisSeason: 0,
        appearancesThisSeason: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['CB'],
        age: { min: 20, max: 30 },
        nationality: ['France'],
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position', 'age', 'nationality']
      };

      const explanation = await service.generateMatchExplanation(player, searchParams, {
        searchIntent: 'Find French defender',
        priorityFactors: ['position', 'age', 'nationality'],
        originalQuery: 'French defender',
        resultRank: 5,
        totalResults: 8
      });

      expect(explanation).toBeDefined();
      expect(explanation.summary).toContain('Unknown Player');
      expect(explanation.strengthScore).toBeGreaterThanOrEqual(0);
      expect(explanation.strengthScore).toBeLessThanOrEqual(100);
    });
  });

  describe('scoring algorithms', () => {
    it('should weight position matches appropriately', async () => {
      const player: Player = {
        id: 'test',
        name: 'Test Player',
        position: 'ST',
        age: 25,
        nationality: 'Brazil',
        currentClub: 'Test FC',
        goalsThisSeason: 10,
        assistsThisSeason: 3,
        appearancesThisSeason: 20,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['ST'],
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position']
      };

      const explanation = await service.generateMatchExplanation(player, searchParams, {
        searchIntent: 'Find striker',
        priorityFactors: ['position'],
        originalQuery: 'striker',
        resultRank: 1,
        totalResults: 5
      });

      // Position matches should contribute significantly to score
      expect(explanation.strengthScore).toBeGreaterThan(0);
      
      // Should have position in matched criteria
      const positionCriterion = explanation.matchedCriteria.find(c => 
        c.criterion.toLowerCase().includes('position')
      );
      expect(positionCriterion).toBeDefined();
    });

    it('should calculate composite scores for multiple criteria', async () => {
      const perfectMatch: Player = {
        id: 'perfect',
        name: 'Perfect Player',
        position: 'ST',
        age: 23,
        nationality: 'Brazil',
        currentClub: 'Test FC',
        marketValueEuros: 20000000,
        heightCm: 180,
        goalsThisSeason: 25,
        assistsThisSeason: 8,
        appearancesThisSeason: 28,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['ST'],
        age: { min: 20, max: 25 },
        nationality: ['Brazil'],
        marketValue: { max: 25000000 },
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position', 'age', 'nationality', 'market_value']
      };

      const explanation = await service.generateMatchExplanation(perfectMatch, searchParams, {
        searchIntent: 'Find perfect striker',
        priorityFactors: ['position', 'age', 'nationality', 'market_value'],
        originalQuery: 'perfect Brazilian striker',
        resultRank: 1,
        totalResults: 1
      });

      // Should score very high with multiple perfect matches
      expect(explanation.strengthScore).toBeGreaterThan(80);
      expect(explanation.matchedCriteria.length).toBeGreaterThan(1);
    });
  });

  describe('position-specific benchmarks', () => {
    it('should apply correct benchmarks for goalkeepers', async () => {
      const goalkeeper: Player = {
        id: 'gk1',
        name: 'Great Keeper',
        position: 'GK',
        age: 28,
        nationality: 'Germany',
        currentClub: 'Bayern Munich',
        goalsThisSeason: 0, // Goalkeepers don't score
        assistsThisSeason: 1,
        appearancesThisSeason: 35,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['GK'],
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position', 'performance']
      };

      const explanation = await service.generateMatchExplanation(goalkeeper, searchParams, {
        searchIntent: 'Find reliable goalkeeper',
        priorityFactors: ['position', 'performance'],
        originalQuery: 'experienced goalkeeper',
        resultRank: 1,
        totalResults: 6
      });

      // Should not penalize goalkeeper for low goals/assists
      expect(explanation.strengthScore).toBeGreaterThan(30);
      expect(explanation.matchedCriteria.length).toBeGreaterThan(0);
    });

    it('should handle different position types appropriately', async () => {
      const positions = [
        { position: 'ST', goals: 20, assists: 5 },
        { position: 'CAM', goals: 8, assists: 15 },
        { position: 'CM', goals: 4, assists: 8 },
        { position: 'CB', goals: 2, assists: 1 },
        { position: 'GK', goals: 0, assists: 0 }
      ];

      for (const pos of positions) {
        const player: Player = {
          id: `${pos.position}_test`,
          name: `Test ${pos.position}`,
          position: pos.position as any, // Allow any position for testing
          age: 25,
          nationality: 'Test',
          currentClub: 'Test FC',
          goalsThisSeason: pos.goals,
          assistsThisSeason: pos.assists,
          appearancesThisSeason: 25,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const searchParams: AdvancedSearchParameters = {
          position: [pos.position as any], // Allow any position for testing
          sortBy: 'relevance',
          sortDirection: 'desc',
          page: 1,
          limit: 20,
          exactMatch: false,
          includeRetired: false,
          priorityFactors: ['position', 'performance']
        };

        const explanation = await service.generateMatchExplanation(player, searchParams, {
          searchIntent: `Find ${pos.position}`,
          priorityFactors: ['position', 'performance'],
          originalQuery: `test ${pos.position}`,
          resultRank: 1,
          totalResults: 1
        });

        // Each position should get some positive score when meeting basic expectations
        expect(explanation.strengthScore).toBeGreaterThanOrEqual(0);
        expect(explanation.strengthScore).toBeLessThanOrEqual(100);
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle missing search parameters gracefully', async () => {
      const player: Player = {
        id: 'test',
        name: 'Test Player',
        position: 'ST',
        age: 25,
        nationality: 'Brazil',
        currentClub: 'Test FC',
        goalsThisSeason: 10,
        assistsThisSeason: 3,
        appearancesThisSeason: 20,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Minimal search parameters
      const searchParams: AdvancedSearchParameters = {
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: []
      };

      const explanation = await service.generateMatchExplanation(player, searchParams, {
        searchIntent: 'Generic search',
        priorityFactors: [],
        originalQuery: 'player',
        resultRank: 50,
        totalResults: 100
      });

      expect(explanation).toBeDefined();
      expect(explanation.summary).toBeDefined();
      expect(explanation.strengthScore).toBeGreaterThanOrEqual(0);
      expect(explanation.strengthScore).toBeLessThanOrEqual(100);
    });

    it('should handle extreme values in player data', async () => {
      const playerWithExtremeValues: Player = {
        id: 'extreme',
        name: 'Extreme Player',
        position: 'ST',
        age: -5, // Invalid age
        nationality: '',
        currentClub: '',
        marketValueEuros: -1000000, // Negative market value
        heightCm: 300, // Unrealistic height
        goalsThisSeason: 1000, // Impossible goals
        assistsThisSeason: -5, // Negative assists
        appearancesThisSeason: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const searchParams: AdvancedSearchParameters = {
        position: ['ST'],
        age: { min: 20, max: 30 },
        sortBy: 'relevance',
        sortDirection: 'desc',
        page: 1,
        limit: 20,
        exactMatch: false,
        includeRetired: false,
        priorityFactors: ['position', 'age']
      };

      const explanation = await service.generateMatchExplanation(playerWithExtremeValues, searchParams, {
        searchIntent: 'Find striker',
        priorityFactors: ['position', 'age'],
        originalQuery: 'striker',
        resultRank: 10,
        totalResults: 5
      });

      // Should still generate explanation without crashing
      expect(explanation).toBeDefined();
      expect(explanation.strengthScore).toBeGreaterThanOrEqual(0);
      expect(explanation.strengthScore).toBeLessThanOrEqual(100);
    });
  });
}); 