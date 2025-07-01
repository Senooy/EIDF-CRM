import express from 'express';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error';
import { metricsMiddleware, register } from './middleware/metrics';
import organizationRoutes from './routes/organization.routes';
import { MessageQueue } from './utils/message-queue';
import { CacheService } from './services/cache.service';

const app = express();
const PORT = process.env.PORT || 3002;
const prisma = new PrismaClient();

// Initialize services
const redis = createClient({ url: process.env.REDIS_URL });
const messageQueue = new MessageQueue(process.env.RABBITMQ_URL || 'amqp://localhost');
const cache = new CacheService(redis);

// Middleware
app.use(helmet());
app.use(express.json());
app.use(metricsMiddleware);

// Make services available to routes
app.locals.prisma = prisma;
app.locals.cache = cache;
app.locals.messageQueue = messageQueue;

// Health check
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    await redis.ping();
    res.json({ 
      status: 'healthy', 
      service: 'organization',
      timestamp: new Date(),
      dependencies: {
        database: 'connected',
        redis: 'connected',
        rabbitmq: messageQueue.isConnected ? 'connected' : 'disconnected',
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ 
      status: 'unhealthy',
      service: 'organization',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Routes
app.use('/organizations', organizationRoutes);

// Error handling
app.use(errorHandler);

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down organization service...');
  
  try {
    await prisma.$disconnect();
    await redis.quit();
    await messageQueue.close();
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
async function start() {
  try {
    // Connect to dependencies
    await redis.connect();
    await messageQueue.connect();
    
    // Subscribe to message queue events
    await messageQueue.subscribe('organization.events', async (message) => {
      logger.info('Received message:', message);
      // Handle organization-related events
    });
    
    app.listen(PORT, () => {
      logger.info(`Organization service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start organization service:', error);
    process.exit(1);
  }
}

start();