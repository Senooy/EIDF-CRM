import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { getRecentOrders, getAllOrders, getCustomerById, getProductById, getSalesReport, getOrderById } from './src/lib/woocommerce.js'; // Notez l'extension .js ici
import { firebaseAuthMiddleware } from './src/middleware/firebaseAuth.js';

// Load environment variables from .env if present
dotenv.config();

const app = express();
const port = process.env.PORT || 3001; // Le port 3000 est souvent utilisé par Vite

app.use(cors()); // Activer CORS pour toutes les routes
app.use(express.json()); // Pour parser les corps de requête JSON
app.use('/api', firebaseAuthMiddleware);

// Helper type pour les gestionnaires de requêtes async
type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

// Middleware pour envelopper les gestionnaires async et attraper les erreurs
const asyncHandler = (fn: AsyncRequestHandler) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Route pour récupérer les commandes récentes
app.get('/api/orders', asyncHandler(async (req: Request, res: Response) => {
  const count = req.query.count ? parseInt(req.query.count as string, 10) : undefined;
  const orders = await getRecentOrders(count);
  res.json(orders);
}));

// Route pour récupérer toutes les commandes, potentiellement pour un client spécifique
app.get('/api/all-orders', asyncHandler(async (req: Request, res: Response) => {
  const customerId = req.query.customerId ? parseInt(req.query.customerId as string) : undefined;
  const orders = await getAllOrders(customerId);
  res.json(orders);
}));

// Route pour récupérer une commande par ID
app.get('/api/orders/:orderId', asyncHandler(async (req: Request, res: Response) => {
  const orderId = parseInt(req.params.orderId);
  if (isNaN(orderId)) {
    res.status(400).json({ message: 'Invalid order ID' });
    return; // Important de retourner ici pour éviter d'exécuter la suite
  }
  const order = await getOrderById(orderId);
  if (!order) {
    res.status(404).json({ message: 'Order not found' });
    return; // Important de retourner ici
  }
  res.json(order);
}));


// Route pour récupérer un client par ID
app.get('/api/customers/:customerId', asyncHandler(async (req: Request, res: Response) => {
  const customerId = parseInt(req.params.customerId);
  if (isNaN(customerId)) {
    res.status(400).json({ message: 'Invalid customer ID' });
    return; 
  }
  const customer = await getCustomerById(customerId);
  if (!customer) {
    res.status(404).json({ message: 'Customer not found' });
    return;
  }
  res.json(customer);
}));

// Route pour récupérer un produit par ID
app.get('/api/products/:productId', asyncHandler(async (req: Request, res: Response) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) {
    res.status(400).json({ message: 'Invalid product ID' });
    return;
  }
  const product = await getProductById(productId);
  if (!product) {
    res.status(404).json({ message: 'Product not found' });
    return;
  }
  res.json(product);
}));

// Route pour récupérer le rapport des ventes
app.get('/api/reports/sales', asyncHandler(async (req: Request, res: Response) => {
  const period = req.query.period as string || 'month';
  const interval = req.query.interval as string || 'day';
  const salesReport = await getSalesReport(period, interval);
  res.json(salesReport);
}));

// Generic error handler (must be defined after all routes)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err.message); // Log only message for brevity in logs
  console.error(err.stack); // Log stack for debugging
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
}); 