import { Router, raw } from 'express';
import { authenticateUser, requireOrganization, requireRole, AuthRequest } from '../middleware/auth';
import { StripeService, PRICING_PLANS } from '../services/stripe.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Get available pricing plans
router.get('/plans', (req, res) => {
  const plans = PRICING_PLANS.map(plan => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    monthlyPrice: plan.monthlyPrice,
    yearlyPrice: plan.yearlyPrice,
    features: plan.features,
    limits: plan.limits,
  }));
  
  res.json(plans);
});

// Get current subscription
router.get(
  '/subscription',
  authenticateUser,
  requireOrganization,
  async (req: AuthRequest, res) => {
    try {
      const { prisma } = await import('../db/prisma');
      
      const subscription = await prisma.subscription.findUnique({
        where: { organizationId: req.organizationId! },
      });
      
      if (!subscription) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      
      const plan = PRICING_PLANS.find(p => p.id === subscription.plan);
      
      res.json({
        ...subscription,
        planDetails: plan,
      });
    } catch (error) {
      console.error('Error fetching subscription:', error);
      res.status(500).json({ error: 'Failed to fetch subscription' });
    }
  }
);

// Create checkout session
router.post(
  '/checkout',
  authenticateUser,
  requireOrganization,
  requireRole(UserRole.OWNER),
  async (req: AuthRequest, res) => {
    try {
      const { plan, billingPeriod } = req.body;
      
      if (!plan || !billingPeriod) {
        return res.status(400).json({ error: 'Plan and billing period required' });
      }
      
      const successUrl = `${req.headers.origin}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = `${req.headers.origin}/billing`;
      
      const session = await StripeService.createCheckoutSession(
        req.organizationId!,
        plan,
        billingPeriod,
        successUrl,
        cancelUrl
      );
      
      res.json({ checkoutUrl: session.url });
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      res.status(500).json({ error: error.message || 'Failed to create checkout session' });
    }
  }
);

// Create customer portal session
router.post(
  '/portal',
  authenticateUser,
  requireOrganization,
  requireRole(UserRole.OWNER),
  async (req: AuthRequest, res) => {
    try {
      const returnUrl = `${req.headers.origin}/billing`;
      
      const session = await StripeService.createPortalSession(
        req.organizationId!,
        returnUrl
      );
      
      res.json({ portalUrl: session.url });
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      res.status(500).json({ error: error.message || 'Failed to create portal session' });
    }
  }
);

// Check usage limits
router.get(
  '/usage/:metric',
  authenticateUser,
  requireOrganization,
  async (req: AuthRequest, res) => {
    try {
      const metric = req.params.metric as any;
      const validMetrics = ['users', 'products', 'orders', 'ai_generations'];
      
      if (!validMetrics.includes(metric)) {
        return res.status(400).json({ error: 'Invalid metric' });
      }
      
      const usage = await StripeService.checkUsageLimits(
        req.organizationId!,
        metric
      );
      
      res.json(usage);
    } catch (error: any) {
      console.error('Error checking usage:', error);
      res.status(500).json({ error: error.message || 'Failed to check usage' });
    }
  }
);

// Stripe webhook
router.post(
  '/webhook',
  raw({ type: 'application/json' }),
  async (req, res) => {
    const signature = req.headers['stripe-signature'] as string;
    
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe signature' });
    }
    
    try {
      await StripeService.handleWebhook(req.body, signature);
      res.json({ received: true });
    } catch (error: any) {
      console.error('Webhook error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;