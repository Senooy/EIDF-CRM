import { prisma } from '../db/prisma';
import { subDays, startOfDay, endOfDay, format } from 'date-fns';

interface DailyMetric {
  date: string;
  value: number;
}

interface AnalyticsSummary {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  activeUsers: number;
  aiGenerations: number;
  conversionRate: number;
  averageOrderValue: number;
}

interface ActivityMetrics {
  recentActivities: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    user: string;
    timestamp: Date;
    metadata?: any;
  }>;
  userActivity: Array<{
    userId: string;
    userName: string;
    actionCount: number;
    lastActive: Date;
  }>;
}

export class AnalyticsService {
  static async getOrganizationSummary(
    organizationId: string,
    days: number = 30
  ): Promise<AnalyticsSummary> {
    const startDate = startOfDay(subDays(new Date(), days));
    
    // Get activity logs for the period
    const activities = await prisma.activityLog.findMany({
      where: {
        organizationId,
        createdAt: { gte: startDate },
      },
    });

    // Get usage records
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    const usageRecords = subscription ? await prisma.usageRecord.findMany({
      where: {
        subscriptionId: subscription.id,
        createdAt: { gte: startDate },
      },
    }) : [];

    // Get active users count
    const activeUsers = await prisma.organizationUser.count({
      where: { organizationId },
    });

    // Calculate metrics from activity logs
    const orderActivities = activities.filter(a => a.entityType === 'order');
    const productActivities = activities.filter(a => a.entityType === 'product');
    const customerActivities = activities.filter(a => a.entityType === 'customer');

    // Calculate AI generations
    const aiGenerations = usageRecords
      .filter(r => r.metric === 'ai_generation')
      .reduce((sum, r) => sum + r.count, 0);

    // Mock some metrics (in real app, these would come from WooCommerce API)
    const totalOrders = orderActivities.filter(a => a.action === 'order.created').length;
    const totalRevenue = orderActivities
      .filter(a => a.action === 'order.completed')
      .reduce((sum, a) => sum + (a.metadata?.total || 0), 0);
    const totalProducts = productActivities.filter(a => a.action === 'product.created').length;
    const totalCustomers = customerActivities.filter(a => a.action === 'customer.created').length;

    const conversionRate = totalOrders > 0 ? (totalOrders / (totalCustomers || 1)) * 100 : 0;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return {
      totalOrders,
      totalRevenue,
      totalProducts,
      totalCustomers,
      activeUsers,
      aiGenerations,
      conversionRate: Math.round(conversionRate * 100) / 100,
      averageOrderValue: Math.round(averageOrderValue * 100) / 100,
    };
  }

  static async getDailyMetrics(
    organizationId: string,
    metric: string,
    days: number = 30
  ): Promise<DailyMetric[]> {
    const dates: DailyMetric[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const count = await prisma.activityLog.count({
        where: {
          organizationId,
          action: { contains: metric },
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      dates.push({
        date: format(date, 'yyyy-MM-dd'),
        value: count,
      });
    }

    return dates;
  }

  static async getTopProducts(
    organizationId: string,
    limit: number = 10
  ): Promise<Array<{ productId: string; name: string; sales: number; revenue: number }>> {
    const activities = await prisma.activityLog.findMany({
      where: {
        organizationId,
        action: 'order.item.added',
        entityType: 'product',
      },
      take: 100, // Sample size
    });

    // Group by product and calculate metrics
    const productMap = new Map<string, { name: string; sales: number; revenue: number }>();
    
    activities.forEach(activity => {
      const productId = activity.entityId || 'unknown';
      const existing = productMap.get(productId) || { name: '', sales: 0, revenue: 0 };
      
      productMap.set(productId, {
        name: activity.metadata?.productName || `Product ${productId}`,
        sales: existing.sales + (activity.metadata?.quantity || 1),
        revenue: existing.revenue + (activity.metadata?.total || 0),
      });
    });

    // Convert to array and sort by sales
    const products = Array.from(productMap.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit);

    return products;
  }

  static async getActivityMetrics(
    organizationId: string,
    limit: number = 50
  ): Promise<ActivityMetrics> {
    // Get recent activities
    const recentActivities = await prisma.activityLog.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get user activity summary
    const userActivityMap = new Map<string, {
      userName: string;
      actionCount: number;
      lastActive: Date;
    }>();

    recentActivities.forEach(activity => {
      const existing = userActivityMap.get(activity.userId) || {
        userName: activity.user.displayName || activity.user.email,
        actionCount: 0,
        lastActive: activity.createdAt,
      };

      userActivityMap.set(activity.userId, {
        userName: existing.userName,
        actionCount: existing.actionCount + 1,
        lastActive: existing.lastActive > activity.createdAt ? existing.lastActive : activity.createdAt,
      });
    });

    const userActivity = Array.from(userActivityMap.entries())
      .map(([userId, data]) => ({ userId, ...data }))
      .sort((a, b) => b.actionCount - a.actionCount);

    return {
      recentActivities: recentActivities.map(a => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType || '',
        entityId: a.entityId || '',
        user: a.user.displayName || a.user.email,
        timestamp: a.createdAt,
        metadata: a.metadata,
      })),
      userActivity,
    };
  }

  static async recordActivity(
    organizationId: string,
    userId: string,
    action: string,
    entityType?: string,
    entityId?: string,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    await prisma.activityLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType,
        entityId,
        metadata,
        ipAddress,
        userAgent,
      },
    });
  }

  static async getUsageTrends(
    organizationId: string,
    metric: string,
    days: number = 30
  ): Promise<DailyMetric[]> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) return [];

    const dates: DailyMetric[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);

      const usage = await prisma.usageRecord.aggregate({
        where: {
          subscriptionId: subscription.id,
          metric,
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        _sum: {
          count: true,
        },
      });

      dates.push({
        date: format(date, 'yyyy-MM-dd'),
        value: usage._sum.count || 0,
      });
    }

    return dates;
  }

  static async getOrganizationHealth(organizationId: string): Promise<{
    score: number;
    factors: Array<{ name: string; score: number; weight: number }>;
    recommendations: string[];
  }> {
    const summary = await this.getOrganizationSummary(organizationId, 30);
    const activities = await this.getActivityMetrics(organizationId, 100);
    
    // Calculate health factors
    const factors = [
      {
        name: 'Activité utilisateurs',
        score: Math.min(activities.userActivity.length * 20, 100),
        weight: 0.3,
      },
      {
        name: 'Utilisation IA',
        score: Math.min(summary.aiGenerations * 2, 100),
        weight: 0.2,
      },
      {
        name: 'Croissance commandes',
        score: Math.min(summary.totalOrders * 5, 100),
        weight: 0.3,
      },
      {
        name: 'Engagement produits',
        score: Math.min(summary.totalProducts * 10, 100),
        weight: 0.2,
      },
    ];

    const totalScore = factors.reduce((sum, f) => sum + (f.score * f.weight), 0);

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (factors[0].score < 50) {
      recommendations.push('Invitez plus d\'utilisateurs pour augmenter la collaboration');
    }
    if (factors[1].score < 50) {
      recommendations.push('Utilisez l\'IA pour optimiser vos descriptions produits');
    }
    if (summary.conversionRate < 2) {
      recommendations.push('Améliorez vos fiches produits pour augmenter la conversion');
    }
    if (summary.averageOrderValue < 50) {
      recommendations.push('Proposez des produits complémentaires pour augmenter le panier moyen');
    }

    return {
      score: Math.round(totalScore),
      factors,
      recommendations,
    };
  }
}