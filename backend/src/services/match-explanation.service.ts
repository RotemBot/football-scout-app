import { Player, SearchParameters, MatchExplanation, MatchedCriterion, PlayerStats } from '../models';
import { AdvancedSearchParameters } from '../schemas/search-parameters.schema';

// Scoring weights for different criteria
const SCORING_WEIGHTS = {
  position: 25,           // Position match is very important
  age: 20,               // Age within range is important
  nationality: 15,       // Nationality match is moderately important
  league: 12,            // League experience is valuable
  marketValue: 10,       // Market value within budget
  performance: 8,        // Goals/assists performance
  club: 5,               // Current club relevance
  physical: 3,           // Height/foot preference
  contract: 2            // Contract status
} as const;

// Performance benchmarks by position
const POSITION_BENCHMARKS = {
  'ST': { goals: 15, assists: 5, appearances: 25 },
  'CF': { goals: 12, assists: 8, appearances: 25 },
  'LW': { goals: 8, assists: 10, appearances: 25 },
  'RW': { goals: 8, assists: 10, appearances: 25 },
  'CAM': { goals: 6, assists: 12, appearances: 25 },
  'CM': { goals: 4, assists: 8, appearances: 25 },
  'CDM': { goals: 2, assists: 6, appearances: 25 },
  'LB': { goals: 1, assists: 4, appearances: 25 },
  'RB': { goals: 1, assists: 4, appearances: 25 },
  'CB': { goals: 2, assists: 2, appearances: 25 },
  'GK': { goals: 0, assists: 0, appearances: 25 }
} as const;

interface DetailedMatchScore {
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  breakdown: {
    [key: string]: {
      score: number;
      maxScore: number;
      weight: number;
      explanation: string;
    };
  };
}

interface ExplanationContext {
  searchIntent: string;
  priorityFactors: string[];
  originalQuery: string;
  resultRank: number;
  totalResults: number;
}

export class MatchExplanationService {
  /**
   * Generate comprehensive match explanation with advanced scoring
   */
  async generateMatchExplanation(
    player: Player,
    searchParams: AdvancedSearchParameters,
    context: ExplanationContext
  ): Promise<MatchExplanation> {
    try {
      // Calculate detailed scoring
      const detailedScore = this.calculateDetailedScore(player, searchParams);
      
      // Generate matched criteria with explanations
      const matchedCriteria = this.generateMatchedCriteria(player, searchParams, detailedScore);
      
      // Create summary based on scoring and context
      const summary = this.generateSummary(player, searchParams, detailedScore, context);
      
      // Identify potential concerns
      const concerns = this.identifyPotentialConcerns(player, searchParams, detailedScore);
      
      // Generate additional context
      const additionalContext = this.generateAdditionalContext(player, searchParams, context);

      return {
        summary,
        matchedCriteria,
        strengthScore: Math.round(detailedScore.percentage),
        potentialConcerns: concerns,
        additionalContext
      };

    } catch (error) {
      console.error('Match explanation generation failed:', error);
      return this.generateFallbackExplanation(player, searchParams);
    }
  }

