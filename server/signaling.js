import { WebApp } from 'meteor/webapp';
import http from 'http';
import socketIO from 'socket.io';
import { RateLimiter } from 'limiter';

// Create an HTTP server using Meteor's WebApp handlers.
const server = http.createServer(WebApp.connectHandlers);

// Initialize Socket.io on the server with secure CORS options.
const io = socketIO(server, {
  cors: {
    origin: 'https://your-secure-domain.com', // Replace with your client's origin
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Socket.io middleware to validate connection tokens.
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (isValidToken(token)) {
    return next();
  }
  return next(new Error('Authentication error'));
});

// Listen for client connections.
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Create a per-socket rate limiter: maximum 5 signaling messages per second.
  const socketRateLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });
  
  // Handle incoming signaling messages.
  socket.on('signal', (data) => {
    if (socketRateLimiter.tryRemoveTokens(1)) {
      // If a target socket ID is provided, emit directly; otherwise, broadcast.
      if (data.to) {
        io.to(data.to).emit('signal', data);
      } else {
        socket.broadcast.emit('signal', data);
      }
    } else {
      console.warn('Rate limit exceeded for socket:', socket.id);
    }
  });

  // Allow clients to join a room for group calls or private sessions.
  socket.on('join', (room) => {
    socket.join(room);
    socket.to(room).emit('user-joined', socket.id);
  });

  // Clean up on disconnect.
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start the signaling server on port 3000.
server.listen(3000, () => {
  console.log('Signaling server is running on port 3000');
});

// Dummy token validation function – replace with your real implementation.
function isValidToken(token) {
  return token === 'expected-token';
}
//• Replace placeholder origin in the CORS configuration with your actual client origin or an environment variable (e.g., process.env.CLIENT_ORIGIN).

