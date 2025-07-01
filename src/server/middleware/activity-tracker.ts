import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import { AnalyticsService } from '../services/analytics.service';

// Map of routes to activity actions
const ACTIVITY_MAP: Record<string, { action: string; entityType?: string }> = {
  'POST /api/wc/products': { action: 'product.created', entityType: 'product' },
  'PUT /api/wc/products/:id': { action: 'product.updated', entityType: 'product' },
  'DELETE /api/wc/products/:id': { action: 'product.deleted', entityType: 'product' },
  'POST /api/wc/orders': { action: 'order.created', entityType: 'order' },
  'PUT /api/wc/orders/:id': { action: 'order.updated', entityType: 'order' },
  'POST /api/wc/customers': { action: 'customer.created', entityType: 'customer' },
  'PUT /api/wc/customers/:id': { action: 'customer.updated', entityType: 'customer' },
  'POST /api/ai/generate-single-call': { action: 'ai.generation', entityType: 'ai' },
  'POST /api/checkout': { action: 'billing.checkout', entityType: 'billing' },
  'POST /api/organizations': { action: 'organization.created', entityType: 'organization' },
};

export function activityTracker(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  // Skip if no user or organization
  if (!req.user || !req.organizationId) {
    return next();
  }

  // Store original send functions
  const originalSend = res.send;
  const originalJson = res.json;

  // Helper to track activity
  const trackActivity = async (body: any) => {
    try {
      // Build route pattern
      const method = req.method;
      const path = req.route?.path || req.path;
      const routePattern = `${method} ${path}`;

      // Check if this route should be tracked
      const activityInfo = ACTIVITY_MAP[routePattern];
      if (!activityInfo) return;

      // Extract entity ID from params or body
      let entityId = req.params.id;
      if (!entityId && body?.id) {
        entityId = body.id;
      }

      // Extract entity name for better activity messages
      const metadata: any = {};
      if (body?.name) metadata.entityName = body.name;
      if (body?.title) metadata.entityName = body.title;
      if (body?.total) metadata.total = body.total;
      if (body?.quantity) metadata.quantity = body.quantity;

      // Record the activity
      await AnalyticsService.recordActivity(
        req.organizationId!,
        req.user!.uid,
        activityInfo.action,
        activityInfo.entityType,
        entityId,
        metadata,
        req.ip,
        req.get('user-agent')
      );
    } catch (error) {
      // Don't fail the request if activity tracking fails
      console.error('Activity tracking error:', error);
    }
  };

  // Override response methods
  res.send = function(body: any): Response {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      trackActivity(body);
    }
    return originalSend.call(this, body);
  };

  res.json = function(body: any): Response {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      trackActivity(body);
    }
    return originalJson.call(this, body);
  };

  next();
}

// Middleware to track specific user actions
export function trackUserAction(action: string, entityType?: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.user && req.organizationId) {
      try {
        await AnalyticsService.recordActivity(
          req.organizationId,
          req.user.uid,
          action,
          entityType,
          undefined,
          req.body,
          req.ip,
          req.get('user-agent')
        );
      } catch (error) {
        console.error('Error tracking user action:', error);
      }
    }
    next();
  };
}