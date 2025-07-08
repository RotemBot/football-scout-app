import OpenAI from 'openai';
import { config } from '../config';
import { SearchParameters, MatchExplanation, MatchedCriterion, PlayerResult } from '../models';

// JSON Schema for OpenAI function calling
const SEARCH_PARAMETERS_SCHEMA = {
  type: "object",
  properties: {
    position: {
      type: "array",
      items: { type: "string" },
      description: "Football positions (e.g., ST, CM, CB)"
    },
    age: {
      type: "object",
      properties: {
        min: { type: "number", minimum: 16, maximum: 45 },
        max: { type: "number", minimum: 16, maximum: 45 }
      },
      additionalProperties: false
    },
    nationality: {
      type: "array",
      items: { type: "string" },
      description: "Countries/nationalities"
    },
    league: {
      type: "array",
      items: { type: "string" },
      description: "Football leagues (e.g., Premier League, La Liga)"
    },
    marketValue: {
      type: "object",
      properties: {
        min: { type: "number", minimum: 0 },
        max: { type: "number", minimum: 0 }
      },
      additionalProperties: false,
      description: "Market value range in euros"
    },
    transferStatus: {
      type: "string",
      enum: ["available", "contract_ending", "any"],
      description: "Transfer availability status"
    },
    keywords: {
      type: "array",
      items: { type: "string" },
      description: "Additional search keywords"
    },
    parsedIntent: {
      type: "string",
      description: "Clear description of search intent"
    },
    priorityFactors: {
      type: "array",
      items: { type: "string" },
      description: "Most important search criteria in order"
    }
  },
  required: ["parsedIntent", "priorityFactors"],
  additionalProperties: false
};

const MATCH_EXPLANATION_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "1-2 sentence summary of why player matches"
    },
    potentialConcerns: {
      type: "array",
      items: { type: "string" },
      description: "Potential issues or mismatches"
    },
    additionalContext: {
      type: "string",
      description: "Relevant additional information"
    }
  },
  required: ["summary"],
  additionalProperties: false
};

interface ParsedQuery {
  searchParameters: SearchParameters;
  confidence: number;
  fallbackUsed: boolean;
  processingTime: number;
  cacheHit?: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface CacheEntry {
  result: SearchParameters;
  timestamp: number;
  confidence: number;
}

export class AIQueryParserService {
  private openai: OpenAI;
  private maxRetries = 3;
  private fallbackPatterns: RegExp[];
  private cache = new Map<string, CacheEntry>();
  private cacheMaxAge = 24 * 60 * 60 * 1000; // 24 hours
  private cacheCleanupInterval: NodeJS.Timeout | undefined;
  private usageStats = {
    totalQueries: 0,
    cacheHits: 0,
    fallbackUsed: 0,
    totalTokens: 0,
    processingTimes: [] as number[]
  };

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    // Initialize fallback patterns for basic parsing
    this.fallbackPatterns = [
      /position[:\s]+([a-zA-Z,\s]+)/i,
      /age[:\s]+(\d+)[\s]*-[\s]*(\d+)/i,
      /nationality[:\s]+([a-zA-Z,\s]+)/i,
      /league[:\s]+([a-zA-Z,\s]+)/i,
      /value[:\s]+€?(\d+)[\s]*m?/i,
    ];

    // Clean cache periodically - only in production
    if (process.env['NODE_ENV'] !== 'test') {
      this.cacheCleanupInterval = setInterval(() => this.cleanCache(), 60 * 60 * 1000); // Every hour
    }
  }

