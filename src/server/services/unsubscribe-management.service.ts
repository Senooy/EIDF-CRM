import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface UnsubscribeRequest {
  email: string;
  organizationId: string;
  reason?: string;
  source: 'campaign' | 'manual' | 'api' | 'complaint' | 'bounce';
  campaignId?: string;
  userAgent?: string;
  ipAddress?: string;
}

class UnsubscribeManagementService {
  /**
   * Traite une demande de désabonnement
   */
  async processUnsubscribe(request: UnsubscribeRequest): Promise<boolean> {
    try {
      // Vérifier si déjà désabonné
      const existing = await prisma.unsubscribeList.findFirst({
        where: {
          email: request.email,
          organizationId: request.organizationId
        }
      });

      if (existing) {
        logger.info('Email already unsubscribed', {
          email: request.email,
          organizationId: request.organizationId
        });
        return true;
      }

      // Ajouter à la liste de désabonnement
      await prisma.unsubscribeList.create({
        data: {
          email: request.email,
          organizationId: request.organizationId,
          reason: request.reason,
          source: request.source,
          campaignId: request.campaignId,
          userAgent: request.userAgent,
          ipAddress: request.ipAddress
        }
      });

      // Annuler tous les emails en attente pour cette combinaison email/organisation
      await this.cancelPendingEmails(request.email, request.organizationId);

      // Mettre à jour les recipients de campagne existants
      await this.updateCampaignRecipients(request.email, request.organizationId);

      logger.info('Email unsubscribed successfully', {
        email: request.email,
        organizationId: request.organizationId,
        source: request.source,
        reason: request.reason
      });

      return true;
    } catch (error) {
      logger.error('Failed to process unsubscribe', {
        request,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Désabonnement global (toutes organisations)
   */
  async processGlobalUnsubscribe(
    email: string, 
    reason?: string, 
    source: string = 'manual'
  ): Promise<boolean> {
    try {
      // Vérifier si déjà désabonné globalement
      const existing = await prisma.unsubscribeList.findFirst({
        where: {
          email,
          organizationId: null // Global unsubscribe
        }
      });

      if (existing) {
        logger.info('Email already globally unsubscribed', { email });
        return true;
      }

      // Ajouter à la liste globale
      await prisma.unsubscribeList.create({
        data: {
          email,
          organizationId: null, // Global
          reason: reason || 'Global unsubscribe request',
          source: source as any
        }
      });

      // Annuler tous les emails en attente pour toutes les organisations
      await prisma.campaignRecipient.updateMany({
        where: {
          email,
          status: { in: ['PENDING', 'SCHEDULED'] }
        },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: new Date()
        }
      });

      logger.info('Email globally unsubscribed', {
        email,
        reason,
        source
      });

      return true;
    } catch (error) {
      logger.error('Failed to process global unsubscribe', {
        email,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Réabonnement (suppression de la liste de désabonnement)
   */
  async processResubscribe(email: string, organizationId: string): Promise<boolean> {
    try {
      const deleted = await prisma.unsubscribeList.deleteMany({
        where: {
          email,
          organizationId
        }
      });

      if (deleted.count > 0) {
        logger.info('Email resubscribed successfully', {
          email,
          organizationId
        });
        return true;
      } else {
        logger.warn('Email was not found in unsubscribe list', {
          email,
          organizationId
        });
        return false;
      }
    } catch (error) {
      logger.error('Failed to process resubscribe', {
        email,
        organizationId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Vérifie si un email est désabonné
   */
  async isUnsubscribed(email: string, organizationId: string): Promise<{
    unsubscribed: boolean;
    reason?: string;
    source?: string;
    date?: Date;
    isGlobal?: boolean;
  }> {
    // Vérifier d'abord le désabonnement global
    const globalUnsubscribe = await prisma.unsubscribeList.findFirst({
      where: {
        email,
        organizationId: null
      }
    });

    if (globalUnsubscribe) {
      return {
        unsubscribed: true,
        reason: globalUnsubscribe.reason || undefined,
        source: globalUnsubscribe.source,
        date: globalUnsubscribe.createdAt,
        isGlobal: true
      };
    }

    // Vérifier le désabonnement spécifique à l'organisation
    const orgUnsubscribe = await prisma.unsubscribeList.findFirst({
      where: {
        email,
        organizationId
      }
    });

    if (orgUnsubscribe) {
      return {
        unsubscribed: true,
        reason: orgUnsubscribe.reason || undefined,
        source: orgUnsubscribe.source,
        date: orgUnsubscribe.createdAt,
        isGlobal: false
      };
    }

    return { unsubscribed: false };
  }

  /**
   * Annule tous les emails en attente pour un email/organisation
   */
  private async cancelPendingEmails(email: string, organizationId: string): Promise<void> {
    await prisma.campaignRecipient.updateMany({
      where: {
        email,
        campaign: { organizationId },
        status: { in: ['PENDING', 'SCHEDULED'] }
      },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date()
      }
    });

    logger.debug('Cancelled pending emails', { email, organizationId });
  }

  /**
   * Met à jour les recipients de campagne existants
   */
  private async updateCampaignRecipients(email: string, organizationId: string): Promise<void> {
    await prisma.campaignRecipient.updateMany({
      where: {
        email,
        campaign: { organizationId },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
      },
      data: {
        status: 'UNSUBSCRIBED',
        unsubscribedAt: new Date()
      }
    });

    logger.debug('Updated campaign recipients', { email, organizationId });
  }

  /**
   * Obtient la liste des désabonnements pour une organisation
   */
  async getUnsubscribeList(
    organizationId: string,
    options: {
      limit?: number;
      offset?: number;
      source?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}
  ): Promise<{
    unsubscribes: Array<{
      email: string;
      reason: string | null;
      source: string;
      date: Date;
      campaignId?: string;
    }>;
    total: number;
  }> {
    const {
      limit = 100,
      offset = 0,
      source,
      dateFrom,
      dateTo
    } = options;

    const where: any = {
      organizationId
    };

    if (source) {
      where.source = source;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [unsubscribes, total] = await Promise.all([
      prisma.unsubscribeList.findMany({
        where,
        select: {
          email: true,
          reason: true,
          source: true,
          createdAt: true,
          campaignId: true
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.unsubscribeList.count({ where })
    ]);

    return {
      unsubscribes: unsubscribes.map(u => ({
        email: u.email,
        reason: u.reason,
        source: u.source,
        date: u.createdAt,
        campaignId: u.campaignId || undefined
      })),
      total
    };
  }

  /**
   * Statistiques de désabonnement
   */
  async getUnsubscribeStats(organizationId: string): Promise<{
    totalUnsubscribes: number;
    recentUnsubscribes: number;
    unsubscribeRate: number;
    bySource: Record<string, number>;
    byReason: Record<string, number>;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, recent, allUnsubscribes, totalSent] = await Promise.all([
      prisma.unsubscribeList.count({
        where: { organizationId }
      }),
      prisma.unsubscribeList.count({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth }
        }
      }),
      prisma.unsubscribeList.findMany({
        where: {
          organizationId,
          createdAt: { gte: startOfMonth }
        },
        select: {
          source: true,
          reason: true
        }
      }),
      prisma.campaignRecipient.count({
        where: {
          campaign: { organizationId },
          sentAt: { gte: startOfMonth },
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
        }
      })
    ]);

    // Compter par source
    const bySource: Record<string, number> = {};
    const byReason: Record<string, number> = {};

    allUnsubscribes.forEach(u => {
      bySource[u.source] = (bySource[u.source] || 0) + 1;
      if (u.reason) {
        byReason[u.reason] = (byReason[u.reason] || 0) + 1;
      }
    });

    const unsubscribeRate = totalSent > 0 ? (recent / totalSent) * 100 : 0;

    return {
      totalUnsubscribes: total,
      recentUnsubscribes: recent,
      unsubscribeRate: Number(unsubscribeRate.toFixed(2)),
      bySource,
      byReason
    };
  }

  /**
   * Nettoie automatiquement les vieux désabonnements (optionnel)
   */
  async cleanupOldUnsubscribes(daysToKeep: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.unsubscribeList.deleteMany({
      where: {
        source: { not: 'complaint' }, // Garder les plaintes plus longtemps
        createdAt: { lt: cutoffDate }
      }
    });

    logger.info('Cleaned up old unsubscribes', {
      deletedCount: result.count,
      cutoffDate
    });

    return result.count;
  }

  /**
   * Export de la liste de désabonnement (pour conformité GDPR)
   */
  async exportUnsubscribeList(
    organizationId: string,
    format: 'csv' | 'json' = 'csv'
  ): Promise<string> {
    const unsubscribes = await prisma.unsubscribeList.findMany({
      where: { organizationId },
      select: {
        email: true,
        reason: true,
        source: true,
        createdAt: true,
        campaignId: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'json') {
      return JSON.stringify(unsubscribes, null, 2);
    }

    // Format CSV
    const headers = ['email', 'reason', 'source', 'date', 'campaignId'];
    const rows = unsubscribes.map(u => [
      u.email,
      u.reason || '',
      u.source,
      u.createdAt.toISOString(),
      u.campaignId || ''
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }

  /**
   * Génère un lien de désabonnement sécurisé
   */
  generateUnsubscribeLink(email: string, organizationId: string, campaignId?: string): string {
    // Créer un token sécurisé (à implémenter avec crypto)
    const token = Buffer.from(JSON.stringify({
      email,
      organizationId,
      campaignId,
      timestamp: Date.now()
    })).toString('base64url');

    const baseUrl = process.env.APP_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/unsubscribe?token=${token}`;
  }

  /**
   * Valide et décode un token de désabonnement
   */
  validateUnsubscribeToken(token: string): {
    valid: boolean;
    email?: string;
    organizationId?: string;
    campaignId?: string;
  } {
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64url').toString());
      const { email, organizationId, campaignId, timestamp } = decoded;

      // Vérifier que le token n'est pas trop vieux (24h)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - timestamp > maxAge) {
        return { valid: false };
      }

      return {
        valid: true,
        email,
        organizationId,
        campaignId
      };
    } catch {
      return { valid: false };
    }
  }
}

export const unsubscribeManagementService = new UnsubscribeManagementService();