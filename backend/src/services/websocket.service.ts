import { Server, Socket } from 'socket.io';
import { SearchParameterService } from './search-parameter.service';
import { AdvancedSearchParameters } from '../schemas/search-parameters.schema';
import { Pool } from 'pg';

// WebSocket event types for type safety
export interface SearchEvents {
  'search:started': {
    searchId: string;
    query: string;
    timestamp: Date;
  };
  'search:ai-parsing': {
    searchId: string;
    status: 'parsing' | 'complete' | 'fallback';
    confidence?: number;
    parsedIntent?: string;
    processingTime?: number;
  };
  'search:validation': {
    searchId: string;
    status: 'validating' | 'complete' | 'error';
    errors?: string[];
    processingTime?: number;
  };
  'search:database-query': {
    searchId: string;
    status: 'querying' | 'complete';
    resultCount?: number;
    processingTime?: number;
  };
  'search:match-explanation': {
    searchId: string;
    status: 'generating' | 'complete';
    playerCount: number;
    processingTime?: number;
  };
  'search:progress': {
    searchId: string;
    step: number;
    totalSteps: number;
    currentStep: string;
    progress: number; // 0-100
  };
  'search:results': {
    searchId: string;
    players: any[];
    metadata: any;
    metrics: any;
  };
  'search:completed': {
    searchId: string;
    totalResults: number;
    totalTime: number;
    summary: SearchSummary;
  };
  'search:error': {
    searchId: string;
    error: string;
    step: string;
    details?: any;
  };
}

interface SearchSummary {
  totalPlayersFound: number;
  averageMatchStrength: number;
  timeElapsed: number;
  aiParsingTime: number;
  databaseQueryTime: number;
  topMatchReasons: string[];
  searchEfficiency: {
    cacheHit: boolean;
    fallbackUsed: boolean;
    confidence: number;
  };
}

interface ActiveSearch {
  searchId: string;
  socketId: string;
  query: string;
  startTime: Date;
  currentStep: number;
  totalSteps: number;
}

export class WebSocketService {
  private io: Server;
  private searchService: SearchParameterService;
  private activeSearches: Map<string, ActiveSearch> = new Map();
  private socketToSearches: Map<string, Set<string>> = new Map();

  constructor(io: Server, dbPool: Pool) {
    this.io = io;
    this.searchService = new SearchParameterService(dbPool);
    this.setupEventHandlers();
  }

