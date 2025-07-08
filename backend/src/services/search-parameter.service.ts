import { AIQueryParserService } from './ai-query-parser.service';
import { MatchExplanationService } from './match-explanation.service';
import { PlayerRepository } from '../repositories/player.repository';
import { 
  SearchParameterValidator, 
  SearchParameterSanitizer, 
  SearchQueryBuilder,
  AdvancedSearchParameters,
  DatabaseQueryParameters,
  FOOTBALL_POSITIONS,
  MAJOR_LEAGUES
} from '../schemas/search-parameters.schema';
import { SearchParameters, Player, SearchQuery, SearchResult, MatchExplanation } from '../models';
import { Pool } from 'pg';

interface SearchContext {
  searchId: string;
  sessionId?: string;
  userIp?: string;
  timestamp: Date;
}

interface SearchMetrics {
  processingTime: number;
  aiParsingTime: number;
  databaseQueryTime: number;
  validationTime: number;
  sanitizationTime: number;
  totalResults: number;
  cacheHit: boolean;
  aiConfidence: number;
  fallbackUsed: boolean;
}

interface EnhancedSearchResult {
  players: Player[];
  metadata: {
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
    filters: DatabaseQueryParameters;
    searchQuery: string;
    aiIntent: string;
    suggestions?: string[];
  };
  metrics: SearchMetrics;
  context: SearchContext;
}

export class SearchParameterService {
  private aiParser: AIQueryParserService;
  private matchExplainer: MatchExplanationService;
  private playerRepository: PlayerRepository;
  private dbPool: Pool;

  constructor(dbPool: Pool) {
    this.dbPool = dbPool;
    this.aiParser = new AIQueryParserService();
    this.matchExplainer = new MatchExplanationService();
    this.playerRepository = new PlayerRepository(dbPool);
  }