  /**
   * Cleanup method to prevent memory leaks
   */
  destroy(): void {
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = undefined;
    }
    this.cache.clear();
  }

  /**
   * Parse a natural language football scout query into structured search parameters
   */
  async parseQuery(freeText: string): Promise<ParsedQuery> {
    const startTime = Date.now();
    this.usageStats.totalQueries++;
    
    // Check cache first
    const cached = this.getCachedResult(freeText);
    if (cached) {
      this.usageStats.cacheHits++;
      const processingTime = Date.now() - startTime;
      this.usageStats.processingTimes.push(processingTime);
      return {
        searchParameters: { ...cached.result, originalQuery: freeText },
        confidence: cached.confidence,
        fallbackUsed: false,
        processingTime,
        cacheHit: true
      };
    }

    try {
      // Check for empty or very short queries - force fallback
      if (!freeText.trim() || freeText.trim().length <= 1) {
        throw new Error('Query too short for AI parsing');
      }
      
      // Try AI parsing with function calling
      const aiResult = await this.parseWithAIFunctionCalling(freeText);
      const confidence = this.calculateConfidence(aiResult.searchParameters, freeText);
      
      // Cache the result
      this.cacheResult(freeText, aiResult.searchParameters, confidence);
      
      const processingTime = Date.now() - startTime;
      this.usageStats.processingTimes.push(processingTime);
      
      return {
        searchParameters: { ...aiResult.searchParameters, originalQuery: freeText },
        confidence,
        fallbackUsed: false,
        processingTime,
        usage: aiResult.usage
      };
    } catch (error) {
      console.error('AI parsing failed, using fallback:', error);
      this.usageStats.fallbackUsed++;
      
      // Use fallback parsing
      const fallbackResult = this.parseWithFallback(freeText);
      
      const processingTime = Date.now() - startTime;
      this.usageStats.processingTimes.push(processingTime);
      
      return {
        searchParameters: fallbackResult,
        confidence: 0.6, // Lower confidence for fallback
        fallbackUsed: true,
        processingTime
      };
    }
  }

  /**
   * Generate match explanation for why a player matches the search criteria
   */
  async generateMatchExplanation(
    player: PlayerResult,
    searchParams: SearchParameters
  ): Promise<MatchExplanation> {
    try {
      const matchedCriteria = this.evaluateMatches(player, searchParams);
      const strengthScore = this.calculateMatchStrength(matchedCriteria);
      
      // Use function calling for structured explanation
      const aiExplanation = await this.generateExplanationWithAI(player, searchParams);
      
      return {
        summary: aiExplanation.summary,
        matchedCriteria,
        strengthScore,
        potentialConcerns: aiExplanation.potentialConcerns || this.identifyPotentialConcerns(player, searchParams),
        additionalContext: aiExplanation.additionalContext || this.generateAdditionalContext(player, searchParams)
      };
    } catch (error) {
      console.error('Match explanation generation failed:', error);
      
      // Fallback to simple explanation
      return this.generateFallbackExplanation(player, searchParams);
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats() {
    const avgProcessingTime = this.usageStats.processingTimes.length > 0 
      ? this.usageStats.processingTimes.reduce((a, b) => a + b, 0) / this.usageStats.processingTimes.length 
      : 0;
      
    // Extract only numeric values for the return, excluding arrays
    const { processingTimes, ...numericStats } = this.usageStats;
      
    return {
      ...numericStats,
      cacheHitRate: this.usageStats.totalQueries > 0 ? this.usageStats.cacheHits / this.usageStats.totalQueries : 0,
      fallbackRate: this.usageStats.totalQueries > 0 ? this.usageStats.fallbackUsed / this.usageStats.totalQueries : 0,
      cacheSize: this.cache.size,
      averageProcessingTime: avgProcessingTime
    };
  }

  /**
   * Clear cache manually
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Parse query using OpenAI function calling with JSON Schema
   */
  private async parseWithAIFunctionCalling(query: string): Promise<{ searchParameters: SearchParameters; usage: any }> {
    const functions = [
      {
        name: "parse_search_query",
        description: "Parse a football scout query into structured search parameters",
        parameters: SEARCH_PARAMETERS_SCHEMA
      }
    ];

    let retries = 0;
    while (retries < this.maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a football scout query parser. Parse natural language queries into structured search parameters.
              
              Position mappings:
              - Striker/Forward: ST, CF
              - Midfielder: CM, CDM, CAM, LM, RM
              - Defender: CB, LB, RB, LWB, RWB
              - Goalkeeper: GK
              
              Common leagues: Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Champions League, Europa League
              
              Be precise with age ranges and market values. Extract the user's true intent.`
            },
            {
              role: 'user',
              content: `Parse this football scout query: "${query}"`
            }
          ],
          functions,
          function_call: { name: "parse_search_query" },
          temperature: 0.1,
        });

        const functionCall = response.choices[0]?.message?.function_call;
        if (!functionCall || functionCall.name !== "parse_search_query") {
          throw new Error('No function call returned');
        }

        const parsed = JSON.parse(functionCall.arguments);
        const validated = this.validateSearchParameters(parsed);
        
        this.usageStats.totalTokens += response.usage?.total_tokens || 0;
        
        return {
          searchParameters: validated,
          usage: response.usage
        };
      } catch (error) {
        retries++;
        console.error(`AI function calling attempt ${retries} failed:`, error);
        
        if (retries >= this.maxRetries) {
          throw error;
        }
        
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries - 1)));
      }
    }

    throw new Error('AI parsing failed after all retries');
  }

  /**
   * Generate explanation using AI function calling
   */
  private async generateExplanationWithAI(player: PlayerResult, searchParams: SearchParameters): Promise<any> {
    const functions = [
      {
        name: "generate_match_explanation",
        description: "Generate explanation for why a player matches search criteria",
        parameters: MATCH_EXPLANATION_SCHEMA
      }
    ];

    const prompt = `
      Explain why this player matches the search criteria:
      
      Player: ${player.name}
      - Position: ${player.position}
      - Age: ${player.age}
      - Nationality: ${player.nationality}
      - Club: ${player.currentClub}
      - Market Value: €${player.marketValue || 'Unknown'}
      ${player.stats ? `- This season: ${player.stats.goals} goals, ${player.stats.assists} assists` : ''}
      
      Search: "${searchParams.originalQuery}"
      Intent: ${searchParams.parsedIntent}
      
      Provide a concise, football-focused explanation.
    `;

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      functions,
      function_call: { name: "generate_match_explanation" },
      temperature: 0.3,
    });

    const functionCall = response.choices[0]?.message?.function_call;
    if (!functionCall || functionCall.name !== "generate_match_explanation") {
      throw new Error('No function call returned for explanation');
    }

    return JSON.parse(functionCall.arguments);
  }

  /**
   * Validate and clean search parameters
   */
  private validateSearchParameters(params: any): SearchParameters {
    const validated: SearchParameters = {
      originalQuery: '',
      parsedIntent: params.parsedIntent || 'Football player search',
      priorityFactors: Array.isArray(params.priorityFactors) ? params.priorityFactors : []
    };

    // Validate position
    if (Array.isArray(params.position)) {
      const validPositions = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST', 'CF'];
      validated.position = params.position
        .map((p: string) => p.toUpperCase())
        .filter((p: string) => validPositions.includes(p));
    }

    // Validate age
    if (params.age && typeof params.age === 'object') {
      const age: any = {};
      if (typeof params.age.min === 'number' && params.age.min >= 16 && params.age.min <= 45) {
        age.min = params.age.min;
      }
      if (typeof params.age.max === 'number' && params.age.max >= 16 && params.age.max <= 45) {
        age.max = params.age.max;
      }
      if (age.min || age.max) {
        validated.age = age;
      }
    }

    // Validate other fields
    if (Array.isArray(params.nationality)) {
      validated.nationality = params.nationality.filter((n: any) => typeof n === 'string');
    }

    if (Array.isArray(params.league)) {
      validated.league = params.league.filter((l: any) => typeof l === 'string');
    }

    if (params.marketValue && typeof params.marketValue === 'object') {
      const marketValue: any = {};
      if (typeof params.marketValue.min === 'number' && params.marketValue.min >= 0) {
        marketValue.min = params.marketValue.min;
      }
      if (typeof params.marketValue.max === 'number' && params.marketValue.max >= 0) {
        marketValue.max = params.marketValue.max;
      }
      if (marketValue.min || marketValue.max) {
        validated.marketValue = marketValue;
      }
    }

    if (['available', 'contract_ending', 'any'].includes(params.transferStatus)) {
      validated.transferStatus = params.transferStatus;
    }

    if (Array.isArray(params.keywords)) {
      validated.keywords = params.keywords.filter((k: any) => typeof k === 'string');
    }

    return validated;
  }

  /**
   * Cache management
   */
  private getCachedResult(query: string): CacheEntry | null {
    const cached = this.cache.get(query.toLowerCase().trim());
    if (cached && Date.now() - cached.timestamp < this.cacheMaxAge) {
      return cached;
    }
    return null;
  }

  private cacheResult(query: string, result: SearchParameters, confidence: number) {
    this.cache.set(query.toLowerCase().trim(), {
      result,
      timestamp: Date.now(),
      confidence
    });
  }

  private cleanCache() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.cacheMaxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Fallback parsing using regex patterns
   */
  private parseWithFallback(query: string): SearchParameters {
    const lowerQuery = query.toLowerCase();
    const result: SearchParameters = {
      originalQuery: query,
      parsedIntent: 'Basic keyword search (fallback parsing)',
      priorityFactors: []
    };

    // Extract position with proper mapping
    const positionMap: Record<string, string[]> = {
      'gk': ['GK'],
      'goalkeeper': ['GK'],
      'cb': ['CB'],
      'center-back': ['CB'],
      'lb': ['LB'],
      'left-back': ['LB'],
      'rb': ['RB'],
      'right-back': ['RB'],
      'cm': ['CM'],
      'midfielder': ['CM'],
      'cdm': ['CDM'],
      'cam': ['CAM'],
      'lw': ['LW'],
      'left-wing': ['LW'],
      'rw': ['RW'],
      'right-wing': ['RW'],
      'st': ['ST'],
      'striker': ['ST', 'CF'],
      'cf': ['CF'],
      'center-forward': ['CF']
    };
    
    const foundPositions: string[] = [];
    Object.entries(positionMap).forEach(([key, values]) => {
      if (lowerQuery.includes(key)) {
        foundPositions.push(...values);
      }
    });
    
    if (foundPositions.length > 0) {
      result.position = [...new Set(foundPositions)]; // Remove duplicates
      result.priorityFactors.push('position');
    }

    // Extract age
    const ageMatch = lowerQuery.match(/(\d+)[\s]*-[\s]*(\d+)/);
    if (ageMatch && ageMatch[1] && ageMatch[2]) {
      result.age = { min: parseInt(ageMatch[1]), max: parseInt(ageMatch[2]) };
      result.priorityFactors.push('age');
    } else {
      const singleAgeMatch = lowerQuery.match(/under[\s]*(\d+)|below[\s]*(\d+)|over[\s]*(\d+)|above[\s]*(\d+)|(\d+)[\s]*years?[\s]*old/);
      if (singleAgeMatch) {
        const ageStr = singleAgeMatch[1] || singleAgeMatch[2] || singleAgeMatch[3] || singleAgeMatch[4] || singleAgeMatch[5];
        if (ageStr) {
          const age = parseInt(ageStr);
          if (lowerQuery.includes('under') || lowerQuery.includes('below')) {
            result.age = { max: age }; // Only set max for "under" queries
          } else if (lowerQuery.includes('over') || lowerQuery.includes('above')) {
            result.age = { min: age }; // Only set min for "over" queries
          } else {
            result.age = { min: age - 2, max: age + 2 };
          }
          result.priorityFactors.push('age');
        }
      }
    }

    // Extract common nationalities
    const nationalities = ['brazil', 'argentina', 'france', 'england', 'spain', 'germany', 'italy', 'portugal'];
    const foundNationalities = nationalities.filter(nat => lowerQuery.includes(nat));
    if (foundNationalities.length > 0) {
      result.nationality = foundNationalities.map(n => n.charAt(0).toUpperCase() + n.slice(1));
      result.priorityFactors.push('nationality');
    }

    // Extract leagues with proper case
    const leagueMap: Record<string, string> = {
      'premier league': 'Premier League',
      'la liga': 'La Liga', 
      'bundesliga': 'Bundesliga',
      'serie a': 'Serie A',
      'ligue 1': 'Ligue 1'
    };
    
    const foundLeagues: string[] = [];
    Object.entries(leagueMap).forEach(([key, value]) => {
      if (lowerQuery.includes(key)) {
        foundLeagues.push(value);
      }
    });
    
    if (foundLeagues.length > 0) {
      result.league = foundLeagues;
      result.priorityFactors.push('league');
    }

    // Extract height
    const heightMatch = lowerQuery.match(/(\d+(?:\.\d+)?)[\s]*m|over[\s]*(\d+(?:\.\d+)?)[\s]*m|(\d+)[\s]*cm/);
    if (heightMatch) {
      const heightStr = heightMatch[1] || heightMatch[2] || heightMatch[3];
      if (heightStr) {
        let height = parseFloat(heightStr);
        // Convert cm to cm, m to cm
        if (heightMatch[3]) {
          // Already in cm
        } else {
          height = height * 100; // Convert m to cm
        }
        
        if (lowerQuery.includes('over') || lowerQuery.includes('above')) {
          result.height = { min: height };
        } else {
          result.height = { min: height - 5, max: height + 5 }; // +/- 5cm tolerance
        }
        result.priorityFactors.push('height');
      }
    }

    // Extract keywords
    const words = query.split(/\s+/).filter(word => word.length > 2);
    result.keywords = words.filter(word => 
      !foundPositions.some(pos => word.toLowerCase().includes(pos)) &&
      !foundNationalities.some(nat => word.toLowerCase().includes(nat)) &&
      !foundLeagues.some(league => word.toLowerCase().includes(league)) &&
      !/\d+(\.\d+)?m?/.test(word) // Exclude height-related words
    );

    return result;
  }

  /**
   * Calculate confidence based on how well the AI understood the query
   */
  private calculateConfidence(params: SearchParameters, originalQuery: string): number {
    let confidence = 0.5; // Base confidence
    
    if (params.position && params.position.length > 0) confidence += 0.2;
    if (params.age) confidence += 0.15;
    if (params.nationality && params.nationality.length > 0) confidence += 0.1;
    if (params.league && params.league.length > 0) confidence += 0.1;
    if (params.marketValue) confidence += 0.1;
    if (params.priorityFactors.length > 0) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Evaluate how well a player matches the search criteria
   */
  private evaluateMatches(player: PlayerResult, searchParams: SearchParameters): MatchedCriterion[] {
    const matches: MatchedCriterion[] = [];

    // Position match
    if (searchParams.position && player.position) {
      const match = searchParams.position.some(pos => 
        player.position.toLowerCase().includes(pos.toLowerCase())
      );
      if (match) {
        matches.push({
          criterion: 'Position',
          searchValue: searchParams.position.join(', '),
          playerValue: player.position,
          matchStrength: 'perfect',
          explanation: `Player position ${player.position} matches search criteria`
        });
      }
    }

    // Age match
    if (searchParams.age && player.age) {
      let matchStrength: 'perfect' | 'good' | 'partial' | 'weak' = 'weak';
      
      if (searchParams.age.min && searchParams.age.max) {
        if (player.age >= searchParams.age.min && player.age <= searchParams.age.max) {
          matchStrength = 'perfect';
        }
      } else if (searchParams.age.max && player.age <= searchParams.age.max) {
        matchStrength = 'good';
      } else if (searchParams.age.min && player.age >= searchParams.age.min) {
        matchStrength = 'good';
      }

      if (matchStrength !== 'weak') {
        matches.push({
          criterion: 'Age',
          searchValue: `${searchParams.age.min || '?'}-${searchParams.age.max || '?'}`,
          playerValue: player.age.toString(),
          matchStrength,
          explanation: `Player age ${player.age} fits the requested range`
        });
      }
    }

    // Nationality match
    if (searchParams.nationality && player.nationality) {
      const match = searchParams.nationality.some(nat => 
        player.nationality.toLowerCase().includes(nat.toLowerCase())
      );
      if (match) {
        matches.push({
          criterion: 'Nationality',
          searchValue: searchParams.nationality.join(', '),
          playerValue: player.nationality,
          matchStrength: 'perfect',
          explanation: `Player nationality ${player.nationality} matches search criteria`
        });
      }
    }

    return matches;
  }

  /**
   * Calculate overall match strength score
   */
  private calculateMatchStrength(criteria: MatchedCriterion[]): number {
    if (criteria.length === 0) return 0;

    const strengthValues = { perfect: 100, good: 80, partial: 60, weak: 40 };
    const totalScore = criteria.reduce((sum, criterion) => 
      sum + strengthValues[criterion.matchStrength], 0
    );

    return Math.round(totalScore / criteria.length);
  }

  /**
   * Extract summary from AI explanation
   */
  private extractSummary(aiExplanation: string): string {
    const lines = aiExplanation.split('\n').filter(line => line.trim());
    return lines[0] || 'Player matches search criteria';
  }

  /**
   * Identify potential concerns
   */
  private identifyPotentialConcerns(player: PlayerResult, searchParams: SearchParameters): string[] {
    const concerns: string[] = [];

    // Age concerns
    if (searchParams.age && player.age) {
      if (searchParams.age.max && player.age > searchParams.age.max) {
        concerns.push(`Player is older than requested (${player.age} vs max ${searchParams.age.max})`);
      }
      if (searchParams.age.min && player.age < searchParams.age.min) {
        concerns.push(`Player is younger than requested (${player.age} vs min ${searchParams.age.min})`);
      }
    }

    // Market value concerns
    if (searchParams.marketValue && player.marketValue) {
      if (searchParams.marketValue.max && player.marketValue > searchParams.marketValue.max) {
        concerns.push('Player may be above budget');
      }
    }

    return concerns;
  }

  /**
   * Generate additional context
   */
  private generateAdditionalContext(player: PlayerResult, searchParams: SearchParameters): string {
    const context: string[] = [];

    if (player.stats) {
      context.push(`This season: ${player.stats.goals} goals, ${player.stats.assists} assists`);
    }

    if (player.contractExpiry) {
      const expiry = new Date(player.contractExpiry);
      const now = new Date();
      const monthsLeft = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
      
      if (monthsLeft < 12) {
        context.push(`Contract expires in ${monthsLeft} months - potential bargain`);
      }
    }

    return context.join('. ');
  }

  /**
   * Generate fallback explanation when AI fails
   */
  private generateFallbackExplanation(player: PlayerResult, searchParams: SearchParameters): MatchExplanation {
    const matchedCriteria = this.evaluateMatches(player, searchParams);
    const strengthScore = this.calculateMatchStrength(matchedCriteria);

    return {
      summary: `${player.name} matches ${matchedCriteria.length} of your search criteria`,
      matchedCriteria,
      strengthScore,
      potentialConcerns: this.identifyPotentialConcerns(player, searchParams),
      additionalContext: this.generateAdditionalContext(player, searchParams)
    };
  }
} 