  /**
   * Calculate detailed scoring with breakdown
   */
  private calculateDetailedScore(
    player: Player,
    searchParams: AdvancedSearchParameters
  ): DetailedMatchScore {
    const breakdown: DetailedMatchScore['breakdown'] = {};
    let totalScore = 0;
    let maxPossibleScore = 0;

    // Position scoring
    if (searchParams.position) {
      const positionMatch = this.scorePosition(player, searchParams.position);
      breakdown['position'] = {
        score: positionMatch.score,
        maxScore: SCORING_WEIGHTS.position,
        weight: SCORING_WEIGHTS.position,
        explanation: positionMatch.explanation
      };
      totalScore += positionMatch.score;
      maxPossibleScore += SCORING_WEIGHTS.position;
    }

    // Age scoring
    if (searchParams.age) {
      const ageMatch = this.scoreAge(player, searchParams.age as { min?: number; max?: number });
      breakdown['age'] = {
        score: ageMatch.score,
        maxScore: SCORING_WEIGHTS.age,
        weight: SCORING_WEIGHTS.age,
        explanation: ageMatch.explanation
      };
      totalScore += ageMatch.score;
      maxPossibleScore += SCORING_WEIGHTS.age;
    }

    // Nationality scoring
    if (searchParams.nationality) {
      const nationalityMatch = this.scoreNationality(player, searchParams.nationality);
      breakdown['nationality'] = {
        score: nationalityMatch.score,
        maxScore: SCORING_WEIGHTS.nationality,
        weight: SCORING_WEIGHTS.nationality,
        explanation: nationalityMatch.explanation
      };
      totalScore += nationalityMatch.score;
      maxPossibleScore += SCORING_WEIGHTS.nationality;
    }

    // League scoring
    if (searchParams.league) {
      const leagueMatch = this.scoreLeague(player, searchParams.league);
      breakdown['league'] = {
        score: leagueMatch.score,
        maxScore: SCORING_WEIGHTS.league,
        weight: SCORING_WEIGHTS.league,
        explanation: leagueMatch.explanation
      };
      totalScore += leagueMatch.score;
      maxPossibleScore += SCORING_WEIGHTS.league;
    }

    // Market value scoring
    if (searchParams.marketValue) {
      const marketValueMatch = this.scoreMarketValue(player, searchParams.marketValue as { min?: number; max?: number });
      breakdown['marketValue'] = {
        score: marketValueMatch.score,
        maxScore: SCORING_WEIGHTS.marketValue,
        weight: SCORING_WEIGHTS.marketValue,
        explanation: marketValueMatch.explanation
      };
      totalScore += marketValueMatch.score;
      maxPossibleScore += SCORING_WEIGHTS.marketValue;
    }

    // Performance scoring (always included)
    const performanceMatch = this.scorePerformance(player, searchParams);
    breakdown['performance'] = {
      score: performanceMatch.score,
      maxScore: SCORING_WEIGHTS.performance,
      weight: SCORING_WEIGHTS.performance,
      explanation: performanceMatch.explanation
    };
    totalScore += performanceMatch.score;
    maxPossibleScore += SCORING_WEIGHTS.performance;

    // Contract status scoring
    if (searchParams.transferStatus || searchParams.contractExpiring) {
      const contractMatch = this.scoreContractStatus(player, searchParams);
      breakdown['contract'] = {
        score: contractMatch.score,
        maxScore: SCORING_WEIGHTS.contract,
        weight: SCORING_WEIGHTS.contract,
        explanation: contractMatch.explanation
      };
      totalScore += contractMatch.score;
      maxPossibleScore += SCORING_WEIGHTS.contract;
    }

    const percentage = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 100 : 0;

    return {
      totalScore,
      maxPossibleScore,
      percentage,
      breakdown
    };
  }

  /**
   * Score position match
   */
  private scorePosition(player: Player, searchPositions: string[]): { score: number; explanation: string } {
    if (!player.position) {
      return { score: 0, explanation: 'Player position not specified' };
    }

    const playerPos = player.position.toUpperCase();
    const perfectMatch = searchPositions.includes(playerPos);
    
    if (perfectMatch) {
      return {
        score: SCORING_WEIGHTS.position,
        explanation: `Perfect position match: ${player.position}`
      };
    }

    // Check for compatible positions
    const compatiblePositions = this.getCompatiblePositions(playerPos);
    const hasCompatible = searchPositions.some(pos => compatiblePositions.includes(pos));
    
    if (hasCompatible) {
      return {
        score: Math.round(SCORING_WEIGHTS.position * 0.7),
        explanation: `Compatible position: ${player.position} can play ${searchPositions.join(', ')}`
      };
    }

    return {
      score: 0,
      explanation: `Position mismatch: ${player.position} vs requested ${searchPositions.join(', ')}`
    };
  }

