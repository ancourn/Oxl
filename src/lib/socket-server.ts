import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { setupEnhancedSocket } from './socket-enhanced';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

// Create HTTP server
const server = createServer(async (req, res) => {
  try {
    const parsedUrl = parse(req.url!, true);
    await handler(req, res, parsedUrl);
  } catch (err) {
    console.error('Error occurred handling', req.url, err);
    res.statusCode = 500;
    res.end('internal server error');
  }
});

// Create Socket.IO server with enhanced configuration
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
      : ['http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  serveClient: false,
  // Import Redis adapter only if REDIS_URL is available
let adapter;
if (process.env.REDIS_URL) {
  try {
    // Dynamic import for Redis adapter
    const { createRedisAdapter } = await import('socket.io-redis-adapter');
    const { createClient } = await import('redis');
    const redisClient = createClient(process.env.REDIS_URL);
    await redisClient.connect();
    adapter = createRedisAdapter(redisClient);
  } catch (err) {
    console.warn('Failed to initialize Redis adapter, using in-memory adapter:', err);
  }
}

// Apply adapter if available
if (adapter) {
  return adapter;
}
return undefined;
});

// Setup enhanced socket handlers
setupEnhancedSocket(io);

// Start server
server.listen(port, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
  console.log(`> Socket.IO server ready for real-time features`);
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export { io };