import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || 'http://localhost:3001';

export function generateTrackingPixel(trackingId: string): string {
  const pixelUrl = `${TRACKING_BASE_URL}/api/tracking/open/${trackingId}`;
  return `<img src="${pixelUrl}" width="1" height="1" style="display: none;" alt="" />`;
}

export function generateClickTrackingLink(trackingId: string, originalUrl: string): string {
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${TRACKING_BASE_URL}/api/tracking/click/${trackingId}?url=${encodedUrl}`;
}

class TrackingService {
  async trackOpen(trackingId: string, userAgent?: string, ipAddress?: string): Promise<boolean> {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { trackingId },
        include: { campaign: true }
      });

      if (!recipient) {
        logger.warn('Tracking open: recipient not found', { trackingId });
        return false;
      }

      // Éviter les ouvertures multiples du même recipient
      if (recipient.openedAt) {
        logger.debug('Email already marked as opened', { trackingId });
        return true; // Considérer comme succès mais ne pas dupliquer
      }

      const now = new Date();

      // Mettre à jour le recipient
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'OPENED',
          openedAt: now,
          firstOpenedAt: now
        }
      });

      // Enregistrer l'activité
      await prisma.campaignActivity.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          action: 'opened',
          timestamp: now,
          userAgent,
          ipAddress
        }
      });

      // Mettre à jour les stats de la campagne
      await prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: {
          openedCount: { increment: 1 }
        }
      });

      logger.info('Email open tracked', {
        trackingId,
        recipientEmail: recipient.email,
        campaignId: recipient.campaignId
      });

      return true;
    } catch (error) {
      logger.error('Failed to track email open', {
        trackingId,
        error: error.message
      });
      return false;
    }
  }

  async trackClick(
    trackingId: string, 
    originalUrl: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<{ success: boolean; redirectUrl: string }> {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { trackingId },
        include: { campaign: true }
      });

      if (!recipient) {
        logger.warn('Tracking click: recipient not found', { trackingId });
        return { success: false, redirectUrl: originalUrl };
      }

      const now = new Date();

      // Marquer comme cliqué si pas déjà fait
      if (!recipient.clickedAt) {
        await prisma.campaignRecipient.update({
          where: { id: recipient.id },
          data: {
            status: 'CLICKED',
            clickedAt: now,
            firstClickedAt: now
          }
        });

        // Mettre à jour les stats de la campagne
        await prisma.campaign.update({
          where: { id: recipient.campaignId },
          data: {
            clickedCount: { increment: 1 }
          }
        });
      }

      // Enregistrer l'activité (même si déjà cliqué avant)
      await prisma.campaignActivity.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          action: 'clicked',
          timestamp: now,
          userAgent,
          ipAddress,
          linkUrl: originalUrl
        }
      });

      logger.info('Email click tracked', {
        trackingId,
        recipientEmail: recipient.email,
        campaignId: recipient.campaignId,
        linkUrl: originalUrl
      });

      return { success: true, redirectUrl: originalUrl };
    } catch (error) {
      logger.error('Failed to track email click', {
        trackingId,
        originalUrl,
        error: error.message
      });
      return { success: false, redirectUrl: originalUrl };
    }
  }

  async trackUnsubscribe(
    trackingId: string,
    reason?: string,
    userAgent?: string,
    ipAddress?: string
  ): Promise<boolean> {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { trackingId },
        include: { campaign: true }
      });

      if (!recipient) {
        logger.warn('Tracking unsubscribe: recipient not found', { trackingId });
        return false;
      }

      const now = new Date();

      // Mettre à jour le recipient
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'UNSUBSCRIBED',
          unsubscribedAt: now
        }
      });

      // Ajouter à la liste de désabonnement
      await prisma.unsubscribeList.upsert({
        where: {
          organizationId_email: {
            organizationId: recipient.campaign.organizationId,
            email: recipient.email
          }
        },
        update: {
          reason,
          source: 'campaign',
          campaignId: recipient.campaignId
        },
        create: {
          organizationId: recipient.campaign.organizationId,
          email: recipient.email,
          reason,
          source: 'campaign',
          campaignId: recipient.campaignId
        }
      });

      // Enregistrer l'activité
      await prisma.campaignActivity.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          action: 'unsubscribed',
          timestamp: now,
          userAgent,
          ipAddress
        }
      });

      // Mettre à jour les stats de la campagne
      await prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: {
          unsubscribedCount: { increment: 1 }
        }
      });

      logger.info('Email unsubscribe tracked', {
        trackingId,
        recipientEmail: recipient.email,
        campaignId: recipient.campaignId,
        reason
      });

      return true;
    } catch (error) {
      logger.error('Failed to track unsubscribe', {
        trackingId,
        error: error.message
      });
      return false;
    }
  }

  async trackBounce(
    messageId: string,
    bounceType: 'hard' | 'soft' | 'complaint',
    bounceReason: string
  ): Promise<boolean> {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { messageId },
        include: { campaign: true }
      });

      if (!recipient) {
        logger.warn('Tracking bounce: recipient not found', { messageId });
        return false;
      }

      const now = new Date();

      // Mettre à jour le recipient
      await prisma.campaignRecipient.update({
        where: { id: recipient.id },
        data: {
          status: 'BOUNCED',
          bouncedAt: now,
          lastError: bounceReason
        }
      });

      // Ajouter à la liste de bounces
      await prisma.bounceList.upsert({
        where: {
          organizationId_email: {
            organizationId: recipient.campaign.organizationId,
            email: recipient.email
          }
        },
        update: {
          bounceType,
          bounceReason,
          bounceCount: { increment: 1 },
          lastBounceAt: now
        },
        create: {
          organizationId: recipient.campaign.organizationId,
          email: recipient.email,
          bounceType,
          bounceReason,
          bounceCount: 1,
          firstBounceAt: now,
          lastBounceAt: now
        }
      });

      // Enregistrer l'activité
      await prisma.campaignActivity.create({
        data: {
          campaignId: recipient.campaignId,
          recipientId: recipient.id,
          action: 'bounced',
          timestamp: now
        }
      });

      // Mettre à jour les stats de la campagne
      await prisma.campaign.update({
        where: { id: recipient.campaignId },
        data: {
          bouncedCount: { increment: 1 }
        }
      });

      logger.info('Email bounce tracked', {
        messageId,
        recipientEmail: recipient.email,
        campaignId: recipient.campaignId,
        bounceType,
        bounceReason
      });

      return true;
    } catch (error) {
      logger.error('Failed to track bounce', {
        messageId,
        bounceType,
        bounceReason,
        error: error.message
      });
      return false;
    }
  }

  // Générer des statistiques en temps réel
  async getCampaignStats(campaignId: string): Promise<{
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    bounced: number;
    unsubscribed: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        _count: {
          select: {
            recipients: {
              where: { status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] } }
            }
          }
        }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    const stats = {
      sent: campaign.sentCount,
      delivered: campaign.deliveredCount,
      opened: campaign.openedCount,
      clicked: campaign.clickedCount,
      bounced: campaign.bouncedCount,
      unsubscribed: campaign.unsubscribedCount,
      openRate: campaign.sentCount > 0 ? (campaign.openedCount / campaign.sentCount) * 100 : 0,
      clickRate: campaign.sentCount > 0 ? (campaign.clickedCount / campaign.sentCount) * 100 : 0,
      bounceRate: campaign.sentCount > 0 ? (campaign.bouncedCount / campaign.sentCount) * 100 : 0,
    };

    return stats;
  }
}

export const trackingService = new TrackingService();