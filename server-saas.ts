import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AuthRequest } from './src/server/middleware/auth';
import { authenticateUser, requireOrganization } from './src/server/middleware/auth';
import { activityTracker } from './src/server/middleware/activity-tracker';
import { WooCommerceFactory } from './src/server/services/woocommerce-factory.service';
import { ApiCredentialService } from './src/server/services/api-credential.service';
import { initializeGemini } from './src/lib/gemini-service.js';
import { generateAllContentSingleCall } from './src/lib/gemini-single-call.js';

// Import routes
import organizationRoutes from './src/server/routes/organization.routes';
import apiCredentialRoutes from './src/server/routes/api-credential.routes';
import billingRoutes from './src/server/routes/billing.routes';
import analyticsRoutes from './src/server/routes/analytics.routes';
// import campaignsRoutes from './src/server/routes/campaigns.routes'; // TODO: Fix imports with @/ alias

// Load environment variables
dotenv.config();

console.log('Starting SaaS server...');

const app = express();
const port = process.env.PORT || 3001;

// Configure CORS with specific options
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow localhost origins for development
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:5173',
      'http://localhost:3000',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['x-wp-total', 'x-wp-totalpages'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(express.json());

// Helper type for async request handlers
type AsyncRequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>;

// Middleware to wrap async handlers and catch errors
const asyncHandler = (fn: AsyncRequestHandler) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// API Routes
app.use('/api', organizationRoutes);
app.use('/api', apiCredentialRoutes);
app.use('/api', billingRoutes);
app.use('/api/analytics', analyticsRoutes);
// app.use('/api', campaignsRoutes); // TODO: Fix imports with @/ alias

// Temporary mock campaigns endpoint for testing
app.get('/api/campaigns', (req: express.Request, res: express.Response) => {
  res.json([]);
});

// Multi-tenant WooCommerce proxy routes
const wooCommerceRouter = express.Router();

// Apply auth middleware to all WooCommerce routes
wooCommerceRouter.use(authenticateUser);
wooCommerceRouter.use(requireOrganization);
wooCommerceRouter.use(activityTracker);

// Orders endpoints
wooCommerceRouter.get('/orders', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.getOrders(req.organizationId!, req.query);
    
    // Forward pagination headers
    if (response.headers['x-wp-total']) {
      res.setHeader('x-wp-total', response.headers['x-wp-total']);
    }
    if (response.headers['x-wp-totalpages']) {
      res.setHeader('x-wp-totalpages', response.headers['x-wp-totalpages']);
    }
    
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

wooCommerceRouter.get('/orders/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.getOrder(req.organizationId!, req.params.id);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

wooCommerceRouter.put('/orders/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.updateOrder(req.organizationId!, req.params.id, req.body);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// Products endpoints
wooCommerceRouter.get('/products', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.getProducts(req.organizationId!, req.query);
    
    // Forward pagination headers
    if (response.headers['x-wp-total']) {
      res.setHeader('x-wp-total', response.headers['x-wp-total']);
    }
    if (response.headers['x-wp-totalpages']) {
      res.setHeader('x-wp-totalpages', response.headers['x-wp-totalpages']);
    }
    
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

wooCommerceRouter.get('/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.getProduct(req.organizationId!, req.params.id);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

wooCommerceRouter.put('/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.updateProduct(req.organizationId!, req.params.id, req.body);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// Customers endpoints
wooCommerceRouter.get('/customers', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.getCustomers(req.organizationId!, req.query);
    
    // Forward pagination headers
    if (response.headers['x-wp-total']) {
      res.setHeader('x-wp-total', response.headers['x-wp-total']);
    }
    if (response.headers['x-wp-totalpages']) {
      res.setHeader('x-wp-totalpages', response.headers['x-wp-totalpages']);
    }
    
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

wooCommerceRouter.get('/customers/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.getCustomer(req.organizationId!, req.params.id);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// Reports endpoints
wooCommerceRouter.get('/reports/:type', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const response = await WooCommerceFactory.getReports(req.organizationId!, req.params.type, req.query);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// Mount WooCommerce routes
app.use('/api/wc', wooCommerceRouter);

// Multi-tenant AI endpoints
const aiRouter = express.Router();
aiRouter.use(authenticateUser);
aiRouter.use(requireOrganization);

aiRouter.post('/generate-single-call', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    const geminiCreds = await ApiCredentialService.getGeminiCredentials(req.organizationId!);
    
    if (!geminiCreds) {
      res.status(503).json({ message: 'AI service not configured for your organization' });
      return;
    }
    
    const genAI = initializeGemini(geminiCreds.apiKey);
    const { product, style } = req.body;
    
    if (!product) {
      res.status(400).json({ message: 'Product data is required' });
      return;
    }
    
    console.log(`Generating AI content for org ${req.organizationId}, product ${product.id}`);
    const content = await generateAllContentSingleCall(genAI, product, style);
    res.json(content);
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Mount AI routes
app.use('/api/ai', aiRouter);

// Error handler for WooCommerce API errors
function handleWooCommerceError(error: unknown, res: Response) {
  if (error instanceof Error) {
    console.error('WooCommerce API error:', error.message);
    res.status(500).json({
      message: error.message,
      code: 'woocommerce_error',
    });
  } else {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Generic error handler (must be defined after all routes)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(port, () => {
  console.log(`✅ SaaS Server is running on http://localhost:${port}`);
  console.log(`✅ Multi-tenant WooCommerce API ready`);
  console.log(`✅ Organization management API ready`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please stop the other process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});