  /**
   * Score age match
   */
  private scoreAge(player: Player, ageRange: { min?: number; max?: number }): { score: number; explanation: string } {
    if (!player.age) {
      return { score: 0, explanation: 'Player age not specified' };
    }

    const { min, max } = ageRange;
    
    // Perfect range match
    if (min && max && player.age >= min && player.age <= max) {
      return {
        score: SCORING_WEIGHTS.age,
        explanation: `Perfect age match: ${player.age} within ${min}-${max} range`
      };
    }

    // Single boundary matches
    if (max && !min && player.age <= max) {
      return {
        score: SCORING_WEIGHTS.age,
        explanation: `Age requirement met: ${player.age} under ${max}`
      };
    }

    if (min && !max && player.age >= min) {
      return {
        score: SCORING_WEIGHTS.age,
        explanation: `Age requirement met: ${player.age} over ${min}`
      };
    }

    // Close to range (within 2 years)
    if (min && max) {
      const closeToRange = (player.age >= min - 2 && player.age < min) || 
                          (player.age > max && player.age <= max + 2);
      
      if (closeToRange) {
        return {
          score: Math.round(SCORING_WEIGHTS.age * 0.5),
          explanation: `Close to age range: ${player.age} near ${min}-${max}`
        };
      }
    }

    return {
      score: 0,
      explanation: `Age mismatch: ${player.age} vs requested ${min || '?'}-${max || '?'}`
    };
  }

  /**
   * Score nationality match
   */
  private scoreNationality(player: Player, searchNationalities: string[]): { score: number; explanation: string } {
    if (!player.nationality) {
      return { score: 0, explanation: 'Player nationality not specified' };
    }

    const exactMatch = searchNationalities.some(nat => 
      player.nationality!.toLowerCase() === nat.toLowerCase()
    );

    if (exactMatch) {
      return {
        score: SCORING_WEIGHTS.nationality,
        explanation: `Nationality match: ${player.nationality}`
      };
    }

    // Check for partial matches (e.g., "England" vs "English")
    const partialMatch = searchNationalities.some(nat => 
      player.nationality!.toLowerCase().includes(nat.toLowerCase()) ||
      nat.toLowerCase().includes(player.nationality!.toLowerCase())
    );

    if (partialMatch) {
      return {
        score: Math.round(SCORING_WEIGHTS.nationality * 0.8),
        explanation: `Nationality partial match: ${player.nationality}`
      };
    }

    return {
      score: 0,
      explanation: `Nationality mismatch: ${player.nationality} vs ${searchNationalities.join(', ')}`
    };
  }

  /**
   * Score league match
   */
  private scoreLeague(player: Player, searchLeagues: string[]): { score: number; explanation: string } {
    if (!player.league) {
      return { score: 0, explanation: 'Player league not specified' };
    }

    const exactMatch = searchLeagues.some(league => 
      player.league!.toLowerCase() === league.toLowerCase()
    );

    if (exactMatch) {
      return {
        score: SCORING_WEIGHTS.league,
        explanation: `League match: ${player.league}`
      };
    }

    // Check for similar leagues (e.g., top 5 European leagues)
    const topLeagues = ['Premier League', 'La Liga', 'Bundesliga', 'Serie A', 'Ligue 1'];
    const playerInTopLeague = topLeagues.includes(player.league);
    const searchInTopLeagues = searchLeagues.some(league => topLeagues.includes(league));

    if (playerInTopLeague && searchInTopLeagues) {
      return {
        score: Math.round(SCORING_WEIGHTS.league * 0.6),
        explanation: `Similar level league: ${player.league} (top European league)`
      };
    }

    return {
      score: 0,
      explanation: `League mismatch: ${player.league} vs ${searchLeagues.join(', ')}`
    };
  }

