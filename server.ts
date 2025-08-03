import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { 
  initializeGemini, 
  generateAllProductContent, 
  batchGenerateContent,
  GeneratedProductContent,
  BatchGenerationResult 
} from './src/lib/gemini-service.js';
import { generateAllContentSingleCall } from './src/lib/gemini-single-call.js';
import { AuthRequest, authenticateUser } from './src/server/middleware/auth';

// Load server environment variables
dotenv.config({ path: '.env.server' });

console.log('Starting server...');
console.log('Loading environment from .env.server');

const app = express();
const port = process.env.PORT || 3001;

// WooCommerce API configuration
const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL;
const WOOCOMMERCE_CLIENT_KEY = process.env.WOOCOMMERCE_CLIENT_KEY;
const WOOCOMMERCE_SECRET_KEY = process.env.WOOCOMMERCE_SECRET_KEY;

if (!WOOCOMMERCE_API_URL || !WOOCOMMERCE_CLIENT_KEY || !WOOCOMMERCE_SECRET_KEY) {
  console.error('Missing WooCommerce API credentials in .env.server');
  console.error('API_URL:', WOOCOMMERCE_API_URL);
  console.error('CLIENT_KEY:', WOOCOMMERCE_CLIENT_KEY ? 'Set' : 'Missing');
  console.error('SECRET_KEY:', WOOCOMMERCE_SECRET_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

console.log('WooCommerce API configured successfully');
console.log('API URL:', WOOCOMMERCE_API_URL);

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Warning: GEMINI_API_KEY not found in .env.server');
}
const genAI = GEMINI_API_KEY ? initializeGemini(GEMINI_API_KEY) : null;

// Create axios instance for WooCommerce API
const woocommerceApi = axios.create({
  baseURL: WOOCOMMERCE_API_URL,
  auth: {
    username: WOOCOMMERCE_CLIENT_KEY,
    password: WOOCOMMERCE_SECRET_KEY,
  },
});

app.use(cors());
app.use(express.json());

// Helper type for async request handlers
type AsyncRequestHandler = (req: AuthRequest, res: Response, next: NextFunction) => Promise<unknown>;

// Middleware to wrap async handlers and catch errors
const asyncHandler = (fn: AsyncRequestHandler) =>
  (req: AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Health check endpoint (public)
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Apply authentication middleware to all other routes
app.use('/api', authenticateUser);

// WooCommerce proxy routes
app.get('/api/wc/orders', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log('Proxying GET /orders request');
    const response = await woocommerceApi.get('/orders', { params: req.query });
    
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

app.get('/api/wc/orders/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying GET /orders/${req.params.id} request`);
    const response = await woocommerceApi.get(`/orders/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

app.put('/api/wc/orders/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying PUT /orders/${req.params.id} request`);
    const response = await woocommerceApi.put(`/orders/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

app.get('/api/wc/orders/:id/notes', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying GET /orders/${req.params.id}/notes request`);
    const response = await woocommerceApi.get(`/orders/${req.params.id}/notes`);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

app.post('/api/wc/orders/:id/notes', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying POST /orders/${req.params.id}/notes request`);
    const response = await woocommerceApi.post(`/orders/${req.params.id}/notes`, req.body);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

app.post('/api/wc/orders/:id/refunds', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying POST /orders/${req.params.id}/refunds request`);
    const response = await woocommerceApi.post(`/orders/${req.params.id}/refunds`, req.body);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// Customers endpoints
app.get('/api/wc/customers', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log('Proxying GET /customers request');
    const response = await woocommerceApi.get('/customers', { params: req.query });
    
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

app.get('/api/wc/customers/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying GET /customers/${req.params.id} request`);
    const response = await woocommerceApi.get(`/customers/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// Products endpoints
app.get('/api/wc/products', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log('Proxying GET /products request');
    const response = await woocommerceApi.get('/products', { params: req.query });
    
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

app.get('/api/wc/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying GET /products/${req.params.id} request`);
    const response = await woocommerceApi.get(`/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

app.put('/api/wc/products/:id', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log(`Proxying PUT /products/${req.params.id} request`);
    const response = await woocommerceApi.put(`/products/${req.params.id}`, req.body);
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

app.get('/api/wc/products/categories', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log('Proxying GET /products/categories request');
    const response = await woocommerceApi.get('/products/categories', { params: req.query });
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// Reports endpoints
app.get('/api/wc/reports/orders/totals', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log('Proxying GET /reports/orders/totals request');
    const response = await woocommerceApi.get('/reports/orders/totals');
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

app.get('/api/wc/reports/sales', asyncHandler(async (req: AuthRequest, res: Response) => {
  try {
    console.log('Proxying GET /reports/sales request');
    const response = await woocommerceApi.get('/reports/sales', { params: req.query });
    res.json(response.data);
  } catch (error) {
    handleWooCommerceError(error, res);
  }
}));

// AI Content Generation endpoints
app.post('/api/ai/generate-product-content', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!genAI) {
    res.status(503).json({ message: 'AI service not configured' });
    return;
  }

  try {
    const { product } = req.body;
    if (!product) {
      res.status(400).json({ message: 'Product data is required' });
      return;
    }

    console.log(`Generating AI content for product ${product.id}`);
    const content = await generateAllProductContent(genAI, product);
    res.json(content);
  } catch (error) {
    console.error('AI generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Single-call AI generation endpoint
app.post('/api/ai/generate-single-call', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!genAI) {
    res.status(503).json({ message: 'AI service not configured' });
    return;
  }

  try {
    const { product, style } = req.body;
    if (!product) {
      res.status(400).json({ message: 'Product data is required' });
      return;
    }

    console.log(`Generating AI content (single call) for product ${product.id}`);
    console.log('[Server] Style reçu dans la requête:', style);
    const content = await generateAllContentSingleCall(genAI, product, style);
    res.json(content);
  } catch (error) {
    console.error('AI single-call generation error:', error);
    res.status(500).json({ 
      message: 'Failed to generate content',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

app.post('/api/ai/batch-generate', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!genAI) {
    res.status(503).json({ message: 'AI service not configured' });
    return;
  }

  try {
    const { products } = req.body;
    if (!products || !Array.isArray(products)) {
      res.status(400).json({ message: 'Products array is required' });
      return;
    }

    console.log(`Starting batch AI generation for ${products.length} products`);
    
    // Store job in memory (in production, use Redis or database)
    const jobId = `job_${Date.now()}`;
    const results: BatchGenerationResult[] = [];
    
    // Start generation in background
    batchGenerateContent(genAI, products, (completed, total) => {
      console.log(`Batch generation progress: ${completed}/${total}`);
    }).then(async batchResults => {
      results.push(...batchResults);
      
      // Auto-update products with generated content and SEO metadata
      const successfulResults = batchResults.filter(r => r.success && r.content);
      
      for (const result of successfulResults) {
        try {
          const updatePayload: any = {};
          
          if (result.content?.title) {
            updatePayload.name = result.content.title;
          }
          if (result.content?.description) {
            updatePayload.description = result.content.description;
          }
          if (result.content?.shortDescription) {
            updatePayload.short_description = result.content.shortDescription;
          }
          
          // Add Yoast SEO metadata
          if (result.content?.seo) {
            const yoastMetaData = [];
            
            if (result.content.seo.metaTitle) {
              yoastMetaData.push({
                key: '_yoast_wpseo_title',
                value: result.content.seo.metaTitle
              });
            }
            if (result.content.seo.metaDescription) {
              yoastMetaData.push({
                key: '_yoast_wpseo_metadesc',
                value: result.content.seo.metaDescription
              });
            }
            if (result.content.seo.focusKeyphrase) {
              yoastMetaData.push({
                key: '_yoast_wpseo_focuskw',
                value: result.content.seo.focusKeyphrase
              });
            }
            if (result.content.seo.keywords && result.content.seo.keywords.length > 0) {
              yoastMetaData.push({
                key: '_yoast_wpseo_metakeywords',
                value: result.content.seo.keywords.join(', ')
              });
            }
            
            if (yoastMetaData.length > 0) {
              updatePayload.meta_data = yoastMetaData;
            }
          }
          
          // Update product via WooCommerce API
          const response = await woocommerceApi.put(`/products/${result.productId}`, updatePayload);
          console.log(`Updated product ${result.productId} with AI content and SEO metadata`);
        } catch (updateError) {
          console.error(`Failed to update product ${result.productId}:`, updateError);
        }
      }
      
      console.log(`Batch generation completed. Success: ${successfulResults.length}/${batchResults.length}`);
    }).catch(error => {
      console.error('Batch generation error:', error);
    });

    res.json({ 
      jobId,
      message: `Started batch generation for ${products.length} products`,
      totalProducts: products.length
    });
  } catch (error) {
    console.error('Batch generation error:', error);
    res.status(500).json({ 
      message: 'Failed to start batch generation',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

// Test endpoint for AI service
app.get('/api/ai/test', asyncHandler(async (req: AuthRequest, res: Response) => {
  res.json({
    configured: !!genAI,
    apiKeyPresent: !!GEMINI_API_KEY
  });
}));

// Error handler for WooCommerce API errors
function handleWooCommerceError(error: unknown, res: Response) {
  if (axios.isAxiosError(error)) {
    console.error(`WooCommerce API error: ${error.response?.status} - ${error.message}`);
    res.status(error.response?.status || 500).json({
      message: error.response?.data?.message || error.message,
      code: error.response?.data?.code || 'woocommerce_error',
    });
  } else {
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Generic error handler (must be defined after all routes)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
  console.log(`✅ WooCommerce proxy ready at http://localhost:${port}/api/wc/*`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please stop the other process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});