  /**
   * Main search method that handles the complete flow
   */
  async search(
    query: string, 
    additionalParams: Partial<AdvancedSearchParameters> = {},
    context: Partial<SearchContext> = {}
  ): Promise<EnhancedSearchResult> {
    const startTime = Date.now();
    const searchContext: SearchContext = {
      searchId: this.generateSearchId(),
      timestamp: new Date(),
      ...context
    };

    try {
      // Step 1: AI parsing
      const aiStartTime = Date.now();
      const aiResult = await this.aiParser.parseQuery(query);
      const aiParsingTime = Date.now() - aiStartTime;

      // Step 2: Convert AI result to search parameters
      const baseParams = this.convertAIResultToSearchParams(aiResult.searchParameters, additionalParams);

      // Step 3: Validation
      const validationStartTime = Date.now();
      const validatedParams = this.validateSearchParameters(baseParams);
      const validationTime = Date.now() - validationStartTime;

      // Step 4: Sanitization
      const sanitizationStartTime = Date.now();
      const sanitizedParams = SearchParameterSanitizer.sanitize(validatedParams) as AdvancedSearchParameters;
      const sanitizationTime = Date.now() - sanitizationStartTime;

      // Step 5: Convert to database query parameters
      const dbParams = this.convertToDbParams(sanitizedParams, searchContext);

      // Step 6: Execute database query
      const dbStartTime = Date.now();
      const players = await this.executeSearch(dbParams);
      const totalCount = await this.getSearchResultCount(dbParams);
      const databaseQueryTime = Date.now() - dbStartTime;

      // Step 6.5: Generate match explanations for players
      await this.enrichPlayersWithMatchExplanations(players, sanitizedParams, {
        searchIntent: aiResult.searchParameters.parsedIntent,
        priorityFactors: aiResult.searchParameters.priorityFactors,
        originalQuery: query,
        totalResults: totalCount
      });

      // Step 7: Log search query and results
      await this.logSearchQuery(query, aiResult.searchParameters, searchContext);
      await this.logSearchResults(searchContext.searchId, players, aiResult.confidence);

      // Step 8: Generate suggestions
      const suggestions = await this.generateSuggestions(dbParams, players.length);

      const totalTime = Date.now() - startTime;

      return {
        players,
        metadata: {
          totalCount,
          page: dbParams.page,
          limit: dbParams.limit,
          hasMore: totalCount > dbParams.page * dbParams.limit,
          filters: dbParams,
          searchQuery: query,
          aiIntent: aiResult.searchParameters.parsedIntent,
          suggestions
        },
        metrics: {
          processingTime: totalTime,
          aiParsingTime,
          databaseQueryTime,
          validationTime,
          sanitizationTime,
          totalResults: players.length,
          cacheHit: aiResult.cacheHit || false,
          aiConfidence: aiResult.confidence,
          fallbackUsed: aiResult.fallbackUsed
        },
        context: searchContext
      };

    } catch (error) {
      console.error('Search failed:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search with pre-validated parameters (for API endpoints)
   */
  async searchWithParameters(
    params: AdvancedSearchParameters,
    context: Partial<SearchContext> = {}
  ): Promise<EnhancedSearchResult> {
    const startTime = Date.now();
    const searchContext: SearchContext = {
      searchId: this.generateSearchId(),
      timestamp: new Date(),
      ...context
    };

    try {
      // Convert to database parameters
      const dbParams = this.convertToDbParams(params, searchContext);

      // Execute search
      const dbStartTime = Date.now();
      const players = await this.executeSearch(dbParams);
      const totalCount = await this.getSearchResultCount(dbParams);
      const databaseQueryTime = Date.now() - dbStartTime;

      // Log the search
      if (params.originalQuery) {
        await this.logSearchQuery(params.originalQuery, {
          originalQuery: params.originalQuery,
          parsedIntent: params.parsedIntent || 'Direct parameter search',
          priorityFactors: params.priorityFactors || []
        } as SearchParameters, searchContext);
      }

      const totalTime = Date.now() - startTime;

      return {
        players,
        metadata: {
          totalCount,
          page: dbParams.page,
          limit: dbParams.limit,
          hasMore: totalCount > dbParams.page * dbParams.limit,
          filters: dbParams,
          searchQuery: params.originalQuery || 'Parameter-based search',
          aiIntent: params.parsedIntent || 'Direct parameter search'
        },
        metrics: {
          processingTime: totalTime,
          aiParsingTime: 0,
          databaseQueryTime,
          validationTime: 0,
          sanitizationTime: 0,
          totalResults: players.length,
          cacheHit: false,
          aiConfidence: params.confidence || 1.0,
          fallbackUsed: false
        },
        context: searchContext
      };

    } catch (error) {
      console.error('Parameter search failed:', error);
      throw new Error(`Parameter search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available filter options for UI
   */
  async getFilterOptions(): Promise<{
    positions: string[];
    leagues: string[];
    nationalities: string[];
    clubs: string[];
  }> {
    const positions = [...FOOTBALL_POSITIONS];
    const leagues = [...MAJOR_LEAGUES];

    // Get distinct values from database
    const nationalitiesResult = await this.dbPool.query(
      'SELECT DISTINCT nationality FROM players WHERE nationality IS NOT NULL ORDER BY nationality'
    );

    const clubsResult = await this.dbPool.query(
      'SELECT DISTINCT current_club FROM players WHERE current_club IS NOT NULL ORDER BY current_club LIMIT 100'
    );

    return {
      positions,
      leagues,
      nationalities: nationalitiesResult.rows.map(row => row.nationality),
      clubs: clubsResult.rows.map(row => row.current_club)
    };
  }

  /**
   * Validate search parameters
   */
  validateSearchParameters(params: any): AdvancedSearchParameters {
    const validation = SearchParameterValidator.safeValidateAdvanced(params);
    
    if (!validation.success) {
      const errors = validation.errors?.issues.map(issue => 
        `${issue.path.join('.')}: ${issue.message}`
      ).join(', ');
      throw new Error(`Invalid search parameters: ${errors}`);
    }

    return validation.data!;
  }

  /**
   * Convert AI parsing result to search parameters
   */
     private convertAIResultToSearchParams(
     aiParams: SearchParameters, 
     additionalParams: Partial<AdvancedSearchParameters>
   ): AdvancedSearchParameters {
     return {
       ...additionalParams,
       position: aiParams.position as any,
       age: aiParams.age,
       nationality: aiParams.nationality,
       league: aiParams.league as any,
       marketValue: aiParams.marketValue,
       transferStatus: aiParams.transferStatus,
       keywords: aiParams.keywords,
       originalQuery: aiParams.originalQuery,
       parsedIntent: aiParams.parsedIntent,
       priorityFactors: aiParams.priorityFactors,
       confidence: aiParams.confidence,
       searchId: aiParams.searchId,
       sessionId: aiParams.sessionId,
       // Use defaults from schema for missing values
       sortBy: additionalParams.sortBy || 'relevance',
       sortDirection: additionalParams.sortDirection || 'desc',
       page: additionalParams.page || 1,
       limit: additionalParams.limit || 20,
       exactMatch: additionalParams.exactMatch || false,
       includeRetired: additionalParams.includeRetired || false
     };
   }

  /**
   * Convert to database query parameters
   */
  private convertToDbParams(
    params: AdvancedSearchParameters, 
    context: SearchContext
  ): DatabaseQueryParameters {
    return {
      ...params,
      searchId: context.searchId,
      // Add database-specific defaults
      includeInactive: false,
      dataQualityThreshold: 50,
      maxResults: 1000,
      useIndex: true,
      forceFullScan: false,
      includeStats: true,
      includeMetadata: false,
      includeMatchExplanation: true
    };
  }

  /**
   * Execute the actual database search
   */
  private async executeSearch(params: DatabaseQueryParameters): Promise<Player[]> {
    const { query, values } = SearchQueryBuilder.buildSelectQuery(params);
    const result = await this.dbPool.query(query, values);
    
    return result.rows.map(row => this.playerRepository.transformFromDb(row));
  }

  /**
   * Get total count for pagination
   */
  private async getSearchResultCount(params: DatabaseQueryParameters): Promise<number> {
    const { whereClause, values } = SearchQueryBuilder.buildWhereClause(params);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM players 
      ${whereClause}
    `;

    const result = await this.dbPool.query(countQuery, values);
    return parseInt(result.rows[0].total, 10);
  }

  /**
   * Log search query to database
   */
  private async logSearchQuery(
    queryText: string, 
    parsedCriteria: SearchParameters, 
    context: SearchContext
  ): Promise<void> {
    try {
      await this.dbPool.query(
        `INSERT INTO search_queries (id, query_text, parsed_criteria, user_ip, created_at) 
         VALUES ($1, $2, $3, $4, $5)`,
        [
          context.searchId,
          queryText,
          JSON.stringify(parsedCriteria),
          context.userIp,
          context.timestamp
        ]
      );
    } catch (error) {
      console.error('Failed to log search query:', error);
      // Don't throw - logging failure shouldn't break search
    }
  }

  /**
   * Log search results to database
   */
  private async logSearchResults(
    searchId: string, 
    players: Player[], 
    confidence: number
  ): Promise<void> {
    try {
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (player) {
          await this.dbPool.query(
            `INSERT INTO search_results (id, search_query_id, player_id, match_score, result_rank, created_at) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              this.generateId(),
              searchId,
              player.id,
              Math.round(confidence * 100),
              i + 1,
              new Date()
            ]
          );
        }
      }
    } catch (error) {
      console.error('Failed to log search results:', error);
      // Don't throw - logging failure shouldn't break search
    }
  }

  /**
   * Generate search suggestions based on results
   */
  private async generateSuggestions(
    params: DatabaseQueryParameters, 
    resultCount: number
  ): Promise<string[]> {
    const suggestions: string[] = [];

    // If few results, suggest broadening search
    if (resultCount < 5) {
      if (params.age && (params.age.max! - params.age.min!) < 5) {
        suggestions.push('Try expanding the age range');
      }
      if (params.marketValue && params.marketValue.max) {
        suggestions.push('Consider increasing the maximum market value');
      }
      if (params.position && params.position.length === 1) {
        suggestions.push('Try including similar positions');
      }
    }

    // If too many results, suggest narrowing
    if (resultCount > 50) {
      suggestions.push('Add more specific criteria to narrow results');
      if (!params.age) {
        suggestions.push('Consider adding an age range');
      }
      if (!params.marketValue) {
        suggestions.push('Consider adding a market value range');
      }
    }

    return suggestions;
  }

  /**
   * Enrich players with match explanations
   */
  private async enrichPlayersWithMatchExplanations(
    players: Player[],
    searchParams: AdvancedSearchParameters,
    context: {
      searchIntent: string;
      priorityFactors: string[];
      originalQuery: string;
      totalResults: number;
    }
  ): Promise<void> {
    try {
      for (let i = 0; i < players.length; i++) {
        const player = players[i];
        if (player) {
          const explanationContext = {
            searchIntent: context.searchIntent,
            priorityFactors: context.priorityFactors,
            originalQuery: context.originalQuery,
            resultRank: i + 1,
            totalResults: context.totalResults
          };

          const matchExplanation = await this.matchExplainer.generateMatchExplanation(
            player,
            searchParams,
            explanationContext
          );

          // Attach the explanation to the player result
          (player as any).matchExplanation = matchExplanation;
        }
      }
    } catch (error) {
      console.error('Failed to generate match explanations:', error);
      // Continue without explanations rather than failing the entire search
    }
  }

  /**
   * Generate unique IDs
   */
  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
} 