  /**
   * Score market value match
   */
  private scoreMarketValue(player: Player, valueRange: { min?: number; max?: number }): { score: number; explanation: string } {
    if (!player.marketValueEuros) {
      return { score: 0, explanation: 'Player market value not specified' };
    }

    const { min, max } = valueRange;
    const playerValue = player.marketValueEuros;

    // Perfect range match
    if (min && max && playerValue >= min && playerValue <= max) {
      return {
        score: SCORING_WEIGHTS.marketValue,
        explanation: `Market value within budget: €${this.formatValue(playerValue)}`
      };
    }

    // Under maximum (good for budget)
    if (max && !min && playerValue <= max) {
      return {
        score: SCORING_WEIGHTS.marketValue,
        explanation: `Under budget: €${this.formatValue(playerValue)} (max €${this.formatValue(max)})`
      };
    }

    // Above minimum (quality indicator)
    if (min && !max && playerValue >= min) {
      return {
        score: SCORING_WEIGHTS.marketValue,
        explanation: `Quality player: €${this.formatValue(playerValue)} (min €${this.formatValue(min)})`
      };
    }

    // Slightly over budget (within 20%)
    if (max && playerValue > max && playerValue <= max * 1.2) {
      return {
        score: Math.round(SCORING_WEIGHTS.marketValue * 0.6),
        explanation: `Slightly over budget: €${this.formatValue(playerValue)} (max €${this.formatValue(max)})`
      };
    }

    return {
      score: 0,
      explanation: `Market value mismatch: €${this.formatValue(playerValue)}`
    };
  }

  /**
   * Score performance based on position
   */
  private scorePerformance(player: Player, searchParams: AdvancedSearchParameters): { score: number; explanation: string } {
    if (!player.position) {
      return { score: 0, explanation: 'Position not specified for performance evaluation' };
    }

    const position = player.position.toUpperCase() as keyof typeof POSITION_BENCHMARKS;
    const benchmark = POSITION_BENCHMARKS[position] || POSITION_BENCHMARKS['CM'];
    
    let performanceScore = 0;
    const explanations: string[] = [];

    // Goals performance
    const goalRatio = player.goalsThisSeason / benchmark.goals;
    if (goalRatio >= 1.2) {
      performanceScore += 3;
      explanations.push(`Excellent goals: ${player.goalsThisSeason}`);
    } else if (goalRatio >= 0.8) {
      performanceScore += 2;
      explanations.push(`Good goals: ${player.goalsThisSeason}`);
    } else if (goalRatio >= 0.5) {
      performanceScore += 1;
      explanations.push(`Average goals: ${player.goalsThisSeason}`);
    }

    // Assists performance
    const assistRatio = player.assistsThisSeason / benchmark.assists;
    if (assistRatio >= 1.2) {
      performanceScore += 3;
      explanations.push(`Excellent assists: ${player.assistsThisSeason}`);
    } else if (assistRatio >= 0.8) {
      performanceScore += 2;
      explanations.push(`Good assists: ${player.assistsThisSeason}`);
    }

    // Appearances (consistency)
    if (player.appearancesThisSeason >= benchmark.appearances) {
      performanceScore += 2;
      explanations.push(`Regular starter: ${player.appearancesThisSeason} games`);
    } else if (player.appearancesThisSeason >= benchmark.appearances * 0.7) {
      performanceScore += 1;
      explanations.push(`Good availability: ${player.appearancesThisSeason} games`);
    }

    const finalScore = Math.min(performanceScore, SCORING_WEIGHTS.performance);
    
    return {
      score: finalScore,
      explanation: explanations.length > 0 ? explanations.join(', ') : 'Limited performance data'
    };
  }

