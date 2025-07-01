import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger';
import { authMiddleware } from './middleware/auth';
import { metricsMiddleware, register } from './middleware/metrics';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Metrics middleware
app.use(metricsMiddleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'gateway', timestamp: new Date() });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Service routes configuration
const services = {
  '/api/auth': {
    target: process.env.AUTH_SERVICE_URL || 'http://auth:3001',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
  },
  '/api/organizations': {
    target: process.env.ORGANIZATION_SERVICE_URL || 'http://organization:3002',
    changeOrigin: true,
    pathRewrite: { '^/api/organizations': '' },
  },
  '/api/wc': {
    target: process.env.WOOCOMMERCE_SERVICE_URL || 'http://woocommerce:3003',
    changeOrigin: true,
    pathRewrite: { '^/api/wc': '' },
  },
  '/api/billing': {
    target: process.env.BILLING_SERVICE_URL || 'http://billing:3004',
    changeOrigin: true,
    pathRewrite: { '^/api/billing': '' },
  },
  '/api/analytics': {
    target: process.env.ANALYTICS_SERVICE_URL || 'http://analytics:3005',
    changeOrigin: true,
    pathRewrite: { '^/api/analytics': '' },
  },
  '/api/ai': {
    target: process.env.AI_SERVICE_URL || 'http://ai:3006',
    changeOrigin: true,
    pathRewrite: { '^/api/ai': '' },
  },
};

// Apply authentication middleware to protected routes
const publicRoutes = ['/api/auth/login', '/api/auth/register', '/api/billing/webhook'];
app.use('/api/*', (req, res, next) => {
  if (publicRoutes.some(route => req.path.startsWith(route))) {
    return next();
  }
  return authMiddleware(req, res, next);
});

// Setup proxy routes
Object.entries(services).forEach(([path, config]) => {
  app.use(
    path,
    createProxyMiddleware({
      ...config,
      onProxyReq: (proxyReq, req: any) => {
        // Forward user context to microservices
        if (req.user) {
          proxyReq.setHeader('X-User-Id', req.user.uid);
          proxyReq.setHeader('X-User-Email', req.user.email);
        }
        if (req.organizationId) {
          proxyReq.setHeader('X-Organization-Id', req.organizationId);
        }
      },
      onError: (err, req, res) => {
        logger.error(`Proxy error: ${err.message}`, { path, error: err });
        res.status(502).json({
          error: 'Service temporarily unavailable',
          service: path,
        });
      },
    })
  );
  logger.info(`Proxy route configured: ${path} -> ${config.target}`);
});

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
  logger.info('Service routes configured:', Object.keys(services));
});