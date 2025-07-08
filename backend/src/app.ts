import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vue.js dev server
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'football-scout-api'
  });
});

// Basic API routes
app.get('/api/sources', (req, res) => {
  res.json([
    { id: 1, name: 'Transfermarkt', url: 'https://www.transfermarkt.co.uk', reliability: 95 },
    { id: 2, name: 'Soccerway', url: 'https://www.soccerway.com', reliability: 85 },
    { id: 3, name: 'Sofascore', url: 'https://www.sofascore.com', reliability: 80 },
    { id: 4, name: 'Zerozero', url: 'https://www.zerozero.pt', reliability: 75 }
  ]);
});

app.post('/api/search', (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  // Mock response for now
  res.json({
    searchId: 'mock-search-id',
    query,
    status: 'processing',
    message: 'Search started. Results will be sent via WebSocket.'
  });
  
  // Simulate WebSocket events
  setTimeout(() => {
    io.emit('search-progress', {
      searchId: 'mock-search-id',
      progress: 25,
      message: 'Searching Transfermarkt...'
    });
  }, 1000);
  
  setTimeout(() => {
    io.emit('search-progress', {
      searchId: 'mock-search-id',
      progress: 50,
      message: 'Searching Soccerway...'
    });
  }, 2000);
  
  setTimeout(() => {
    io.emit('search-results', {
      searchId: 'mock-search-id',
      results: [
        {
          id: 1,
          name: 'Kylian Mbappé',
          position: 'Forward',
          age: 25,
          nationality: 'France',
          club: 'Paris Saint-Germain',
          marketValue: 160000000,
          matchScore: 95,
          explanation: 'Young French forward with exceptional pace and finishing ability.'
        },
        {
          id: 2,
          name: 'Erling Haaland',
          position: 'Forward',
          age: 24,
          nationality: 'Norway',
          club: 'Manchester City',
          marketValue: 150000000,
          matchScore: 93,
          explanation: 'Prolific goal scorer with excellent positioning and physical presence.'
        }
      ]
    });
  }, 3000);
  
  return;
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env['PORT'] || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

export default app; 