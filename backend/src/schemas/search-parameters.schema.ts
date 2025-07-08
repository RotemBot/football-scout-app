import { z } from 'zod';

// Enums and constants for valid values
export const FOOTBALL_POSITIONS = [
  'GK',                    // Goalkeeper
  'CB', 'LB', 'RB',       // Defenders
  'LWB', 'RWB',           // Wing-backs
  'CDM', 'CM', 'CAM',     // Midfielders
  'LM', 'RM',             // Side midfielders
  'LW', 'RW',             // Wingers
  'ST', 'CF',             // Forwards
] as const;

export const MAJOR_LEAGUES = [
  'Premier League',
  'La Liga',
  'Bundesliga',
  'Serie A',
  'Ligue 1',
  'Eredivisie',
  'Primeira Liga',
  'Championship',
  'Champions League',
  'Europa League',
  'Conference League',
  'MLS',
  'Liga MX',
  'Brazilian Serie A',
  'Argentine Primera',
] as const;

export const PREFERRED_FOOT = ['Left', 'Right', 'Both'] as const;
export const TRANSFER_STATUS = ['available', 'contract_ending', 'any'] as const;
export const SORT_FIELDS = ['name', 'age', 'marketValue', 'goals', 'assists', 'relevance'] as const;
export const SORT_DIRECTIONS = ['asc', 'desc'] as const;

// Base search parameter schema
const BaseSearchSchema = z.object({
  // Text search
  query: z.string().min(1).max(500).optional(),
  name: z.string().min(1).max(100).optional(),
  
  // Position filtering
  position: z.array(z.enum(FOOTBALL_POSITIONS)).min(1).max(5).optional(),
  
  // Age filtering
  age: z.object({
    min: z.number().int().min(16).max(45).optional(),
    max: z.number().int().min(16).max(45).optional(),
  }).optional().refine(
    (data) => !data || !data.min || !data.max || data.min <= data.max,
    { message: "Minimum age cannot be greater than maximum age" }
  ),
  
  // Nationality filtering
  nationality: z.array(z.string().min(2).max(50)).min(1).max(10).optional(),
  
  // Club filtering
  currentClub: z.array(z.string().min(1).max(100)).min(1).max(20).optional(),
  
  // League filtering
  league: z.array(z.enum(MAJOR_LEAGUES)).min(1).max(10).optional(),
  
  // Market value filtering (in euros)
  marketValue: z.object({
    min: z.number().int().min(0).max(500000000).optional(),
    max: z.number().int().min(0).max(500000000).optional(),
  }).optional().refine(
    (data) => !data || !data.min || !data.max || data.min <= data.max,
    { message: "Minimum market value cannot be greater than maximum market value" }
  ),
  
  // Height filtering (in cm)
  height: z.object({
    min: z.number().int().min(150).max(220).optional(),
    max: z.number().int().min(150).max(220).optional(),
  }).optional().refine(
    (data) => !data || !data.min || !data.max || data.min <= data.max,
    { message: "Minimum height cannot be greater than maximum height" }
  ),
  
  // Preferred foot
  foot: z.enum(PREFERRED_FOOT).optional(),
  
  // Performance stats filtering
  goals: z.object({
    min: z.number().int().min(0).max(200).optional(),
    max: z.number().int().min(0).max(200).optional(),
  }).optional(),
  
  assists: z.object({
    min: z.number().int().min(0).max(200).optional(),
    max: z.number().int().min(0).max(200).optional(),
  }).optional(),
  
  appearances: z.object({
    min: z.number().int().min(0).max(100).optional(),
    max: z.number().int().min(0).max(100).optional(),
  }).optional(),
  
  // Contract status
  transferStatus: z.enum(TRANSFER_STATUS).optional(),
  contractExpiring: z.boolean().optional(), // Contract expires within 12 months
  
  // Additional keywords
  keywords: z.array(z.string().min(1).max(50)).min(1).max(20).optional(),
});

// Advanced search parameters
const AdvancedSearchSchema = BaseSearchSchema.extend({
  // Sorting and pagination
  sortBy: z.enum(SORT_FIELDS).default('relevance'),
  sortDirection: z.enum(SORT_DIRECTIONS).default('desc'),
  page: z.number().int().min(1).max(1000).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  
  // Search behavior
  exactMatch: z.boolean().default(false),
  includeRetired: z.boolean().default(false),
  
  // Metadata
  originalQuery: z.string().max(1000).optional(),
  parsedIntent: z.string().max(500).optional(),
  priorityFactors: z.array(z.string().max(50)).max(10).default([]),
  confidence: z.number().min(0).max(1).optional(),
  
  // Session tracking
  searchId: z.string().uuid().optional(),
  sessionId: z.string().max(100).optional(),
  userIp: z.string().ip().optional(),
});

