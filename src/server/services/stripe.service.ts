import Stripe from 'stripe';
import { prisma } from '../db/prisma';
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export interface PricingPlan {
  id: SubscriptionPlan;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxOrders: number;
    aiGenerationsPerMonth: number;
  };
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: SubscriptionPlan.FREE,
    name: 'Gratuit',
    description: 'Parfait pour démarrer',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: [
      '1 utilisateur',
      'Jusqu\'à 100 produits',
      'Jusqu\'à 1000 commandes/mois',
      '50 générations IA/mois',
      'Support par email',
    ],
    limits: {
      maxUsers: 1,
      maxProducts: 100,
      maxOrders: 1000,
      aiGenerationsPerMonth: 50,
    },
  },
  {
    id: SubscriptionPlan.STARTER,
    name: 'Starter',
    description: 'Pour les petites boutiques',
    monthlyPrice: 29,
    yearlyPrice: 290,
    features: [
      '3 utilisateurs',
      'Jusqu\'à 1000 produits',
      'Jusqu\'à 5000 commandes/mois',
      '500 générations IA/mois',
      'Support prioritaire',
      'Exports avancés',
    ],
    limits: {
      maxUsers: 3,
      maxProducts: 1000,
      maxOrders: 5000,
      aiGenerationsPerMonth: 500,
    },
    stripePriceIdMonthly: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_STARTER_YEARLY_PRICE_ID,
  },
  {
    id: SubscriptionPlan.PROFESSIONAL,
    name: 'Professionnel',
    description: 'Pour les entreprises en croissance',
    monthlyPrice: 99,
    yearlyPrice: 990,
    features: [
      '10 utilisateurs',
      'Jusqu\'à 10000 produits',
      'Jusqu\'à 50000 commandes/mois',
      '2000 générations IA/mois',
      'Support prioritaire 24/7',
      'API avancée',
      'Rapports personnalisés',
    ],
    limits: {
      maxUsers: 10,
      maxProducts: 10000,
      maxOrders: 50000,
      aiGenerationsPerMonth: 2000,
    },
    stripePriceIdMonthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  },
  {
    id: SubscriptionPlan.ENTERPRISE,
    name: 'Enterprise',
    description: 'Solutions sur mesure',
    monthlyPrice: 299,
    yearlyPrice: 2990,
    features: [
      'Utilisateurs illimités',
      'Produits illimités',
      'Commandes illimitées',
      'Générations IA illimitées',
      'Support dédié',
      'SLA garanti',
      'Formation personnalisée',
      'Intégrations sur mesure',
    ],
    limits: {
      maxUsers: 9999,
      maxProducts: 999999,
      maxOrders: 999999,
      aiGenerationsPerMonth: 99999,
    },
    stripePriceIdMonthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID,
    stripePriceIdYearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID,
  },
];

export class StripeService {
  static async createCustomer(
    organizationId: string,
    email: string,
    name: string
  ): Promise<string> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        organizationId,
      },
    });

    // Update organization with Stripe customer ID
    await prisma.subscription.update({
      where: { organizationId },
      data: { customerId: customer.id },
    });

    return customer.id;
  }

  static async createCheckoutSession(
    organizationId: string,
    plan: SubscriptionPlan,
    billingPeriod: 'monthly' | 'yearly',
    successUrl: string,
    cancelUrl: string
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
      include: { organization: true },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    const pricingPlan = PRICING_PLANS.find(p => p.id === plan);
    if (!pricingPlan) {
      throw new Error('Invalid pricing plan');
    }

    const priceId = billingPeriod === 'monthly' 
      ? pricingPlan.stripePriceIdMonthly 
      : pricingPlan.stripePriceIdYearly;

    if (!priceId) {
      throw new Error('Stripe price ID not configured for this plan');
    }

    // Create or get customer
    let customerId = subscription.customerId;
    if (!customerId) {
      const org = subscription.organization;
      customerId = await this.createCustomer(
        organizationId,
        'admin@' + org.slug + '.com', // Placeholder email
        org.name
      );
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        organizationId,
        plan,
      },
    });

    return session;
  }

  static async createPortalSession(
    organizationId: string,
    returnUrl: string
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription?.customerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.customerId,
      return_url: returnUrl,
    });

    return session;
  }

  static async handleWebhook(
    payload: string | Buffer,
    signature: string
  ) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret not configured');
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      throw new Error('Invalid webhook signature');
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }

  private static async handleCheckoutComplete(session: Stripe.Checkout.Session) {
    const organizationId = session.metadata?.organizationId;
    const plan = session.metadata?.plan as SubscriptionPlan;

    if (!organizationId || !plan) {
      console.error('Missing metadata in checkout session');
      return;
    }

    const planConfig = PRICING_PLANS.find(p => p.id === plan);
    if (!planConfig) return;

    await prisma.subscription.update({
      where: { organizationId },
      data: {
        plan,
        status: SubscriptionStatus.ACTIVE,
        subscriptionId: session.subscription as string,
        customerId: session.customer as string,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        ...planConfig.limits,
      },
    });
  }

  private static async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { subscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    const status = this.mapStripeStatus(subscription.status);
    
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  private static async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const dbSubscription = await prisma.subscription.findUnique({
      where: { subscriptionId: subscription.id },
    });

    if (!dbSubscription) return;

    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
        // Downgrade to free plan
        plan: SubscriptionPlan.FREE,
        ...PRICING_PLANS[0].limits,
      },
    });
  }

  private static async handlePaymentFailed(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    const subscription = await prisma.subscription.findUnique({
      where: { subscriptionId: invoice.subscription as string },
    });

    if (!subscription) return;

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: SubscriptionStatus.PAST_DUE,
      },
    });

    // TODO: Send email notification to organization owner
  }

  private static mapStripeStatus(stripeStatus: string): SubscriptionStatus {
    switch (stripeStatus) {
      case 'active':
        return SubscriptionStatus.ACTIVE;
      case 'past_due':
        return SubscriptionStatus.PAST_DUE;
      case 'canceled':
      case 'unpaid':
        return SubscriptionStatus.CANCELLED;
      default:
        return SubscriptionStatus.INACTIVE;
    }
  }

  static async checkUsageLimits(
    organizationId: string,
    metric: 'users' | 'products' | 'orders' | 'ai_generations'
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new Error('Subscription not found');
    }

    let current = 0;
    let limit = 0;

    switch (metric) {
      case 'users':
        current = await prisma.organizationUser.count({
          where: { organizationId },
        });
        limit = subscription.maxUsers;
        break;

      case 'ai_generations':
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        current = await prisma.usageRecord.count({
          where: {
            subscriptionId: subscription.id,
            metric: 'ai_generation',
            createdAt: { gte: startOfMonth },
          },
        });
        limit = subscription.aiGenerationsPerMonth;
        break;

      // Products and orders would need integration with WooCommerce API
      case 'products':
        limit = subscription.maxProducts;
        break;

      case 'orders':
        limit = subscription.maxOrders;
        break;
    }

    return {
      allowed: current < limit,
      current,
      limit,
    };
  }

  static async recordUsage(
    organizationId: string,
    metric: string,
    count: number = 1,
    metadata?: any
  ) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) return;

    await prisma.usageRecord.create({
      data: {
        subscriptionId: subscription.id,
        metric,
        count,
        metadata,
      },
    });
  }
}