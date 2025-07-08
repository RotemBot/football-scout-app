// Base model interface
export interface BaseModel {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Source model - track different football websites
export interface Source extends BaseModel {
  name: string;
  url: string;
  reliabilityScore: number; // 1-100
  timeoutSeconds: number;
  isActive: boolean;
}

// Player model - store player information
export interface Player extends BaseModel {
  name: string;
  position?: string;
  age?: number;
  nationality?: string;
  currentClub?: string;
  marketValueEuros?: number;
  league?: string;
  heightCm?: number;
  foot?: string;
  goalsThisSeason: number;
  assistsThisSeason: number;
  appearancesThisSeason: number;
  contractExpires?: Date;
}

// Player sources - track which sources provided what player data
export interface PlayerSource {
  id: string;
  playerId: string;
  sourceId: string;
  sourceUrl?: string;
  dataQualityScore?: number; // 1-100
  lastUpdated: Date;
}

// Search query model - store user search requests
export interface SearchQuery {
  id: string;
  queryText: string;
  parsedCriteria?: Record<string, any>; // JSONB data
  userIp?: string;
  createdAt: Date;
}

// Search result model - track which players were returned for which searches
export interface SearchResult {
  id: string;
  searchQueryId: string;
  playerId: string;
  matchScore: number; // 0-100
  matchExplanation?: string;
  resultRank: number;
  createdAt: Date;
}

// Crawl log model - track crawling activity and errors
export interface CrawlLog {
  id: string;
  sourceId: string;
  searchQueryId?: string;
  status: 'success' | 'partial' | 'failed' | 'timeout';
  playersFound: number;
  errorMessage?: string;
  responseTimeMs?: number;
  createdAt: Date;
}

// Search parameters for AI parsing
export interface SearchParameters {
  position?: string[];
  age?: { min?: number; max?: number };
  nationality?: string[];
  league?: string[];
  marketValue?: { min?: number; max?: number };
  height?: { min?: number; max?: number };
  transferStatus?: 'available' | 'contract_ending' | 'any';
  keywords?: string[];
  originalQuery: string;
  parsedIntent: string;
  priorityFactors: string[];
  // Database integration fields
  searchId?: string;
  sessionId?: string;
  confidence?: number;
  fallbackQuery?: string;
}

// Player result for search responses
export interface PlayerResult {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  currentClub: string;
  marketValue?: number;
  contractExpiry?: Date;
  sources: SourceData[];
  primarySource: string;
  profileUrls: { [sourceName: string]: string };
  imageUrl?: string;
  stats?: PlayerStats;
  confidence: number;
  verificationStatus: 'verified' | 'partial' | 'unverified';
  conflictingData?: ConflictingField[];
  matchExplanation: MatchExplanation;
  // Database integration fields
  playerId?: string;
  searchResultId?: string;
  createdAt: Date;
  updatedAt: Date;
  // Enhanced functionality
  bookmarked?: boolean;
  notes?: string;
  ratingHistory?: RatingHistoryItem[];
}

// Supporting interfaces
export interface SourceData {
  sourceName: string;
  reliability: number;
  data: Partial<PlayerResult>;
  lastUpdated: Date;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  appearances: number;
  minutesPlayed?: number;
  yellowCards?: number;
  redCards?: number;
}

export interface ConflictingField {
  field: string;
  values: { source: string; value: any; reliability: number }[];
}

export interface MatchExplanation {
  summary: string;
  matchedCriteria: MatchedCriterion[];
  strengthScore: number;
  potentialConcerns?: string[];
  additionalContext?: string;
}

export interface MatchedCriterion {
  criterion: string;
  searchValue: string;
  playerValue: string;
  matchStrength: 'perfect' | 'good' | 'partial' | 'weak';
  explanation: string;
}

export interface RatingHistoryItem {
  date: Date;
  rating: number;
  source: string;
}

// Database query result types
export interface QueryResult<T = any> {
  rows: T[];
  rowCount: number;
  command: string;
  oid: number;
  fields: Array<{
    name: string;
    tableID: number;
    columnID: number;
    dataTypeID: number;
    dataTypeSize: number;
    dataTypeModifier: number;
    format: string;
  }>;
} 