  /**
   * Setup WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      
      // Initialize client search tracking
      this.socketToSearches.set(socket.id, new Set());

      // Handle search requests
      socket.on('search:start', async (data: { query: string; params?: Partial<AdvancedSearchParameters> }) => {
        await this.handleSearchRequest(socket, data);
      });

      // Handle search cancellation
      socket.on('search:cancel', (data: { searchId: string }) => {
        this.handleSearchCancellation(socket, data.searchId);
      });

      // Handle client disconnect
      socket.on('disconnect', () => {
        this.handleClientDisconnect(socket.id);
      });

      // Send connection confirmation
      socket.emit('connection:confirmed', {
        socketId: socket.id,
        timestamp: new Date(),
        message: 'Connected to Football Scout WebSocket server'
      });
    });
  }

  /**
   * Handle search request with real-time updates
   */
  private async handleSearchRequest(
    socket: Socket, 
    data: { query: string; params?: Partial<AdvancedSearchParameters> }
  ): Promise<void> {
    const searchId = this.generateSearchId();
    const startTime = new Date();
    
    // Track active search
    const activeSearch: ActiveSearch = {
      searchId,
      socketId: socket.id,
      query: data.query,
      startTime,
      currentStep: 0,
      totalSteps: 6 // AI parsing, validation, sanitization, DB query, match explanation, completion
    };
    
    this.activeSearches.set(searchId, activeSearch);
    this.socketToSearches.get(socket.id)?.add(searchId);

    try {
      // Step 1: Search started
      this.emitToSocket(socket, 'search:started', {
        searchId,
        query: data.query,
        timestamp: startTime
      });

      this.updateProgress(socket, searchId, 1, 'Starting AI-powered search...');

      // Step 2: AI Parsing
      this.emitToSocket(socket, 'search:ai-parsing', {
        searchId,
        status: 'parsing'
      });

      this.updateProgress(socket, searchId, 2, 'Parsing query with AI...');

      const searchStartTime = Date.now();
      const result = await this.searchService.search(
        data.query,
        data.params || {},
        {
          searchId,
          sessionId: socket.id,
          userIp: this.getClientIP(socket)
        }
      );

      // Step 3: AI Parsing Complete
      this.emitToSocket(socket, 'search:ai-parsing', {
        searchId,
        status: result.metrics.fallbackUsed ? 'fallback' : 'complete',
        confidence: result.metrics.aiConfidence,
        parsedIntent: result.metadata.aiIntent,
        processingTime: result.metrics.aiParsingTime
      });

      this.updateProgress(socket, searchId, 3, 'AI parsing complete, validating parameters...');

      // Step 4: Validation complete (already done in searchService)
      this.emitToSocket(socket, 'search:validation', {
        searchId,
        status: 'complete',
        processingTime: result.metrics.validationTime
      });

      this.updateProgress(socket, searchId, 4, 'Searching database...');

      // Step 5: Database query complete
      this.emitToSocket(socket, 'search:database-query', {
        searchId,
        status: 'complete',
        resultCount: result.players.length,
        processingTime: result.metrics.databaseQueryTime
      });

      this.updateProgress(socket, searchId, 5, 'Generating match explanations...');

      // Step 6: Match explanations (already generated in searchService)
      this.emitToSocket(socket, 'search:match-explanation', {
        searchId,
        status: 'complete',
        playerCount: result.players.length,
        processingTime: result.metrics.processingTime - result.metrics.aiParsingTime - result.metrics.databaseQueryTime
      });

      this.updateProgress(socket, searchId, 6, 'Finalizing results...');

      // Step 7: Send results
      this.emitToSocket(socket, 'search:results', {
        searchId,
        players: result.players,
        metadata: result.metadata,
        metrics: result.metrics
      });

      // Step 8: Search completed
      const summary = this.generateSearchSummary(result, Date.now() - searchStartTime);
      
      this.emitToSocket(socket, 'search:completed', {
        searchId,
        totalResults: result.players.length,
        totalTime: result.metrics.processingTime,
        summary
      });

      console.log(`✅ Search completed: ${searchId} (${result.players.length} results in ${result.metrics.processingTime}ms)`);

    } catch (error) {
      console.error(`❌ Search failed: ${searchId}`, error);
      
      this.emitToSocket(socket, 'search:error', {
        searchId,
        error: error instanceof Error ? error.message : 'Unknown search error',
        step: this.getStepName(activeSearch.currentStep),
        details: error instanceof Error ? { 
          name: error.name, 
          stack: error.stack?.split('\n').slice(0, 3) 
        } : undefined
      });
    } finally {
      // Cleanup
      this.activeSearches.delete(searchId);
      this.socketToSearches.get(socket.id)?.delete(searchId);
    }
  }