  /**
   * Score contract status
   */
  private scoreContractStatus(player: Player, searchParams: AdvancedSearchParameters): { score: number; explanation: string } {
    if (!player.contractExpires) {
      return { score: 0, explanation: 'Contract expiry date not available' };
    }

    const now = new Date();
    const expiryDate = new Date(player.contractExpires);
    const monthsLeft = Math.round((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));

    if (searchParams.transferStatus === 'available' || searchParams.contractExpiring) {
      if (monthsLeft <= 6) {
        return {
          score: SCORING_WEIGHTS.contract,
          explanation: `Contract expires soon: ${monthsLeft} months (potential bargain)`
        };
      }
      
      if (monthsLeft <= 12) {
        return {
          score: Math.round(SCORING_WEIGHTS.contract * 0.8),
          explanation: `Contract expires within a year: ${monthsLeft} months`
        };
      }
    }

    if (monthsLeft > 24) {
      return {
        score: Math.round(SCORING_WEIGHTS.contract * 0.5),
        explanation: `Long-term contract: ${monthsLeft} months remaining`
      };
    }

    return { score: 0, explanation: 'Contract status neutral' };
  }

  /**
   * Generate matched criteria array
   */
  private generateMatchedCriteria(
    player: Player,
    searchParams: AdvancedSearchParameters,
    detailedScore: DetailedMatchScore
  ): MatchedCriterion[] {
    const criteria: MatchedCriterion[] = [];

    Object.entries(detailedScore.breakdown).forEach(([criterion, data]) => {
      if (data.score > 0) {
        const strengthPercentage = (data.score / data.maxScore) * 100;
        let matchStrength: 'perfect' | 'good' | 'partial' | 'weak';
        
        if (strengthPercentage >= 90) matchStrength = 'perfect';
        else if (strengthPercentage >= 70) matchStrength = 'good';
        else if (strengthPercentage >= 40) matchStrength = 'partial';
        else matchStrength = 'weak';

        criteria.push({
          criterion: criterion.charAt(0).toUpperCase() + criterion.slice(1),
          searchValue: this.getSearchValueForCriterion(criterion, searchParams),
          playerValue: this.getPlayerValueForCriterion(criterion, player),
          matchStrength,
          explanation: data.explanation
        });
      }
    });

    return criteria.sort((a, b) => {
      const strengthOrder = { perfect: 4, good: 3, partial: 2, weak: 1 };
      return strengthOrder[b.matchStrength] - strengthOrder[a.matchStrength];
    });
  }

  /**
   * Generate comprehensive summary
   */
  private generateSummary(
    player: Player,
    searchParams: AdvancedSearchParameters,
    detailedScore: DetailedMatchScore,
    context: ExplanationContext
  ): string {
    const percentage = Math.round(detailedScore.percentage);
    const topCriteria = Object.entries(detailedScore.breakdown)
      .filter(([_, data]) => data.score >= data.maxScore * 0.7)
      .map(([criterion]) => criterion)
      .slice(0, 3);

    let summary = '';

    if (percentage >= 80) {
      summary = `${player.name} is an excellent match (${percentage}%) for your search`;
    } else if (percentage >= 60) {
      summary = `${player.name} is a good match (${percentage}%) for your requirements`;
    } else if (percentage >= 40) {
      summary = `${player.name} partially matches (${percentage}%) your criteria`;
    } else {
      summary = `${player.name} has limited alignment (${percentage}%) with your search`;
    }

    if (topCriteria.length > 0) {
      summary += `, particularly in ${topCriteria.join(', ')}`;
    }

    return summary + '.';
  }

  /**
   * Identify potential concerns
   */
  private identifyPotentialConcerns(
    player: Player,
    searchParams: AdvancedSearchParameters,
    detailedScore: DetailedMatchScore
  ): string[] {
    const concerns: string[] = [];

    // Check for significant mismatches
    Object.entries(detailedScore.breakdown).forEach(([criterion, data]) => {
      if (data.score === 0 && data.maxScore >= 10) {
        concerns.push(`${criterion.charAt(0).toUpperCase() + criterion.slice(1)} doesn't match requirements`);
      }
    });

    // Age concerns
    if (player.age && searchParams.age) {
      if (searchParams.age.max && player.age > searchParams.age.max + 3) {
        concerns.push('Significantly older than preferred');
      }
      if (searchParams.age.min && player.age < searchParams.age.min - 2) {
        concerns.push('Much younger than preferred');
      }
    }

    // Market value concerns
    if (player.marketValueEuros && searchParams.marketValue?.max) {
      if (player.marketValueEuros > searchParams.marketValue.max * 1.5) {
        concerns.push('Significantly over budget');
      }
    }

    // Performance concerns
    if (player.appearancesThisSeason < 10) {
      concerns.push('Limited playing time this season');
    }

    return concerns;
  }

