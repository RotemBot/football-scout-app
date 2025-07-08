# Football Scout App - Project Plan

## 🚀 Current Status (Phase 1 - Week 1)

**🎯 Progress: 100% Complete ✅**
- ✅ Backend infrastructure fully operational
- ✅ Database and Redis configured  
- ✅ API endpoints working with mock data
- ✅ Frontend setup complete and running

**🔧 Currently Working:**
- Backend server running on `http://localhost:3000`
- Frontend server running on `http://localhost:5173`
- PostgreSQL database with complete schema
- Redis cache and queue system ready
- WebSocket server for real-time updates
- Vue.js app with Tailwind CSS and full UI

**📋 Next Steps (Phase 2):**
- Integrate OpenAI API for text parsing
- Implement search parameter extraction  
- Create match explanation algorithms
- Add search result scoring system

---

## Project Overview

A web application designed to assist football agents in finding potential player matches during transfer windows. The app uses AI-powered crawling to search multiple football websites and return relevant player recommendations based on freetext descriptions.

## Core Requirements

### Primary Features
- **AI-Powered Search**: Process freetext descriptions to extract search parameters
- **Multi-Source Crawling**: Search across specified football websites with cross-verification
- **Source Reliability Ranking**: Prioritize information based on source reliability order
- **Dynamic Source Discovery**: Expand search to additional valid sources discovered during crawling
- **Cross-Verification**: Compare and validate player data across multiple sources
- **Match Explanations**: Provide detailed reasoning for why each player matches the search criteria
- **Real-time Results**: Return results progressively as crawling continues
- **Targeted Results**: Return up to 10 potential players per search
- **User-Friendly Interface**: Simple Vue.js frontend for easy interaction

### Target Websites (by Reliability Order)
1. **https://www.transfermarkt.co.uk/** - Primary source (highest reliability)
2. **https://int.soccerway.com/** - Secondary source
3. **https://www.zerozero.pt/** - Tertiary source
4. **https://www.sofascore.com/** - Quaternary source
5. **Dynamic sources** - Additional valid sources discovered during crawling

## Technology Stack

### Frontend
- **Framework**: Vue.js 3 (Composition API)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Pinia
- **HTTP Client**: Axios
- **Real-time Updates**: WebSockets/Server-Sent Events

### Backend
- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Web Scraping**: Puppeteer + Cheerio
- **AI/NLP**: OpenAI GPT API (for parsing freetext)
- **Database**: PostgreSQL (for caching and storing results)
- **Queue System**: Bull (Redis-based) for managing crawling jobs
- **Real-time Communication**: Socket.io

### Infrastructure
- **Database**: PostgreSQL
- **Cache/Queue**: Redis
- **Environment Management**: Local setup or Docker (optional)
- **Process Management**: PM2 (for production)

## Architecture Design

### System Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vue.js App    │◄──►│  Express API    │◄──►│   Database      │
│   (Frontend)    │    │   (Backend)     │    │  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │                         │
                              ▼                         ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  Crawling Queue │    │     Redis       │
                       │    (Bull)       │    │   (Cache)       │
                       └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   AI Parser     │    │ Cross-Verification│
                       │   (OpenAI)      │    │    Engine       │
                       └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │ Dynamic Source  │
                                              │   Discovery     │
                                              └─────────────────┘