  /**
   * Handle search cancellation
   */
  private handleSearchCancellation(socket: Socket, searchId: string): void {
    const search = this.activeSearches.get(searchId);
    
    if (search && search.socketId === socket.id) {
      console.log(`🚫 Search cancelled: ${searchId}`);
      
      this.emitToSocket(socket, 'search:error', {
        searchId,
        error: 'Search cancelled by user',
        step: this.getStepName(search.currentStep)
      });

      this.activeSearches.delete(searchId);
      this.socketToSearches.get(socket.id)?.delete(searchId);
    }
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(socketId: string): void {
    console.log(`🔌 Client disconnected: ${socketId}`);
    
    // Cancel all active searches for this client
    const searchIds = this.socketToSearches.get(socketId);
    if (searchIds) {
      searchIds.forEach(searchId => {
        this.activeSearches.delete(searchId);
      });
      this.socketToSearches.delete(socketId);
    }
  }

  /**
   * Update search progress
   */
  private updateProgress(socket: Socket, searchId: string, step: number, message: string): void {
    const search = this.activeSearches.get(searchId);
    if (search) {
      search.currentStep = step;
      
      this.emitToSocket(socket, 'search:progress', {
        searchId,
        step,
        totalSteps: search.totalSteps,
        currentStep: message,
        progress: Math.round((step / search.totalSteps) * 100)
      });
    }
  }

  /**
   * Emit event to specific socket with error handling
   */
  private emitToSocket<K extends keyof SearchEvents>(
    socket: Socket, 
    event: K, 
    data: SearchEvents[K]
  ): void {
    try {
      socket.emit(event, data);
    } catch (error) {
      console.error(`Failed to emit ${event} to ${socket.id}:`, error);
    }
  }

  /**
   * Broadcast to all connected clients
   */
  public broadcast<K extends keyof SearchEvents>(event: K, data: SearchEvents[K]): void {
    try {
      this.io.emit(event, data);
    } catch (error) {
      console.error(`Failed to broadcast ${event}:`, error);
    }
  }

  /**
   * Get active search statistics
   */
  public getActiveSearchStats(): {
    totalActiveSearches: number;
    connectedClients: number;
    searchesByStep: Record<string, number>;
  } {
    const searchesByStep: Record<string, number> = {};
    
    this.activeSearches.forEach(search => {
      const stepName = this.getStepName(search.currentStep);
      searchesByStep[stepName] = (searchesByStep[stepName] || 0) + 1;
    });

    return {
      totalActiveSearches: this.activeSearches.size,
      connectedClients: this.io.sockets.sockets.size,
      searchesByStep
    };
  }

  /**
   * Helper methods
   */
  private generateSearchId(): string {
    return `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(socket: Socket): string {
    return socket.handshake.address || 'unknown';
  }

  private getStepName(step: number): string {
    const stepNames = [
      'initialization',
      'ai-parsing',
      'validation',
      'database-query',
      'match-explanation',
      'completion'
    ];
    return stepNames[step] || 'unknown';
  }

  private generateSearchSummary(result: any, totalTime: number): SearchSummary {
    // Calculate top match reasons from player explanations
    const topMatchReasons: string[] = [];
    
    if (result.players && result.players.length > 0) {
      const reasonCounts: Record<string, number> = {};
      
      result.players.forEach((player: any) => {
        if (player.matchExplanation?.matchedCriteria) {
          player.matchExplanation.matchedCriteria.forEach((criterion: any) => {
            if (criterion.matchStrength === 'perfect' || criterion.matchStrength === 'good') {
              const reason = criterion.criterion;
              reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
            }
          });
        }
      });

      // Get top 3 reasons
      topMatchReasons.push(
        ...Object.entries(reasonCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([reason]) => reason)
      );
    }

    // Calculate average match strength
    const averageMatchStrength = result.players.length > 0
      ? result.players.reduce((sum: number, player: any) => 
          sum + (player.matchExplanation?.strengthScore || 0), 0) / result.players.length
      : 0;

    return {
      totalPlayersFound: result.players.length,
      averageMatchStrength: Math.round(averageMatchStrength),
      timeElapsed: totalTime,
      aiParsingTime: result.metrics.aiParsingTime,
      databaseQueryTime: result.metrics.databaseQueryTime,
      topMatchReasons,
      searchEfficiency: {
        cacheHit: result.metrics.cacheHit,
        fallbackUsed: result.metrics.fallbackUsed,
        confidence: result.metrics.aiConfidence
      }
    };
  }
} 