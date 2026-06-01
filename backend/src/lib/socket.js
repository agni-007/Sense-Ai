import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

let io = null;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  // Socket.io JWT auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;

    if (!token) {
      console.warn(`🔌 Connection rejected: Missing token for socket ${socket.id}`);
      return next(new Error('Authentication error: Token missing'));
    }

    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

    try {
      const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET || 'super-secret-senseai-jwt-token-signing-key');
      socket.user = decoded; // Store user details in socket session
      next();
    } catch (err) {
      console.warn(`🔌 Connection rejected: Invalid token for socket ${socket.id}`);
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id} (User: ${socket.user.name}, Role: ${socket.user.role})`);

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (Reason: ${reason})`);
    });
  });

  return io;
};

// Global emitter helper
export const emitToAll = (event, data) => {
  if (!io) {
    console.warn('⚠️ Cannot broadcast. Socket.io server is not initialized yet');
    return false;
  }
  io.emit(event, data);
  return true;
};