// Database query parameters (internal use)
const DatabaseQuerySchema = AdvancedSearchSchema.extend({
  // Database-specific fields
  includeInactive: z.boolean().default(false),
  dataQualityThreshold: z.number().min(0).max(100).default(50),
  maxResults: z.number().int().min(1).max(10000).default(1000),
  
  // Query optimization
  useIndex: z.boolean().default(true),
  forceFullScan: z.boolean().default(false),
  
  // Result formatting
  includeStats: z.boolean().default(true),
  includeMetadata: z.boolean().default(false),
  includeMatchExplanation: z.boolean().default(true),
});

// Export schema types
export type BaseSearchParameters = z.infer<typeof BaseSearchSchema>;
export type AdvancedSearchParameters = z.infer<typeof AdvancedSearchSchema>;
export type DatabaseQueryParameters = z.infer<typeof DatabaseQuerySchema>;

// Export schemas
export { BaseSearchSchema, AdvancedSearchSchema, DatabaseQuerySchema };

// Validation functions
export class SearchParameterValidator {
  /**
   * Validate base search parameters
   */
  static validateBase(params: unknown): BaseSearchParameters {
    return BaseSearchSchema.parse(params);
  }

  /**
   * Validate advanced search parameters
   */
  static validateAdvanced(params: unknown): AdvancedSearchParameters {
    return AdvancedSearchSchema.parse(params);
  }

  /**
   * Validate database query parameters
   */
  static validateDatabase(params: unknown): DatabaseQueryParameters {
    return DatabaseQuerySchema.parse(params);
  }

  /**
   * Safe validation that returns errors instead of throwing
   */
  static safeValidateAdvanced(params: unknown): {
    success: boolean;
    data?: AdvancedSearchParameters;
    errors?: z.ZodError;
  } {
    const result = AdvancedSearchSchema.safeParse(params);
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, errors: result.error };
    }
  }
}

// Parameter sanitization utilities
export class SearchParameterSanitizer {
  /**
   * Sanitize and normalize search parameters
   */
  static sanitize(params: Partial<AdvancedSearchParameters>): Partial<AdvancedSearchParameters> {
    const sanitized = { ...params };

    // Normalize text fields
    if (sanitized.query) {
      sanitized.query = this.normalizeText(sanitized.query);
    }
    
    if (sanitized.name) {
      sanitized.name = this.normalizeText(sanitized.name);
    }

    // Normalize arrays
    if (sanitized.nationality) {
      sanitized.nationality = sanitized.nationality.map(n => this.normalizeCountryName(n));
    }

    if (sanitized.currentClub) {
      sanitized.currentClub = sanitized.currentClub.map(c => this.normalizeClubName(c));
    }

    if (sanitized.keywords) {
      sanitized.keywords = sanitized.keywords
        .map(k => this.normalizeText(k))
        .filter(k => k.length > 0);
    }

    // Normalize positions
    if (sanitized.position) {
      sanitized.position = sanitized.position.map(p => p.toUpperCase()) as any;
    }

    return sanitized;
  }

  /**
   * Normalize text input
   */
  private static normalizeText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-']/g, '');
  }

  /**
   * Normalize country names
   */
  private static normalizeCountryName(country: string): string {
    const normalized = this.normalizeText(country);
    
    // Common mappings
    const countryMappings: Record<string, string> = {
      'usa': 'United States',
      'uk': 'England',
      'brasil': 'Brazil',
      'deutschland': 'Germany',
      'espana': 'Spain',
      'france': 'France',
      'italia': 'Italy',
    };

    return countryMappings[normalized.toLowerCase()] || normalized;
  }

  /**
   * Normalize club names
   */
  private static normalizeClubName(club: string): string {
    const normalized = this.normalizeText(club);
    
    // Common abbreviations and alternate names
    const clubMappings: Record<string, string> = {
      'man utd': 'Manchester United',
      'man city': 'Manchester City',
      'fc barcelona': 'Barcelona',
      'barca': 'Barcelona',
      'real madrid': 'Real Madrid',
      'bayern munich': 'Bayern München',
      'psg': 'Paris Saint-Germain',
    };

    return clubMappings[normalized.toLowerCase()] || normalized;
  }
}

