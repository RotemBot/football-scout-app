import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Pool } from 'pg';
import { WebSocketService } from './services/websocket.service';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
    credentials: true,
  },
});

const PORT = process.env['PORT'] || 3000;

// Database connection
const dbPool = new Pool({
  host: process.env['DB_HOST'] || 'localhost',
  port: parseInt(process.env['DB_PORT'] || '5432', 10),
  database: process.env['DB_NAME'] || 'football_scout_db',
  user: process.env['DB_USER'] || process.env['USER'] || 'postgres',
  password: process.env['DB_PASSWORD'] || '',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Initialize WebSocket service
const websocketService = new WebSocketService(io, dbPool);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env['CORS_ORIGIN'] || 'http://localhost:5173',
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env['npm_package_version'] || '1.0.0'
  });
});

// API routes
app.get('/api/test', (req, res) => {
  res.json({ message: 'Football Scout API is running!' });
});

// WebSocket statistics endpoint
app.get('/api/websocket/stats', (req, res) => {
  const stats = websocketService.getActiveSearchStats();
  res.json({
    ...stats,
    timestamp: new Date().toISOString()
  });
});

// Legacy HTTP search endpoint for compatibility
app.post('/api/search', (req, res) => {
  const { query } = req.body;
  
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  
  return res.json({
    status: 'accepted',
    message: 'Search initiated. Connect to WebSocket for real-time updates.',
    websocketEvents: [
      'search:started',
      'search:progress', 
      'search:ai-parsing',
      'search:validation',
      'search:database-query',
      'search:match-explanation',
      'search:results',
      'search:completed',
      'search:error'
    ],
    instructions: 'Emit "search:start" event with { query: "your query", params?: {} } to begin search'
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received. Shutting down gracefully...');
  
  try {
    await dbPool.end();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
  
  server.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Football Scout API server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for AI-powered search`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 WebSocket stats: http://localhost:${PORT}/api/websocket/stats`);
});

export default app; 