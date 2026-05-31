import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { apiLimiter } from './middleware/rateLimit.js';
import authRouter from './routes/auth.js';
import requestsRouter from './routes/requests.js';
import webhooksRouter from './routes/webhooks.js';
import { initSocket } from './lib/socket.js';
import { startWorker } from './workers/classificationWorker.js';





// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Start background worker (if not testing)
if (process.env.NODE_ENV !== 'test') {
  startWorker();
}


// Global Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(morgan('dev'));
app.use(express.json());

// Routers
app.use('/auth', authRouter);
app.use('/requests', requestsRouter);
app.use('/webhooks', webhooksRouter);



// Apply global API rate limit
app.use('/api', apiLimiter);


// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Port configuration
const PORT = process.env.PORT || 3001;

// Only start listening if not imported (useful for testing or other configurations)
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export { app, server };