```

### Data Flow
1. User enters freetext search in Vue.js frontend
2. Frontend sends request to Express API
3. API uses OpenAI to parse freetext into structured search parameters
4. Crawling jobs are queued for each target website (in reliability order)
5. Puppeteer crawlers extract player data from primary sources
6. **Cross-verification engine** compares player data across sources
7. **Dynamic source discovery** identifies additional relevant sources
8. **Data consolidation** creates unified player profiles with confidence scores
9. Results are progressively sent to frontend via WebSockets (as verification completes)
10. Verified data is cached in Redis and stored in PostgreSQL

## Implementation Phases

### Phase 1: Core Infrastructure (Week 1) - ✅ COMPLETED
**Backend Setup:**
- [x] Initialize TypeScript Express server ✅ **COMPLETED**
- [x] Set up PostgreSQL database schema ✅ **COMPLETED** 
- [x] Configure Redis for caching and queuing ✅ **COMPLETED**
- [x] Implement basic API endpoints ✅ **COMPLETED**
  - `/health` - Server health check
  - `/api/sources` - Returns football data sources with reliability scores
  - `/api/search` - Accepts search queries, returns mock results via WebSocket
- [x] Set up local development environment ✅ **COMPLETED** (chose local over Docker)

**Frontend Setup:**
- [x] Frontend package.json exists ✅ **COMPLETED**
- [x] Initialize Vue.js project with Vite ✅ **COMPLETED**
- [x] Set up Tailwind CSS ✅ **COMPLETED**
- [x] Create basic UI components ✅ **COMPLETED**
- [x] Implement WebSocket connection ✅ **COMPLETED**

**Environment Setup:**
- [x] Choose setup method ✅ **COMPLETED** (local development)
- [x] Configure database connections ✅ **COMPLETED**
- [x] Set up environment variables ✅ **COMPLETED**
- [x] Create development scripts ✅ **COMPLETED**

**📝 Implementation Notes:**
- Used **Yarn instead of npm** due to installation issues
- Disabled **Yarn PnP** for better TypeScript compatibility  
- PostgreSQL database schema includes 6 tables: sources, players, player_sources, search_queries, search_results, crawl_logs
- Redis successfully configured for caching and job queuing
- Express server running on port 3000 with WebSocket support
- Vue.js app running on port 5173 with Vite dev server
- API endpoints tested and working with mock data
- Full-featured UI with search functionality, real-time WebSocket updates, and responsive design
- Tailwind CSS integrated for modern styling

### Phase 2: AI Integration (Week 2)
**Natural Language Processing:**
- [ ] Integrate OpenAI API for text parsing
- [ ] Create prompt engineering for football-specific queries
- [ ] Implement parameter extraction (position, age, nationality, etc.)
- [ ] Add validation and error handling

**Search Logic:**
- [ ] Define search parameter schema
- [ ] Create mapping between parsed parameters and website queries
- [ ] Implement search result scoring system

**Match Explanation System:**
- [ ] Create match evaluation algorithms
- [ ] Implement criterion-by-criterion matching
- [ ] Generate human-readable explanations
- [ ] Calculate match strength scores
- [ ] Identify potential concerns and additional context

### Phase 3: Web Crawling Engine (Week 3)
**Crawler Infrastructure:**
- [ ] Set up Puppeteer with stealth plugins
- [ ] Implement rate limiting and anti-detection measures
- [ ] Create base crawler class with common functionality
- [ ] Set up job queue system with Bull
- [ ] Implement cross-verification engine
- [ ] Create dynamic source discovery system

**Website-Specific Crawlers:**
- [ ] Transfermarkt.co.uk crawler (primary source)
- [ ] Soccerway.com crawler (secondary source)
- [ ] Zerozero.pt crawler (tertiary source)
- [ ] Sofascore.com crawler (quaternary source)
- [ ] Generic crawler for dynamically discovered sources

**Cross-Verification System:**
- [ ] Data comparison algorithms
- [ ] Confidence scoring based on source reliability
- [ ] Conflict resolution mechanisms
- [ ] Data consolidation engine

### Phase 4: Data Processing & Storage (Week 4)
**Data Standardization:**
- [ ] Create unified player data schema
- [ ] Implement data cleaning and normalization
- [ ] Add duplicate detection and merging
- [ ] Create player scoring algorithm

**Storage & Caching:**
- [ ] Implement database models and repositories
- [ ] Set up Redis caching strategy
- [ ] Create data expiration policies
- [ ] Add backup and recovery mechanisms

### Phase 5: Frontend Development (Week 5)
**User Interface:**
- [ ] Search input component with suggestions
- [ ] Real-time results display
- [ ] Player profile cards with match explanations
- [ ] Match criteria visualization (badges, scores)
- [ ] Expandable explanation details
- [ ] Source verification indicators
- [ ] Search history and favorites
- [ ] Responsive design for mobile/desktop

**User Experience:**
- [ ] Loading states and progress indicators
- [ ] Error handling and user feedback
- [ ] Advanced filtering options
- [ ] Export functionality (PDF/CSV)
- [ ] Interactive match explanation tooltips
- [ ] Sort by match strength/confidence

### Phase 6: Testing & Optimization (Week 6)
**Testing:**
- [ ] Unit tests for backend services
- [ ] Integration tests for crawlers
- [ ] End-to-end tests for user flows
- [ ] Performance testing and optimization

**Deployment:**
- [ ] Production Docker configuration
- [ ] CI/CD pipeline setup
- [ ] Monitoring and logging
- [ ] Security hardening

## Key Components

### 1. AI Query Parser
```typescript
interface SearchParameters {
  position?: string[];
  age?: { min: number; max: number };
  nationality?: string[];
  league?: string[];
  marketValue?: { min: number; max: number };
  transferStatus?: 'available' | 'contract_ending' | 'any';
  keywords?: string[];
  originalQuery: string; // Store original text for explanation generation
  parsedIntent: string; // AI's understanding of what user wants
  priorityFactors: string[]; // Most important criteria from the query
}

