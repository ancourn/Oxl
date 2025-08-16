// server.ts - Next.js Standalone + Enhanced Socket.IO
import { setupEnhancedSocket } from '@/lib/socket-enhanced';
import { createServer } from 'http';
import { Server } from 'socket.io';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const currentPort = 3000;
const hostname = '0.0.0.0';

// Custom server with Enhanced Socket.IO integration
async function createCustomServer() {
  try {
    // Create Next.js app
    const nextApp = next({ 
      dev,
      dir: process.cwd(),
      // In production, use the current directory where .next is located
      conf: dev ? undefined : { distDir: './.next' }
    });

    await nextApp.prepare();
    const handle = nextApp.getRequestHandler();

    // Create HTTP server that will handle both Next.js and Socket.IO
    const server = createServer((req, res) => {
      // Skip socket.io requests from Next.js handler
      if (req.url?.startsWith('/api/socketio')) {
        return;
      }
      handle(req, res);
    });

    // Setup Enhanced Socket.IO with production-ready configuration
    const io = new Server(server, {
      path: '/api/socketio',
      cors: {
        origin: process.env.NODE_ENV === 'production' 
          ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com']
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      serveClient: false,
      adapter: process.env.REDIS_URL 
        ? require('socket.io-redis-adapter')(require('redis').createClient(process.env.REDIS_URL))
        : undefined
    });

    setupEnhancedSocket(io);

    // Start the server
    server.listen(currentPort, hostname, () => {
      console.log(`> Ready on http://${hostname}:${currentPort}`);
      console.log(`> Enhanced Socket.IO server running at ws://${hostname}:${currentPort}/api/socketio`);
      console.log(`> Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.REDIS_URL) {
        console.log(`> Redis adapter enabled for scaling`);
      }
    });

  } catch (err) {
    console.error('Server startup error:', err);
    process.exit(1);
  }
}

// Start the server
createCustomServer();
