require('dotenv').config();
const http = require('http');
const socketIO = require('socket.io');
const { RateLimiter } = require('limiter');

// Create an HTTP server (ensure this server runs over HTTPS in production)
const server = http.createServer();

// Initialize Socket.IO with secure CORS options.
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || 'https://your-secure-domain.com',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Create a rate limiter: max 5 signaling messages per second per socket.
const rateLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });

// Dummy token validation function – replace with your real logic.
function isValidToken(token) {
  return token === 'expected-token';
}

// Middleware to validate tokens for incoming socket connections.
io.use((socket, next) => {
  const token = socket.handshake.query.token;
  if (isValidToken(token)) {
    return next();
  }
  return next(new Error('Authentication error'));
});

// Handle socket connections.
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Listen for the "join" event to allow sockets to join a room (i.e. a conference call room)
  socket.on('join', (room) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room ${room}`);
    // Notify others in the room that a new user has joined.
    socket.to(room).emit('user-joined', socket.id);
  });

  // Listen for "signal" events to exchange SDP and ICE candidates.
  socket.on('signal', (data) => {
    // Use the rate limiter to prevent abuse.
    if (!rateLimiter.tryRemoveTokens(1)) {
      console.warn(`Rate limit exceeded for socket ${socket.id}`);
      return;
    }

    // If a specific recipient is specified, send the signal to that socket.
    if (data.to) {
      io.to(data.to).emit('signal', { from: socket.id, ...data });
    }
    // Otherwise, if a room is specified, broadcast to the room (excluding the sender).
    else if (data.room) {
      socket.to(data.room).emit('signal', { from: socket.id, ...data });
    }
  });

  // When a socket disconnects, notify the room members.
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    // Iterate through rooms the socket belonged to (except its own room)
    socket.rooms.forEach((room) => {
      if (room !== socket.id) {
        socket.to(room).emit('user-left', socket.id);
      }
    });
  });
});

// Start the signaling server.
const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Signaling server is running on port ${port}`);
});