class AIQueryParser {
  async parseQuery(freeText: string): Promise<SearchParameters> {
    const prompt = `
    Parse this football scout query and extract structured search parameters.
    Also explain what the user is looking for and identify the most important criteria.
    
    Query: "${freeText}"
    
    Return:
    1. Structured search parameters
    2. A clear explanation of what the user wants
    3. The most important factors to prioritize in matching
    `;
    
    // OpenAI API call with structured output
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      // ... structured output configuration
    });
    
    return this.parseResponse(response, freeText);
  }

  generateMatchExplanation(
    player: PlayerResult, 
    searchParams: SearchParameters
  ): MatchExplanation {
    const matchedCriteria = this.evaluateMatches(player, searchParams);
    const strengthScore = this.calculateMatchStrength(matchedCriteria);
    const summary = this.generateSummary(player, searchParams, matchedCriteria);
    
    return {
      summary,
      matchedCriteria,
      strengthScore,
      potentialConcerns: this.identifyPotentialConcerns(player, searchParams),
      additionalContext: this.generateAdditionalContext(player, searchParams)
    };
  }
}
```

### 2. Crawler Base Class
```typescript
abstract class BaseCrawler {
  abstract siteName: string;
  abstract search(params: SearchParameters): Promise<PlayerResult[]>;
  protected abstract parsePlayerData(element: any): PlayerResult;
  protected rateLimiter: RateLimiter;
  protected browser: Browser;
}
```

### 3. Player Data Schema
```typescript
interface PlayerResult {
  id: string;
  name: string;
  position: string;
  age: number;
  nationality: string;
  currentClub: string;
  marketValue?: number;
  contractExpiry?: Date;
  sources: SourceData[]; // Multiple sources with verification
  primarySource: string; // Most reliable source
  profileUrls: { [sourceName: string]: string };
  imageUrl?: string;
  stats?: PlayerStats;
  confidence: number; // Overall confidence score
  verificationStatus: 'verified' | 'partial' | 'unverified';
  conflictingData?: ConflictingField[];
  matchExplanation: MatchExplanation; // Why this player matches the search
}

interface MatchExplanation {
  summary: string; // Brief explanation (1-2 sentences)
  matchedCriteria: MatchedCriterion[]; // Specific criteria that matched
  strengthScore: number; // How well it matches (0-100)
  potentialConcerns?: string[]; // Any potential issues/mismatches
  additionalContext?: string; // Extra context about the match
}

interface MatchedCriterion {
  criterion: string; // e.g., "Position", "Age Range", "Nationality"
  searchValue: string; // What was searched for
  playerValue: string; // What the player has
  matchStrength: 'perfect' | 'good' | 'partial' | 'weak';
  explanation: string; // Why this is a match
}

interface SourceData {
  sourceName: string;
  reliability: number; // 1-4 based on source order
  data: Partial<PlayerResult>;
  lastUpdated: Date;
}

interface ConflictingField {
  field: string;
  values: { source: string; value: any; reliability: number }[];
}
```

### 4. Cross-Verification Engine
```typescript
class CrossVerificationEngine {
  private sourceReliability = {
    'transfermarkt': 1,
    'soccerway': 2,
    'zerozero': 3,
    'sofascore': 4
  };

