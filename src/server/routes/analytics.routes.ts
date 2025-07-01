import { Router } from 'express';
import { authenticateUser, requireOrganization, AuthRequest } from '../middleware/auth';
import { AnalyticsService } from '../services/analytics.service';

const router = Router();

// All analytics routes require authentication and organization
router.use(authenticateUser);
router.use(requireOrganization);

// Get organization summary
router.get('/summary', async (req: AuthRequest, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const summary = await AnalyticsService.getOrganizationSummary(
      req.organizationId!,
      days
    );
    res.json(summary);
  } catch (error) {
    console.error('Error fetching analytics summary:', error);
    res.status(500).json({ error: 'Failed to fetch analytics summary' });
  }
});

// Get daily metrics
router.get('/metrics/:metric', async (req: AuthRequest, res) => {
  try {
    const { metric } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    const data = await AnalyticsService.getDailyMetrics(
      req.organizationId!,
      metric,
      days
    );
    res.json(data);
  } catch (error) {
    console.error('Error fetching daily metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get top products
router.get('/top-products', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const products = await AnalyticsService.getTopProducts(
      req.organizationId!,
      limit
    );
    res.json(products);
  } catch (error) {
    console.error('Error fetching top products:', error);
    res.status(500).json({ error: 'Failed to fetch top products' });
  }
});

// Get activity metrics
router.get('/activity', async (req: AuthRequest, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = await AnalyticsService.getActivityMetrics(
      req.organizationId!,
      limit
    );
    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity metrics:', error);
    res.status(500).json({ error: 'Failed to fetch activity metrics' });
  }
});

// Get usage trends
router.get('/usage-trends/:metric', async (req: AuthRequest, res) => {
  try {
    const { metric } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    const trends = await AnalyticsService.getUsageTrends(
      req.organizationId!,
      metric,
      days
    );
    res.json(trends);
  } catch (error) {
    console.error('Error fetching usage trends:', error);
    res.status(500).json({ error: 'Failed to fetch usage trends' });
  }
});

// Get organization health score
router.get('/health', async (req: AuthRequest, res) => {
  try {
    const health = await AnalyticsService.getOrganizationHealth(
      req.organizationId!
    );
    res.json(health);
  } catch (error) {
    console.error('Error fetching organization health:', error);
    res.status(500).json({ error: 'Failed to fetch organization health' });
  }
});

// Record activity (for internal use)
router.post('/activity', async (req: AuthRequest, res) => {
  try {
    const { action, entityType, entityId, metadata } = req.body;
    
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }
    
    await AnalyticsService.recordActivity(
      req.organizationId!,
      req.user!.uid,
      action,
      entityType,
      entityId,
      metadata,
      req.ip,
      req.get('user-agent')
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording activity:', error);
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

export default router;