// Query builder helpers
export class SearchQueryBuilder {
  /**
   * Convert search parameters to SQL WHERE conditions
   */
  static buildWhereClause(params: DatabaseQueryParameters): {
    whereClause: string;
    values: any[];
    paramCount: number;
  } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    // Name search
    if (params.name) {
      paramCount++;
      if (params.exactMatch) {
        conditions.push(`name = $${paramCount}`);
        values.push(params.name);
      } else {
        conditions.push(`name ILIKE $${paramCount}`);
        values.push(`%${params.name}%`);
      }
    }

    // Position filter
    if (params.position && params.position.length > 0) {
      paramCount++;
      conditions.push(`position = ANY($${paramCount})`);
      values.push(params.position);
    }

    // Age range
    if (params.age) {
      if (params.age.min !== undefined) {
        paramCount++;
        conditions.push(`age >= $${paramCount}`);
        values.push(params.age.min);
      }
      if (params.age.max !== undefined) {
        paramCount++;
        conditions.push(`age <= $${paramCount}`);
        values.push(params.age.max);
      }
    }

    // Nationality filter
    if (params.nationality && params.nationality.length > 0) {
      paramCount++;
      conditions.push(`nationality = ANY($${paramCount})`);
      values.push(params.nationality);
    }

    // Club filter
    if (params.currentClub && params.currentClub.length > 0) {
      paramCount++;
      conditions.push(`current_club = ANY($${paramCount})`);
      values.push(params.currentClub);
    }

    // League filter
    if (params.league && params.league.length > 0) {
      paramCount++;
      conditions.push(`league = ANY($${paramCount})`);
      values.push(params.league);
    }

    // Market value range
    if (params.marketValue) {
      if (params.marketValue.min !== undefined) {
        paramCount++;
        conditions.push(`market_value_euros >= $${paramCount}`);
        values.push(params.marketValue.min);
      }
      if (params.marketValue.max !== undefined) {
        paramCount++;
        conditions.push(`market_value_euros <= $${paramCount}`);
        values.push(params.marketValue.max);
      }
    }

    // Height range
    if (params.height) {
      if (params.height.min !== undefined) {
        paramCount++;
        conditions.push(`height_cm >= $${paramCount}`);
        values.push(params.height.min);
      }
      if (params.height.max !== undefined) {
        paramCount++;
        conditions.push(`height_cm <= $${paramCount}`);
        values.push(params.height.max);
      }
    }

    // Performance stats
    if (params.goals) {
      if (params.goals.min !== undefined) {
        paramCount++;
        conditions.push(`goals_this_season >= $${paramCount}`);
        values.push(params.goals.min);
      }
      if (params.goals.max !== undefined) {
        paramCount++;
        conditions.push(`goals_this_season <= $${paramCount}`);
        values.push(params.goals.max);
      }
    }

    if (params.assists) {
      if (params.assists.min !== undefined) {
        paramCount++;
        conditions.push(`assists_this_season >= $${paramCount}`);
        values.push(params.assists.min);
      }
      if (params.assists.max !== undefined) {
        paramCount++;
        conditions.push(`assists_this_season <= $${paramCount}`);
        values.push(params.assists.max);
      }
    }

    // Contract expiring soon
    if (params.contractExpiring) {
      paramCount++;
      conditions.push(`contract_expires <= $${paramCount}`);
      values.push(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)); // 1 year from now
    }

    return {
      whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values,
      paramCount
    };
  }

  /**
   * Build ORDER BY clause
   */
  static buildOrderByClause(params: DatabaseQueryParameters): string {
    const sortField = this.mapSortField(params.sortBy);
    const direction = params.sortDirection.toUpperCase();
    
    return `ORDER BY ${sortField} ${direction}`;
  }

  /**
   * Map API sort fields to database columns
   */
  private static mapSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      'name': 'name',
      'age': 'age',
      'marketValue': 'market_value_euros',
      'goals': 'goals_this_season',
      'assists': 'assists_this_season',
      'relevance': 'created_at DESC, market_value_euros', // Default relevance sorting
    };

    return fieldMap[sortBy] || 'created_at';
  }

  /**
   * Build complete SELECT query
   */
  static buildSelectQuery(params: DatabaseQueryParameters): {
    query: string;
    values: any[];
  } {
    const { whereClause, values, paramCount } = this.buildWhereClause(params);
    const orderByClause = this.buildOrderByClause(params);
    
    // Add pagination
    const offset = (params.page - 1) * params.limit;
    values.push(params.limit, offset);

    const query = `
      SELECT 
        id, name, position, age, nationality, current_club, 
        market_value_euros, league, height_cm, foot,
        goals_this_season, assists_this_season, appearances_this_season,
        contract_expires, created_at, updated_at
      FROM players 
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    return { query: query.trim(), values };
  }
} 