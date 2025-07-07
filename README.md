# Football Scout App ⚽

An AI-powered web application designed to assist football agents in finding potential player matches during transfer windows. The app uses intelligent crawling to search multiple football websites and provides detailed match explanations based on freetext descriptions.

## 🎯 Features

- **AI-Powered Search**: Process natural language queries to find specific players
- **Multi-Source Crawling**: Search across 4+ reliable football websites with cross-verification
- **Match Explanations**: Detailed reasoning for why each player matches your criteria
- **Real-time Results**: Progressive results as crawling continues
- **Source Verification**: Compare and validate player data across multiple sources
- **Dynamic Discovery**: Automatically finds additional relevant sources
- **Cross-Platform**: Web-based interface accessible from any device

## 🛠️ Tech Stack

### Frontend
- **Vue.js 3** (Composition API)
- **Vite** (Build tool)
- **Tailwind CSS** (Styling)
- **Pinia** (State management)
- **Socket.io** (Real-time updates)

### Backend
- **Node.js** + **TypeScript**
- **Express.js** (Web framework)
- **Puppeteer** (Web scraping)
- **OpenAI API** (AI query parsing)
- **PostgreSQL** (Database)
- **Redis** (Caching & queuing)
- **Socket.io** (WebSocket communication)

### Target Sources
1. **Transfermarkt** (Primary source - highest reliability)
2. **Soccerway** (Secondary source)
3. **ZeroZero** (Tertiary source)
4. **SofaScore** (Quaternary source)
5. **Dynamic sources** (ESPN, Goal.com, Sky Sports, etc.)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL
- Redis
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/football-scout-app.git
cd football-scout-app
```

2. **Install dependencies**
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

3. **Set up databases**
```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Install Redis (macOS)
brew install redis
brew services start redis

# Create database
createdb football_scout_db
```

4. **Configure environment variables**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your configuration

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your configuration
```

5. **Start the application**
```bash
# Start backend (from backend directory)
npm run dev

# Start frontend (from frontend directory)
npm run dev
```

6. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## 🎮 Usage

### Example Queries

**Simple Position Search:**
```
"Looking for a young striker under 25"
```

**Complex Multi-Criteria Search:**
```
"Need a defensive midfielder with Champions League experience, 
preferably from South America, who can play in Serie A"
```

**Specific Requirements:**
```
"Free agent wingers available for transfer, 
aged 27-30, with Premier League experience"
```

### Understanding Results

Each player result includes:
- **Player Info**: Name, age, position, current club
- **Match Explanation**: Why this player matches your criteria
- **Match Strength**: Score (0-100) indicating match quality
- **Source Verification**: Data reliability across multiple sources
- **Potential Concerns**: Any red flags or limitations

## 📁 Project Structure

```
football-scout-app/
├── backend/                    # Node.js/TypeScript backend
│   ├── src/
│   │   ├── controllers/       # API controllers
│   │   ├── services/          # Business logic
│   │   ├── models/            # Database models
│   │   ├── crawlers/          # Web crawling engines
│   │   ├── ai/                # AI query processing
│   │   └── utils/             # Utility functions
│   ├── tests/                 # Backend tests
│   └── package.json
├── frontend/                   # Vue.js frontend
│   ├── src/
│   │   ├── components/        # Vue components
│   │   ├── views/             # Page views
│   │   ├── stores/            # Pinia stores
│   │   ├── services/          # API services
│   │   └── utils/             # Utility functions
│   ├── tests/                 # Frontend tests
│   └── package.json
├── docs/                       # Documentation
├── PROJECT_PLAN.md            # Detailed project plan
├── .gitignore
└── README.md
```

## 🔧 Development

### Backend Development
```bash
cd backend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
```

### Frontend Development
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run test         # Run tests
npm run lint         # Lint code
```

### Database Management
```bash
# Run migrations
npm run migrate

# Seed database
npm run seed

# Reset database
npm run db:reset
```

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:integration   # Integration tests only
npm run test:e2e          # End-to-end tests
```

### Frontend Tests
```bash
cd frontend
npm test                    # Run all tests
npm run test:unit          # Unit tests only
npm run test:e2e          # End-to-end tests
```

## 🚀 Deployment

### Production Build
```bash
# Build backend
cd backend
npm run build

# Build frontend
cd frontend
npm run build
```

### Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost/football_scout_db
REDIS_URL=redis://localhost:6379
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_jwt_secret
```

**Frontend (.env):**
```env
VITE_API_URL=http://localhost:3000
VITE_WS_URL=ws://localhost:3000
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write tests for new features
- Use conventional commit messages
- Ensure code passes linting
- Update documentation for new features

## 📊 Performance Targets

- **Search Response Time**: <30 seconds for initial results
- **Crawler Reliability**: >95% uptime across all sources
- **Search Accuracy**: >80% relevant results per search
- **Concurrent Users**: Support 100+ simultaneous searches

## 🔒 Privacy & Ethics

- Respects website terms of service
- Implements respectful rate limiting
- Secure handling of search queries
- No storage of personal player data
- Compliance with data protection regulations

## 📚 Documentation

- [Project Plan](PROJECT_PLAN.md) - Detailed implementation plan
- [API Documentation](docs/api.md) - Backend API reference
- [Frontend Guide](docs/frontend.md) - Frontend development guide
- [Deployment Guide](docs/deployment.md) - Production deployment

## 🐛 Issues & Support

- Report bugs via [GitHub Issues](https://github.com/yourusername/football-scout-app/issues)
- Feature requests welcome
- Check existing issues before creating new ones

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for AI capabilities
- Puppeteer team for web scraping tools
- Vue.js community for excellent framework
- Football data providers for their services

---

**Built with ❤️ for football agents and scouts worldwide** 