  /**
   * Generate additional context
   */
  private generateAdditionalContext(
    player: Player,
    searchParams: AdvancedSearchParameters,
    context: ExplanationContext
  ): string {
    const contextParts: string[] = [];

    // Performance context
    if (player.goalsThisSeason > 0 || player.assistsThisSeason > 0) {
      contextParts.push(`This season: ${player.goalsThisSeason} goals, ${player.assistsThisSeason} assists in ${player.appearancesThisSeason} games`);
    }

    // Contract context
    if (player.contractExpires) {
      const monthsLeft = Math.round((new Date(player.contractExpires).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30));
      if (monthsLeft <= 12) {
        contextParts.push(`Contract expires in ${monthsLeft} months - potential transfer opportunity`);
      }
    }

    // Experience context
    if (player.league) {
      contextParts.push(`Currently playing in ${player.league}`);
    }

    // Ranking context
    if (context.resultRank <= 5) {
      contextParts.push(`Top ${context.resultRank} result out of ${context.totalResults}`);
    }

    return contextParts.join('. ');
  }

  /**
   * Generate fallback explanation
   */
  private generateFallbackExplanation(player: Player, searchParams: AdvancedSearchParameters): MatchExplanation {
    return {
      summary: `${player.name} matches several of your search criteria`,
      matchedCriteria: [],
      strengthScore: 50,
      potentialConcerns: ['Unable to generate detailed analysis'],
      additionalContext: 'Basic match evaluation available'
    };
  }

  /**
   * Helper methods
   */
  private getCompatiblePositions(position: string): string[] {
    const positionCompatibility: Record<string, string[]> = {
      'ST': ['CF'],
      'CF': ['ST', 'CAM'],
      'LW': ['LM', 'LWB'],
      'RW': ['RM', 'RWB'],
      'CAM': ['CM', 'CF'],
      'CM': ['CDM', 'CAM'],
      'CDM': ['CM', 'CB'],
      'LB': ['LWB', 'LM'],
      'RB': ['RWB', 'RM'],
      'CB': ['CDM']
    };

    return positionCompatibility[position] || [];
  }

  private formatValue(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + 'K';
    }
    return value.toString();
  }

  private getSearchValueForCriterion(criterion: string, searchParams: AdvancedSearchParameters): string {
    switch (criterion) {
      case 'position':
        return searchParams.position?.join(', ') || '';
      case 'age':
        return `${searchParams.age?.min || '?'}-${searchParams.age?.max || '?'}`;
      case 'nationality':
        return searchParams.nationality?.join(', ') || '';
      case 'league':
        return searchParams.league?.join(', ') || '';
      case 'marketValue':
        return `€${this.formatValue(searchParams.marketValue?.min || 0)}-${this.formatValue(searchParams.marketValue?.max || 0)}`;
      default:
        return 'Various criteria';
    }
  }

  private getPlayerValueForCriterion(criterion: string, player: Player): string {
    switch (criterion) {
      case 'position':
        return player.position || 'Unknown';
      case 'age':
        return player.age?.toString() || 'Unknown';
      case 'nationality':
        return player.nationality || 'Unknown';
      case 'league':
        return player.league || 'Unknown';
      case 'marketValue':
        return `€${this.formatValue(player.marketValueEuros || 0)}`;
      case 'performance':
        return `${player.goalsThisSeason}G, ${player.assistsThisSeason}A`;
      default:
        return 'N/A';
    }
  }
} 