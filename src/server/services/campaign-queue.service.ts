import Bull from 'bull';
import { prisma } from '@/lib/prisma';
import { emailService } from './email.service';
import { trackingService } from './tracking.service';
import { ipWarmupService } from './ip-warmup.service';
import { isBusinessHours, getNextBusinessHour, generateHumanDelay, isValidEmail } from '@/utils/helpers';
import { logger } from '@/lib/logger';
import { v4 as uuidv4 } from 'uuid';

// Redis configuration
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Create email queue
export const emailQueue = new Bull('email processing', REDIS_URL, {
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

interface SendEmailJob {
  organizationId: string;
  campaignId: string;
  recipientId: string;
  delay?: number;
}

interface ProcessCampaignJob {
  campaignId: string;
  organizationId: string;
  batchSize?: number;
}

class CampaignQueueService {
  constructor() {
    this.setupProcessors();
    this.setupEventHandlers();
  }

  private setupProcessors() {
    // Process individual email sending
    emailQueue.process('send-email', 1, async (job) => {
      const { organizationId, campaignId, recipientId } = job.data as SendEmailJob;
      return this.processSingleEmail(organizationId, campaignId, recipientId);
    });

    // Process campaign in batches
    emailQueue.process('process-campaign', 1, async (job) => {
      const { campaignId, organizationId, batchSize = 10 } = job.data as ProcessCampaignJob;
      return this.processCampaignBatch(campaignId, organizationId, batchSize);
    });
  }

  private setupEventHandlers() {
    emailQueue.on('completed', (job, result) => {
      logger.info('Email job completed', {
        jobId: job.id,
        jobName: job.name,
        result
      });
    });

    emailQueue.on('failed', (job, err) => {
      logger.error('Email job failed', {
        jobId: job.id,
        jobName: job.name,
        error: err.message
      });
    });

    emailQueue.on('stalled', (job) => {
      logger.warn('Email job stalled', {
        jobId: job.id,
        jobName: job.name
      });
    });
  }

  // Démarrer une campagne
  async startCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        recipients: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new Error('Campaign cannot be started');
    }

    // Marquer la campagne comme en cours d'envoi
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENDING',
        startedAt: new Date()
      }
    });

    // Ajouter les jobs de traitement en batch
    await this.addCampaignToQueue(campaignId, campaign.organizationId);

    logger.info('Campaign started', {
      campaignId,
      recipientCount: campaign.recipients.length
    });
  }

  // Ajouter une campagne à la queue
  private async addCampaignToQueue(campaignId: string, organizationId: string): Promise<void> {
    const delay = isBusinessHours() ? 0 : this.getDelayToBusinessHours();

    await emailQueue.add('process-campaign', {
      campaignId,
      organizationId
    }, {
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }

  // Traiter un batch de campagne
  private async processCampaignBatch(
    campaignId: string, 
    organizationId: string, 
    batchSize: number = 10
  ): Promise<void> {
    // Vérifier les limites d'envoi
    const limits = await emailService.checkSendingLimits(organizationId);
    
    if (!limits.canSendDaily) {
      logger.info('Daily limit reached, scheduling for tomorrow', { campaignId });
      await this.scheduleCampaignForTomorrow(campaignId, organizationId);
      return;
    }

    if (!limits.canSendHourly) {
      logger.info('Hourly limit reached, scheduling for next hour', { campaignId });
      await this.scheduleCampaignForNextHour(campaignId, organizationId);
      return;
    }

    // Vérifier les limites de warm-up IP
    const smtpConfig = await prisma.smtpConfiguration.findUnique({
      where: { organizationId }
    });

    if (smtpConfig?.dedicatedIp) {
      const warmupStatus = await ipWarmupService.canSendEmail(organizationId, smtpConfig.dedicatedIp);
      
      if (!warmupStatus.canSend) {
        logger.info('Warmup limit reached, scheduling appropriately', { 
          campaignId, 
          reason: warmupStatus.reason,
          recommendedDelay: warmupStatus.recommendedDelay 
        });

        if (warmupStatus.recommendedDelay) {
          await emailQueue.add('process-campaign', {
            campaignId,
            organizationId,
            batchSize
          }, { delay: warmupStatus.recommendedDelay });
        } else {
          await this.scheduleCampaignForNextHour(campaignId, organizationId);
        }
        return;
      }

      // Adapter la taille du batch selon le warm-up
      if (warmupStatus.dailyLimit && warmupStatus.todaySent !== undefined) {
        const remainingToday = warmupStatus.dailyLimit - warmupStatus.todaySent;
        batchSize = Math.min(batchSize, remainingToday, limits.remainingHourly);
      }
    }

    // Si on n'est pas en heures ouvrables, reporter
    if (!isBusinessHours()) {
      logger.info('Outside business hours, scheduling for next business hour', { campaignId });
      const delay = this.getDelayToBusinessHours();
      await emailQueue.add('process-campaign', {
        campaignId,
        organizationId,
        batchSize
      }, { delay });
      return;
    }

    // Récupérer les destinataires en attente
    const recipients = await prisma.campaignRecipient.findMany({
      where: {
        campaignId,
        status: 'PENDING'
      },
      take: Math.min(batchSize, limits.remainingHourly),
      orderBy: { createdAt: 'asc' }
    });

    if (recipients.length === 0) {
      // Campagne terminée
      await this.completeCampaign(campaignId);
      return;
    }

    logger.info('Processing campaign batch', {
      campaignId,
      batchSize: recipients.length,
      remainingDaily: limits.remainingDaily,
      remainingHourly: limits.remainingHourly
    });

    // Programmer les envois individuels avec délais humanisés
    let cumulativeDelay = 0;
    
    for (let i = 0; i < recipients.length; i++) {
      const recipient = recipients[i];
      
      // Délai humanisé progressif
      const humanDelay = generateHumanDelay(3000 + (i * 1000)); // Base 3s + 1s par email
      cumulativeDelay += humanDelay;

      // Pause longue tous les 50 emails
      if ((i + 1) % 50 === 0) {
        cumulativeDelay += 120000 + Math.random() * 180000; // 2-5 min
      }

      await emailQueue.add('send-email', {
        organizationId,
        campaignId,
        recipientId: recipient.id
      }, {
        delay: cumulativeDelay,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      });
    }

    // Programmer le prochain batch
    const nextBatchDelay = cumulativeDelay + 60000; // 1 minute après le dernier email
    await emailQueue.add('process-campaign', {
      campaignId,
      organizationId,
      batchSize
    }, { delay: nextBatchDelay });
  }

  // Traiter un email individuel
  private async processSingleEmail(
    organizationId: string,
    campaignId: string,
    recipientId: string
  ): Promise<boolean> {
    try {
      const recipient = await prisma.campaignRecipient.findUnique({
        where: { id: recipientId },
        include: {
          campaign: {
            include: {
              template: true,
              organization: true
            }
          }
        }
      });

      if (!recipient) {
        throw new Error('Recipient not found');
      }

      if (recipient.status !== 'PENDING') {
        logger.info('Recipient already processed', { recipientId, status: recipient.status });
        return true;
      }

      // Vérifier si l'email est dans la liste de désabonnement
      const unsubscribed = await prisma.unsubscribeList.findFirst({
        where: {
          email: recipient.email,
          OR: [
            { organizationId: null }, // Global unsubscribe
            { organizationId }
          ]
        }
      });

      if (unsubscribed) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'UNSUBSCRIBED',
            lastError: 'Email in unsubscribe list'
          }
        });
        return true;
      }

      // Vérifier les bounces précédents
      const bounced = await prisma.bounceList.findFirst({
        where: {
          email: recipient.email,
          bounceType: 'hard',
          OR: [
            { organizationId: null },
            { organizationId }
          ]
        }
      });

      if (bounced) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'BOUNCED',
            bouncedAt: new Date(),
            lastError: `Previous hard bounce: ${bounced.bounceReason}`
          }
        });
        return true;
      }

      // Valider l'adresse email
      if (!isValidEmail(recipient.email)) {
        await prisma.campaignRecipient.update({
          where: { id: recipientId },
          data: {
            status: 'FAILED',
            lastError: 'Invalid email format'
          }
        });
        return false;
      }

      // Marquer comme en cours d'envoi
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'SENDING',
          sendAttempts: { increment: 1 },
          lastAttemptAt: new Date()
        }
      });

      // Préparer les données de personnalisation
      const personalData = {
        firstName: recipient.firstName || '',
        lastName: recipient.lastName || '',
        email: recipient.email,
        ...(recipient.customData as any || {})
      };

      // Envoyer l'email avec variations de contenu
      const result = await emailService.sendEmail({
        to: recipient.email,
        subject: recipient.campaign.subject,
        html: recipient.campaign.body,
        plainText: recipient.campaign.plainTextBody || undefined,
        recipientData: personalData,
        trackingId: recipient.trackingId,
        organizationId,
        campaignId,
        useContentVariation: true // Activer les variations pour éviter les filtres spam
      });

      // Enregistrer l'envoi dans le warm-up si applicable
      const smtpConfig = await prisma.smtpConfiguration.findUnique({
        where: { organizationId }
      });

      if (smtpConfig?.dedicatedIp) {
        await ipWarmupService.recordEmailSent(
          organizationId,
          smtpConfig.dedicatedIp,
          recipient.email
        );
      }

      // Mettre à jour le statut
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          messageId: result.messageId
        }
      });

      // Mettre à jour les stats de la campagne
      await prisma.campaign.update({
        where: { id: campaignId },
        data: {
          sentCount: { increment: 1 }
        }
      });

      logger.info('Email sent successfully', {
        recipientId,
        recipientEmail: recipient.email,
        campaignId,
        messageId: result.messageId
      });

      return true;
    } catch (error) {
      // Marquer comme échoué
      await prisma.campaignRecipient.update({
        where: { id: recipientId },
        data: {
          status: 'FAILED',
          lastError: error.message
        }
      });

      logger.error('Failed to send email', {
        recipientId,
        campaignId,
        error: error.message
      });

      throw error;
    }
  }

  // Compléter une campagne
  private async completeCampaign(campaignId: string): Promise<void> {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'SENT',
        completedAt: new Date()
      }
    });

    logger.info('Campaign completed', { campaignId });
  }

  // Programmer une campagne pour demain
  private async scheduleCampaignForTomorrow(campaignId: string, organizationId: string): Promise<void> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // 9h demain

    const delay = tomorrow.getTime() - Date.now();

    await emailQueue.add('process-campaign', {
      campaignId,
      organizationId
    }, { delay });
  }

  // Programmer une campagne pour la prochaine heure
  private async scheduleCampaignForNextHour(campaignId: string, organizationId: string): Promise<void> {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    const delay = nextHour.getTime() - Date.now();

    await emailQueue.add('process-campaign', {
      campaignId,
      organizationId
    }, { delay });
  }

  // Calculer le délai jusqu'aux prochaines heures ouvrables
  private getDelayToBusinessHours(): number {
    const nextBusinessHour = getNextBusinessHour();
    return nextBusinessHour.getTime() - Date.now();
  }

  // Mettre en pause une campagne
  async pauseCampaign(campaignId: string): Promise<void> {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'PAUSED' }
    });

    // Annuler les jobs en attente pour cette campagne
    const jobs = await emailQueue.getJobs(['waiting', 'delayed']);
    for (const job of jobs) {
      if (job.data.campaignId === campaignId) {
        await job.remove();
      }
    }

    logger.info('Campaign paused', { campaignId });
  }

  // Reprendre une campagne
  async resumeCampaign(campaignId: string): Promise<void> {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) {
      throw new Error('Campaign not found');
    }

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'SENDING' }
    });

    // Relancer le traitement
    await this.addCampaignToQueue(campaignId, campaign.organizationId);

    logger.info('Campaign resumed', { campaignId });
  }

  // Obtenir les statistiques de la queue
  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      emailQueue.getWaiting(),
      emailQueue.getActive(),
      emailQueue.getCompleted(),
      emailQueue.getFailed(),
      emailQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
    };
  }
}

export const campaignQueueService = new CampaignQueueService();