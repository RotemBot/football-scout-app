// Search Parameters Interface
export interface SearchParameters {
  position?: string[];
  age?: { min: number; max: number };
  nationality?: string[];
  league?: string[];
  marketValue?: { min: number; max: number };
  transferStatus?: 'available' | 'contract_ending' | 'any';
  keywords?: string[];
  originalQuery: string;
  parsedIntent: string;
  priorityFactors: string[];
}

// Player Result Interface
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
}

// Match Explanation Interface
export interface MatchExplanation {
  summary: string;
  matchedCriteria: MatchedCriterion[];
  strengthScore: number;
  potentialConcerns?: string[];
  additionalContext?: string;
}

// Matched Criterion Interface
export interface MatchedCriterion {
  criterion: string;
  searchValue: string;
  playerValue: string;
  matchStrength: 'perfect' | 'good' | 'partial' | 'weak';
  explanation: string;
}

// Source Data Interface
export interface SourceData {
  sourceName: string;
  reliability: number;
  data: Partial<PlayerResult>;
  lastUpdated: Date;
}

// Conflicting Field Interface
export interface ConflictingField {
  field: string;
  values: { source: string; value: any; reliability: number }[];
}

// Player Stats Interface
export interface PlayerStats {
  goals?: number;
  assists?: number;
  appearances?: number;
  minutes?: number;
  yellowCards?: number;
  redCards?: number;
  rating?: number;
  season?: string;
}

// Search Events Interface
export interface SearchEvents {
  'search:started': { searchId: string; searchParams: SearchParameters };
  'search:progress': { searchId: string; progress: number; currentSource: string };
  'search:result': { searchId: string; player: PlayerResult };
  'search:completed': { searchId: string; totalResults: number; summary: SearchSummary };
  'search:error': { searchId: string; error: string };
}

// Search Summary Interface
export interface SearchSummary {
  totalPlayersFound: number;
  averageMatchStrength: number;
  sourcesSearched: string[];
  timeElapsed: number;
  topMatchReasons: string[];
}

// API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

// Crawler Configuration Interface
export interface CrawlerConfig {
  name: string;
  baseUrl: string;
  reliability: number;
  timeout: number;
  maxRetries: number;
  rateLimitMs: number;
}

// Database Models
export interface User {
  id: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchHistory {
  id: string;
  userId: string;
  query: string;
  parameters: SearchParameters;
  results: PlayerResult[];
  createdAt: Date;
}

export interface CrawlerJob {
  id: string;
  searchId: string;
  source: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  parameters: SearchParameters;
  results?: PlayerResult[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
} 