  async verifyPlayerData(playerData: SourceData[]): Promise<PlayerResult> {
    const consolidated = this.consolidateData(playerData);
    const conflicts = this.detectConflicts(playerData);
    const confidence = this.calculateConfidence(playerData, conflicts);
    
    return {
      ...consolidated,
      confidence,
      verificationStatus: this.getVerificationStatus(conflicts, confidence),
      conflictingData: conflicts
    };
  }

  private consolidateData(sources: SourceData[]): Partial<PlayerResult> {
    // Prioritize data from most reliable sources
    // Handle conflicts using weighted voting
  }

  private detectConflicts(sources: SourceData[]): ConflictingField[] {
    // Identify fields with different values across sources
  }

  private calculateConfidence(sources: SourceData[], conflicts: ConflictingField[]): number {
    // Calculate confidence based on source reliability and conflict resolution
  }
}
```

### 5. Dynamic Source Discovery
```typescript
class DynamicSourceDiscovery {
  private knownFootballSites = [
    'espn.com', 'goal.com', 'skysports.com', 'bbc.com/sport',
    'marca.com', 'as.com', 'gazzetta.it', 'kicker.de'
  ];

  async discoverAdditionalSources(playerName: string, currentClub: string): Promise<string[]> {
    const searchQueries = this.generateSearchQueries(playerName, currentClub);
    const discoveredUrls = await this.searchForSources(searchQueries);
    return this.filterValidSources(discoveredUrls);
  }

  private isValidFootballSource(url: string): boolean {
    return this.knownFootballSites.some(site => url.includes(site));
  }
}
```

### 6. Real-time Communication
```typescript
// WebSocket events
interface SearchEvents {
  'search:started': { searchId: string; searchParams: SearchParameters };
  'search:progress': { searchId: string; progress: number; currentSource: string };
  'search:result': { searchId: string; player: PlayerResult }; // Includes matchExplanation
  'search:completed': { searchId: string; totalResults: number; summary: SearchSummary };
  'search:error': { searchId: string; error: string };
}

interface SearchSummary {
  totalPlayersFound: number;
  averageMatchStrength: number;
  sourcesSearched: string[];
  timeElapsed: number;
  topMatchReasons: string[]; // Most common reasons for matches
}
```

## Environment Setup Options

### Option 1: Local Setup (Simpler)
**Pros:**
- Faster development iteration
- No Docker overhead
- Direct access to databases
- Simpler debugging

**Requirements:**
- Node.js 18+ installed locally
- PostgreSQL installed locally
- Redis installed locally
- Environment variables in `.env` file

**Setup Commands:**
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Install Redis (macOS)
brew install redis
brew services start redis

# Install dependencies
npm install
```

### Option 2: Docker Setup (Isolated)
**Pros:**
- Consistent environment across machines
- Easy database setup
- Isolated dependencies
- Production-like environment

**Requirements:**
- Docker and Docker Compose installed
- docker-compose.yml configuration

**Setup Commands:**
```bash
# Start all services
docker-compose up -d

# Install dependencies
docker-compose exec backend npm install
```

### Recommendation
**Start with Option 1 (Local Setup)** for simplicity. You can always migrate to Docker later if needed for deployment or team collaboration.

## Example Match Explanations

### Sample Query: "Looking for a young striker under 25, preferably from South America, who can play in Serie A"

**Player Result: João Silva (22, Brazilian striker)**
```json
{
  "matchExplanation": {
    "summary": "João Silva is an excellent match as a 22-year-old Brazilian striker currently playing in Serie B, making him a strong candidate for Serie A promotion.",
    "matchedCriteria": [
      {
        "criterion": "Position",
        "searchValue": "striker",
        "playerValue": "Centre-Forward",
        "matchStrength": "perfect",
        "explanation": "Primary position matches exactly - natural striker"
      },
      {
        "criterion": "Age Range",
        "searchValue": "under 25",
        "playerValue": "22 years old",
        "matchStrength": "perfect",
        "explanation": "22 years old - prime age for development"
      },
      {
        "criterion": "Nationality",
        "searchValue": "South America",
        "playerValue": "Brazilian",
        "matchStrength": "perfect",
        "explanation": "Brazilian - fits South American preference perfectly"
      },
      {
        "criterion": "League Compatibility",
        "searchValue": "Serie A",
        "playerValue": "Serie B experience",
        "matchStrength": "good",
        "explanation": "Currently in Serie B - familiar with Italian football style"
      }
    ],
    "strengthScore": 92,
    "potentialConcerns": [
      "Limited top-flight experience (only Serie B)"
    ],
    "additionalContext": "Strong goal-scoring record in Serie B (15 goals in 22 matches) suggests readiness for Serie A step-up"
  }
}
```

