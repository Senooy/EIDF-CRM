import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AuthRequest } from './src/server/middleware/auth';
import { authenticateUser, requireOrganization } from './src/server/middleware/auth';
import { activityTracker } from './src/server/middleware/activity-tracker';
// Import campaign routes
import campaignsRoutes from './src/server/routes/campaigns.routes';
import campaignsSimpleRoutes from './src/server/routes/campaigns-simple.routes';
import ipWarmupRoutes from './src/server/routes/ip-warmup.routes';
import trackingRoutes from './src/server/routes/tracking.routes';
import settingsRoutes from './src/server/routes/settings.routes';

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

// API Routes - Campaign related only
app.use('/api', campaignsRoutes);
app.use('/api', campaignsSimpleRoutes);
app.use('/api', ipWarmupRoutes);
app.use('/api', trackingRoutes);
app.use('/api', settingsRoutes);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'EIDF CRM - Campaigns' });
});

// Generic error handler (must be defined after all routes)
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.message);
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(port, () => {
  console.log(`✅ EIDF CRM Campaign Server is running on http://localhost:${port}`);
  console.log(`✅ Campaign management API ready`);
  console.log(`✅ Email infrastructure ready`);
}).on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${port} is already in use. Please stop the other process or use a different port.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});