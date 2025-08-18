import { prisma } from '@/lib/prisma';
import { trackingService } from './tracking.service';
import { logger } from '@/lib/logger';

interface BounceNotification {
  messageId: string;
  email: string;
  bounceType: 'hard' | 'soft' | 'complaint';
  bounceReason: string;
  timestamp: Date;
}

interface WebhookBounceData {
  // SendGrid format
  sg_message_id?: string;
  email?: string;
  event?: string;
  reason?: string;
  
  // Amazon SES format
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      diagnosticCode: string;
    }>;
  };
  mail?: {
    messageId: string;
    commonHeaders: {
      to: string[];
    };
  };
  
  // Mailgun format
  'Message-Id'?: string;
  recipient?: string;
  event?: string;
  severity?: string;
  'delivery-status'?: {
    message: string;
  };
}

class BounceManagementService {
  /**
   * Traite les notifications de bounce depuis les webhooks
   */
  async processBounceWebhook(
    provider: 'sendgrid' | 'ses' | 'mailgun' | 'postfix',
    webhookData: WebhookBounceData
  ): Promise<boolean> {
    try {
      let bounceNotification: BounceNotification;

      switch (provider) {
        case 'sendgrid':
          bounceNotification = this.parseSendGridBounce(webhookData);
          break;
        case 'ses':
          bounceNotification = this.parseSesBounce(webhookData);
          break;
        case 'mailgun':
          bounceNotification = this.parseMailgunBounce(webhookData);
          break;
        case 'postfix':
          bounceNotification = this.parsePostfixBounce(webhookData);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return await this.processBounce(bounceNotification);
    } catch (error) {
      logger.error('Failed to process bounce webhook', {
        provider,
        webhookData,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Traite une notification de bounce
   */
  async processBounce(bounceData: BounceNotification): Promise<boolean> {
    try {
      // Utiliser le service de tracking pour enregistrer le bounce
      const success = await trackingService.trackBounce(
        bounceData.messageId,
        bounceData.bounceType,
        bounceData.bounceReason
      );

      if (success) {
        // Actions supplémentaires selon le type de bounce
        if (bounceData.bounceType === 'hard') {
          await this.handleHardBounce(bounceData);
        } else if (bounceData.bounceType === 'complaint') {
          await this.handleComplaint(bounceData);
        }

        logger.info('Bounce processed successfully', {
          email: bounceData.email,
          bounceType: bounceData.bounceType,
          messageId: bounceData.messageId
        });
      }

      return success;
    } catch (error) {
      logger.error('Failed to process bounce', {
        bounceData,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Gère les hard bounces
   */
  private async handleHardBounce(bounceData: BounceNotification): Promise<void> {
    // Marquer l'email comme définitivement invalide
    await prisma.bounceList.upsert({
      where: {
        organizationId_email: {
          organizationId: null, // Global pour tous les organisations
          email: bounceData.email
        }
      },
      update: {
        bounceCount: { increment: 1 },
        lastBounceAt: bounceData.timestamp,
        bounceReason: bounceData.bounceReason
      },
      create: {
        organizationId: null,
        email: bounceData.email,
        bounceType: 'hard',
        bounceReason: bounceData.bounceReason,
        bounceCount: 1,
        firstBounceAt: bounceData.timestamp,
        lastBounceAt: bounceData.timestamp
      }
    });

    // Annuler tous les emails en attente pour cette adresse
    await this.cancelPendingEmailsForAddress(bounceData.email);

    logger.info('Hard bounce processed', {
      email: bounceData.email,
      reason: bounceData.bounceReason
    });
  }

  /**
   * Gère les plaintes (spam reports)
   */
  private async handleComplaint(bounceData: BounceNotification): Promise<void> {
    // Ajouter automatiquement à la liste de désabonnement
    await prisma.unsubscribeList.upsert({
      where: {
        organizationId_email: {
          organizationId: null, // Global
          email: bounceData.email
        }
      },
      update: {
        reason: `Complaint: ${bounceData.bounceReason}`,
        source: 'complaint'
      },
      create: {
        organizationId: null,
        email: bounceData.email,
        reason: `Complaint: ${bounceData.bounceReason}`,
        source: 'complaint'
      }
    });

    // Annuler tous les emails en attente
    await this.cancelPendingEmailsForAddress(bounceData.email);

    logger.warn('Complaint processed - email unsubscribed', {
      email: bounceData.email,
      reason: bounceData.bounceReason
    });
  }

  /**
   * Annule tous les emails en attente pour une adresse
   */
  private async cancelPendingEmailsForAddress(email: string): Promise<void> {
    await prisma.campaignRecipient.updateMany({
      where: {
        email,
        status: { in: ['PENDING', 'SCHEDULED'] }
      },
      data: {
        status: 'CANCELLED',
        lastError: 'Cancelled due to bounce/complaint'
      }
    });

    logger.info('Cancelled pending emails', { email });
  }

  /**
   * Parse bounce data from SendGrid
   */
  private parseSendGridBounce(data: WebhookBounceData): BounceNotification {
    const bounceType = data.event === 'bounce' ? 'hard' : 
                      data.event === 'dropped' ? 'soft' : 'complaint';

    return {
      messageId: data.sg_message_id || '',
      email: data.email || '',
      bounceType,
      bounceReason: data.reason || 'Unknown',
      timestamp: new Date()
    };
  }

  /**
   * Parse bounce data from Amazon SES
   */
  private parseSesBounce(data: WebhookBounceData): BounceNotification {
    const bounce = data.bounce;
    const mail = data.mail;

    if (!bounce || !mail) {
      throw new Error('Invalid SES bounce data format');
    }

    const bounceType = bounce.bounceType === 'Permanent' ? 'hard' : 'soft';
    const recipient = bounce.bouncedRecipients[0];

    return {
      messageId: mail.messageId,
      email: recipient.emailAddress,
      bounceType,
      bounceReason: recipient.diagnosticCode || bounce.bounceSubType,
      timestamp: new Date()
    };
  }

  /**
   * Parse bounce data from Mailgun
   */
  private parseMailgunBounce(data: WebhookBounceData): BounceNotification {
    const bounceType = data.severity === 'permanent' ? 'hard' : 'soft';

    return {
      messageId: data['Message-Id'] || '',
      email: data.recipient || '',
      bounceType,
      bounceReason: data['delivery-status']?.message || 'Unknown',
      timestamp: new Date()
    };
  }

  /**
   * Parse bounce data from Postfix logs
   */
  private parsePostfixBounce(data: WebhookBounceData): BounceNotification {
    // Format personnalisé pour les logs Postfix
    return {
      messageId: data.messageId || '',
      email: data.email || '',
      bounceType: data.bounceType as 'hard' | 'soft' | 'complaint' || 'hard',
      bounceReason: data.reason || 'Unknown',
      timestamp: new Date()
    };
  }

  /**
   * Nettoie automatiquement les vieilles entrées de bounce
   */
  async cleanupOldBounces(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await prisma.bounceList.deleteMany({
      where: {
        bounceType: 'soft', // Garder les hard bounces plus longtemps
        lastBounceAt: {
          lt: cutoffDate
        }
      }
    });

    logger.info('Cleaned up old soft bounces', {
      deletedCount: result.count,
      cutoffDate
    });

    return result.count;
  }

  /**
   * Obtient les statistiques de bounces pour une organisation
   */
  async getBounceStats(organizationId: string): Promise<{
    hardBounces: number;
    softBounces: number;
    complaints: number;
    recentBounces: number;
    bounceRate: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [hardBounces, softBounces, complaints, recentBounces, totalSent] = await Promise.all([
      prisma.bounceList.count({
        where: {
          organizationId,
          bounceType: 'hard'
        }
      }),
      prisma.bounceList.count({
        where: {
          organizationId,
          bounceType: 'soft'
        }
      }),
      prisma.bounceList.count({
        where: {
          organizationId,
          bounceType: 'complaint'
        }
      }),
      prisma.bounceList.count({
        where: {
          organizationId,
          lastBounceAt: {
            gte: startOfMonth
          }
        }
      }),
      prisma.campaignRecipient.count({
        where: {
          campaign: { organizationId },
          sentAt: {
            gte: startOfMonth
          },
          status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
        }
      })
    ]);

    const bounceRate = totalSent > 0 ? (recentBounces / totalSent) * 100 : 0;

    return {
      hardBounces,
      softBounces,
      complaints,
      recentBounces,
      bounceRate: Number(bounceRate.toFixed(2))
    };
  }

  /**
   * Vérifie si une adresse email doit être évitée
   */
  async shouldSkipEmail(email: string, organizationId: string): Promise<{
    skip: boolean;
    reason?: string;
  }> {
    // Vérifier les hard bounces
    const hardBounce = await prisma.bounceList.findFirst({
      where: {
        email,
        bounceType: 'hard',
        OR: [
          { organizationId: null }, // Global
          { organizationId }
        ]
      }
    });

    if (hardBounce) {
      return {
        skip: true,
        reason: `Hard bounce: ${hardBounce.bounceReason}`
      };
    }

    // Vérifier les désabonnements
    const unsubscribed = await prisma.unsubscribeList.findFirst({
      where: {
        email,
        OR: [
          { organizationId: null },
          { organizationId }
        ]
      }
    });

    if (unsubscribed) {
      return {
        skip: true,
        reason: `Unsubscribed: ${unsubscribed.reason || 'User request'}`
      };
    }

    // Vérifier les soft bounces répétés (plus de 5 en 30 jours)
    const recentSoftBounces = await prisma.bounceList.findFirst({
      where: {
        email,
        bounceType: 'soft',
        bounceCount: { gte: 5 },
        lastBounceAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 jours
        },
        OR: [
          { organizationId: null },
          { organizationId }
        ]
      }
    });

    if (recentSoftBounces) {
      return {
        skip: true,
        reason: `Too many soft bounces: ${recentSoftBounces.bounceCount}`
      };
    }

    return { skip: false };
  }
}

export const bounceManagementService = new BounceManagementService();