### Sample Query: "Need a defensive midfielder with Champions League experience"

**Player Result: Marco Verratti (31, Italian midfielder)**
```json
{
  "matchExplanation": {
    "summary": "Marco Verratti perfectly matches as an experienced defensive midfielder with extensive Champions League experience at PSG.",
    "matchedCriteria": [
      {
        "criterion": "Position",
        "searchValue": "defensive midfielder",
        "playerValue": "Central Midfielder (Defensive)",
        "matchStrength": "perfect",
        "explanation": "Specialized defensive midfielder role"
      },
      {
        "criterion": "Experience Level",
        "searchValue": "Champions League experience",
        "playerValue": "50+ Champions League matches",
        "matchStrength": "perfect",
        "explanation": "Extensive Champions League experience with PSG"
      }
    ],
    "strengthScore": 95,
    "additionalContext": "Italy national team regular with leadership qualities and proven ability in high-pressure matches"
  }
}
```

## Technical Considerations

### Performance Optimization
- **Parallel Crawling**: Run multiple crawlers simultaneously
- **Caching Strategy**: Cache frequently searched players
- **Rate Limiting**: Respect website rate limits to avoid blocking
- **Resource Management**: Optimize memory usage with connection pooling

### Security & Ethics
- **Website Terms of Service**: Ensure compliance with scraping policies
- **Rate Limiting**: Implement respectful crawling practices
- **Data Privacy**: Secure handling of search queries and results
- **Error Handling**: Graceful degradation when websites are unavailable

### Scalability
- **Horizontal Scaling**: Design for multiple crawler instances
- **Database Optimization**: Index frequently queried fields
- **Queue Management**: Handle high-volume search requests
- **CDN Integration**: Optimize asset delivery

### Monitoring & Maintenance
- **Health Checks**: Monitor crawler success rates
- **Performance Metrics**: Track response times and accuracy
- **Website Changes**: Detect and adapt to website structure changes
- **Error Logging**: Comprehensive error tracking and alerting

## Development Timeline

**Total Estimated Time**: 6 weeks

**Week 1**: Core infrastructure setup
**Week 2**: AI integration and search logic
**Week 3**: Web crawling engine development
**Week 4**: Data processing and storage
**Week 5**: Frontend development and UX
**Week 6**: Testing, optimization, and deployment

## Success Metrics

- **Search Accuracy**: >80% relevant results per search
- **Response Time**: <30 seconds for initial results
- **Crawler Reliability**: >95% uptime across all sources
- **User Satisfaction**: Positive feedback on result quality
- **System Performance**: Handle 100+ concurrent searches
- **Explanation Quality**: >85% of explanations rated as "helpful" by users
- **Match Strength Accuracy**: Average match strength correlates with user ratings

## Future Enhancements

- **Machine Learning**: Improve search relevance with ML models
- **Video Integration**: Embed player highlight videos
- **Advanced Analytics**: Player performance predictions
- **Mobile App**: Native mobile application
- **API Access**: Public API for third-party integrations

## Risks & Mitigation

### Technical Risks
- **Website Changes**: Regular monitoring and crawler updates
- **Rate Limiting**: Implement robust retry mechanisms
- **Data Quality**: Validation and cleaning processes

### Legal Risks
- **Terms of Service**: Legal review of scraping activities
- **Data Usage**: Ensure compliance with data protection laws
- **Copyright**: Respect intellectual property rights

### Operational Risks
- **Downtime**: Implement redundancy and failover systems
- **Scalability**: Design for growth from the beginning
- **Maintenance**: Plan for ongoing updates and improvements

---

## Next Steps

1. **Review this plan** and make any necessary adjustments
2. **Set up the development environment** (Docker, databases)
3. **Begin with Phase 1** implementation
4. **Establish regular check-ins** to track progress
5. **Prepare for iterative development** with user feedback

This plan provides a solid foundation for building your football scout app. Please review and let me know if you'd like to modify any aspects before we begin implementation! 