import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import fs from 'fs';

import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFound } from './middleware/error.middleware';
import { generalLimiter } from './middleware/rateLimit.middleware';
import { swaggerSpec } from './config/swagger';
import apiRoutes from './routes';

export const app = express();
app.set('trust proxy', 1);

export const httpServer = createServer(app);
const allowedOrigins = new Set([
  ...env.corsOrigins,
  'https://kootaflow-client-nz3v.onrender.com',
  'https://kootaflow-client.onrender.com',
  'https://kootaflow.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
]);

export function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (env.corsOrigins.includes('*') || allowedOrigins.has(origin)) return true;
  if (origin.endsWith('.onrender.com') || origin.startsWith('http://localhost:')) return true;
  return false;
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
};

// Socket.io for real-time notifications
export const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

io.on('connection', (socket) => {
  logger.info(`Client connected via websocket: ${socket.id}`);
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.nodeEnv !== 'test') {
  app.use(morgan(env.isDev ? 'dev' : 'combined'));
  // Rate limiting globally (bypassed in test environment)
  app.use('/api', generalLimiter);
}

// Swagger Documentation
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', apiRoutes);

if (env.isProd) {
  const frontendDist = path.resolve(__dirname, '../../frontend/dist');
  if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
    app.use(express.static(frontendDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.status(200).json({
        success: true,
        message: 'KootaFlow VSLA API is running',
        docs: '/api/docs',
        health: '/api/health',
      });
    });
  }
}

// 404 & Global Error Handling
app.use(notFound);
app.use(errorHandler);

// Start server (only if not running inside test runner)
export async function startServer() {
  await connectDatabase();

  return new Promise<void>((resolve) => {
    httpServer.listen(env.port, '0.0.0.0', () => {
      logger.info(`🚀 Server running in ${env.nodeEnv} mode on port ${env.port}`);
      logger.info(`📚 Swagger docs available at http://localhost:${env.port}/api/docs`);
      resolve();
    });
  });
}

// Graceful shutdown
export async function gracefulShutdown() {
  logger.info('Shutting down server...');
  return new Promise<void>((resolve) => {
    httpServer.close(async () => {
      await disconnectDatabase();
      logger.info('Server safely shut down');
      resolve();
    });
  });
}

process.on('SIGTERM', () => {
  gracefulShutdown().then(() => process.exit(0));
});
process.on('SIGINT', () => {
  gracefulShutdown().then(() => process.exit(0));
});

if (process.env.NODE_ENV !== 'test' && require.main === module) {
  startServer();
}

export default app;
