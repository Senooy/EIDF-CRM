import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { isBusinessHours, getNextBusinessHour } from '@/utils/helpers';

interface WarmupScheduleConfig {
  organizationId: string;
  ipAddress: string;
  startDate: Date;
  totalDuration: number; // En jours
  maxDailyVolume: number; // Volume final souhaité
  growthPattern: 'linear' | 'exponential' | 'conservative';
}

interface DailyWarmupTarget {
  day: number;
  maxEmails: number;
  recommendedDistribution: {
    gmail: number;
    outlook: number;
    yahoo: number;
    other: number;
  };
}

class IpWarmupService {
  /**
   * Crée un schedule de warm-up pour une nouvelle IP
   */
  async createWarmupSchedule(config: WarmupScheduleConfig): Promise<string> {
    try {
      // Vérifier si un warm-up existe déjà pour cette IP
      const existing = await prisma.ipWarmupSchedule.findFirst({
        where: {
          organizationId: config.organizationId,
          ipAddress: config.ipAddress,
          status: { in: ['ACTIVE', 'SCHEDULED'] }
        }
      });

      if (existing) {
        throw new Error(`Warm-up already exists for IP ${config.ipAddress}`);
      }

      // Générer le schedule jour par jour
      const dailyTargets = this.generateDailyTargets(config);
      
      // Créer le schedule principal
      const schedule = await prisma.ipWarmupSchedule.create({
        data: {
          organizationId: config.organizationId,
          ipAddress: config.ipAddress,
          startDate: config.startDate,
          endDate: new Date(config.startDate.getTime() + (config.totalDuration * 24 * 60 * 60 * 1000)),
          totalDuration: config.totalDuration,
          maxDailyVolume: config.maxDailyVolume,
          growthPattern: config.growthPattern,
          status: 'SCHEDULED',
          currentDay: 0,
          emailsSentToday: 0,
          totalEmailsSent: 0,
          dailyTargets: JSON.stringify(dailyTargets),
          lastEmailSentAt: null
        }
      });

      logger.info('IP warmup schedule created', {
        scheduleId: schedule.id,
        ipAddress: config.ipAddress,
        duration: config.totalDuration,
        maxVolume: config.maxDailyVolume
      });

      return schedule.id;
    } catch (error) {
      logger.error('Failed to create warmup schedule', {
        config,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Génère les objectifs quotidiens de warm-up
   */
  private generateDailyTargets(config: WarmupScheduleConfig): DailyWarmupTarget[] {
    const targets: DailyWarmupTarget[] = [];
    const { totalDuration, maxDailyVolume, growthPattern } = config;

    for (let day = 1; day <= totalDuration; day++) {
      let maxEmails: number;

      switch (growthPattern) {
        case 'linear':
          maxEmails = Math.floor((day / totalDuration) * maxDailyVolume);
          break;
        
        case 'exponential':
          // Croissance exponentielle douce
          const factor = Math.pow(day / totalDuration, 1.5);
          maxEmails = Math.floor(factor * maxDailyVolume);
          break;
        
        case 'conservative':
        default:
          // Approche conservative recommandée
          if (day <= 7) {
            maxEmails = Math.min(50 + (day - 1) * 25, 200); // J1: 50, J7: 200
          } else if (day <= 14) {
            maxEmails = 200 + (day - 7) * 50; // J8-14: 250-550
          } else if (day <= 21) {
            maxEmails = 550 + (day - 14) * 100; // J15-21: 650-1250
          } else if (day <= 30) {
            maxEmails = 1250 + (day - 21) * 150; // J22-30: 1400-2600
          } else {
            maxEmails = Math.min(2600 + (day - 30) * 200, maxDailyVolume);
          }
          break;
      }

      // S'assurer qu'on ne dépasse pas le maximum
      maxEmails = Math.min(maxEmails, maxDailyVolume);

      // Distribution recommandée par provider
      const recommendedDistribution = this.calculateProviderDistribution(day, maxEmails);

      targets.push({
        day,
        maxEmails,
        recommendedDistribution
      });
    }

    return targets;
  }

  /**
   * Calcule la distribution recommandée par provider email
   */
  private calculateProviderDistribution(day: number, totalEmails: number) {
    // Commencer avec Gmail (plus tolérant) puis diversifier
    if (day <= 7) {
      return {
        gmail: Math.floor(totalEmails * 0.6),
        outlook: Math.floor(totalEmails * 0.25),
        yahoo: Math.floor(totalEmails * 0.1),
        other: Math.floor(totalEmails * 0.05)
      };
    } else if (day <= 14) {
      return {
        gmail: Math.floor(totalEmails * 0.5),
        outlook: Math.floor(totalEmails * 0.3),
        yahoo: Math.floor(totalEmails * 0.15),
        other: Math.floor(totalEmails * 0.05)
      };
    } else {
      return {
        gmail: Math.floor(totalEmails * 0.4),
        outlook: Math.floor(totalEmails * 0.35),
        yahoo: Math.floor(totalEmails * 0.2),
        other: Math.floor(totalEmails * 0.05)
      };
    }
  }

  /**
   * Vérifie si on peut envoyer un email selon le warm-up
   */
  async canSendEmail(organizationId: string, ipAddress: string): Promise<{
    canSend: boolean;
    reason?: string;
    recommendedDelay?: number;
    dailyLimit?: number;
    todaySent?: number;
  }> {
    try {
      const schedule = await prisma.ipWarmupSchedule.findFirst({
        where: {
          organizationId,
          ipAddress,
          status: 'ACTIVE'
        }
      });

      if (!schedule) {
        // Pas de warm-up actif, on peut envoyer normalement
        return { canSend: true };
      }

      // Calculer le jour actuel du warm-up
      const daysSinceStart = Math.floor(
        (Date.now() - schedule.startDate.getTime()) / (24 * 60 * 60 * 1000)
      ) + 1;

      if (daysSinceStart > schedule.totalDuration) {
        // Warm-up terminé, marquer comme complété
        await this.completeWarmup(schedule.id);
        return { canSend: true };
      }

      // Vérifier si on a changé de jour
      if (daysSinceStart > schedule.currentDay) {
        await this.updateDailyProgress(schedule.id, daysSinceStart);
        schedule.currentDay = daysSinceStart;
        schedule.emailsSentToday = 0;
      }

      // Récupérer les objectifs du jour
      const dailyTargets: DailyWarmupTarget[] = JSON.parse(schedule.dailyTargets || '[]');
      const todayTarget = dailyTargets.find(t => t.day === daysSinceStart);

      if (!todayTarget) {
        return {
          canSend: false,
          reason: 'No target defined for current day'
        };
      }

      // Vérifier si on a atteint la limite quotidienne
      if (schedule.emailsSentToday >= todayTarget.maxEmails) {
        const nextBusinessHour = getNextBusinessHour();
        const recommendedDelay = nextBusinessHour.getTime() - Date.now();

        return {
          canSend: false,
          reason: 'Daily warmup limit reached',
          recommendedDelay,
          dailyLimit: todayTarget.maxEmails,
          todaySent: schedule.emailsSentToday
        };
      }

      // Vérifier les heures d'envoi (recommandé pendant les heures ouvrables)
      if (!isBusinessHours()) {
        const nextBusinessHour = getNextBusinessHour();
        const recommendedDelay = nextBusinessHour.getTime() - Date.now();

        return {
          canSend: false,
          reason: 'Outside business hours during warmup',
          recommendedDelay
        };
      }

      return {
        canSend: true,
        dailyLimit: todayTarget.maxEmails,
        todaySent: schedule.emailsSentToday
      };

    } catch (error) {
      logger.error('Error checking warmup status', {
        organizationId,
        ipAddress,
        error: error.message
      });
      return { canSend: true }; // En cas d'erreur, on permet l'envoi
    }
  }

  /**
   * Enregistre l'envoi d'un email dans le warm-up
   */
  async recordEmailSent(
    organizationId: string, 
    ipAddress: string, 
    recipientEmail: string
  ): Promise<void> {
    try {
      const schedule = await prisma.ipWarmupSchedule.findFirst({
        where: {
          organizationId,
          ipAddress,
          status: 'ACTIVE'
        }
      });

      if (!schedule) {
        return; // Pas de warm-up actif
      }

      // Déterminer le provider du destinataire
      const provider = this.getEmailProvider(recipientEmail);

      // Mettre à jour les compteurs
      await prisma.ipWarmupSchedule.update({
        where: { id: schedule.id },
        data: {
          emailsSentToday: { increment: 1 },
          totalEmailsSent: { increment: 1 },
          lastEmailSentAt: new Date(),
          ...(provider === 'gmail' && { gmailSentToday: { increment: 1 } }),
          ...(provider === 'outlook' && { outlookSentToday: { increment: 1 } }),
          ...(provider === 'yahoo' && { yahooSentToday: { increment: 1 } })
        }
      });

      logger.debug('Warmup email recorded', {
        scheduleId: schedule.id,
        recipientEmail,
        provider,
        todayCount: schedule.emailsSentToday + 1
      });

    } catch (error) {
      logger.error('Error recording warmup email', {
        organizationId,
        ipAddress,
        recipientEmail,
        error: error.message
      });
    }
  }

  /**
   * Détermine le provider email
   */
  private getEmailProvider(email: string): string {
    const domain = email.toLowerCase().split('@')[1];
    
    if (['gmail.com', 'googlemail.com'].includes(domain)) {
      return 'gmail';
    } else if (['outlook.com', 'hotmail.com', 'live.com', 'msn.com'].includes(domain)) {
      return 'outlook';
    } else if (['yahoo.com', 'yahoo.fr', 'ymail.com'].includes(domain)) {
      return 'yahoo';
    } else {
      return 'other';
    }
  }

  /**
   * Met à jour le progrès quotidien
   */
  private async updateDailyProgress(scheduleId: string, newDay: number): Promise<void> {
    await prisma.ipWarmupSchedule.update({
      where: { id: scheduleId },
      data: {
        currentDay: newDay,
        emailsSentToday: 0,
        gmailSentToday: 0,
        outlookSentToday: 0,
        yahooSentToday: 0
      }
    });
  }

  /**
   * Complète le warm-up
   */
  private async completeWarmup(scheduleId: string): Promise<void> {
    await prisma.ipWarmupSchedule.update({
      where: { id: scheduleId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date()
      }
    });

    logger.info('IP warmup completed', { scheduleId });
  }

  /**
   * Obtient le statut du warm-up pour une IP
   */
  async getWarmupStatus(organizationId: string, ipAddress: string): Promise<{
    active: boolean;
    schedule?: {
      id: string;
      currentDay: number;
      totalDuration: number;
      todayTarget: number;
      todaySent: number;
      remainingToday: number;
      progress: number;
      providerDistribution: {
        gmail: number;
        outlook: number;
        yahoo: number;
        other: number;
      };
    };
  }> {
    const schedule = await prisma.ipWarmupSchedule.findFirst({
      where: {
        organizationId,
        ipAddress,
        status: 'ACTIVE'
      }
    });

    if (!schedule) {
      return { active: false };
    }

    const dailyTargets: DailyWarmupTarget[] = JSON.parse(schedule.dailyTargets || '[]');
    const todayTarget = dailyTargets.find(t => t.day === schedule.currentDay);
    const progress = (schedule.currentDay / schedule.totalDuration) * 100;

    return {
      active: true,
      schedule: {
        id: schedule.id,
        currentDay: schedule.currentDay,
        totalDuration: schedule.totalDuration,
        todayTarget: todayTarget?.maxEmails || 0,
        todaySent: schedule.emailsSentToday,
        remainingToday: Math.max(0, (todayTarget?.maxEmails || 0) - schedule.emailsSentToday),
        progress: Math.round(progress),
        providerDistribution: {
          gmail: schedule.gmailSentToday || 0,
          outlook: schedule.outlookSentToday || 0,
          yahoo: schedule.yahooSentToday || 0,
          other: schedule.emailsSentToday - (schedule.gmailSentToday || 0) - (schedule.outlookSentToday || 0) - (schedule.yahooSentToday || 0)
        }
      }
    };
  }

  /**
   * Met en pause un warm-up
   */
  async pauseWarmup(scheduleId: string): Promise<void> {
    await prisma.ipWarmupSchedule.update({
      where: { id: scheduleId },
      data: { status: 'PAUSED' }
    });

    logger.info('IP warmup paused', { scheduleId });
  }

  /**
   * Reprend un warm-up
   */
  async resumeWarmup(scheduleId: string): Promise<void> {
    await prisma.ipWarmupSchedule.update({
      where: { id: scheduleId },
      data: { status: 'ACTIVE' }
    });

    logger.info('IP warmup resumed', { scheduleId });
  }

  /**
   * Obtient les statistiques de warm-up pour toutes les IPs d'une organisation
   */
  async getOrganizationWarmupStats(organizationId: string): Promise<{
    activeSchedules: number;
    completedSchedules: number;
    totalIpsWarmedUp: number;
    averageWarmupDuration: number;
  }> {
    const [active, completed, all] = await Promise.all([
      prisma.ipWarmupSchedule.count({
        where: { organizationId, status: 'ACTIVE' }
      }),
      prisma.ipWarmupSchedule.count({
        where: { organizationId, status: 'COMPLETED' }
      }),
      prisma.ipWarmupSchedule.findMany({
        where: { organizationId, status: 'COMPLETED' },
        select: { totalDuration: true }
      })
    ]);

    const averageDuration = all.length > 0 
      ? all.reduce((sum, s) => sum + s.totalDuration, 0) / all.length 
      : 0;

    return {
      activeSchedules: active,
      completedSchedules: completed,
      totalIpsWarmedUp: completed,
      averageWarmupDuration: Math.round(averageDuration)
    };
  }

  /**
   * Génère un rapport de recommandations pour le warm-up
   */
  async generateWarmupRecommendations(organizationId: string): Promise<{
    recommendations: string[];
    riskFactors: string[];
    nextSteps: string[];
  }> {
    const stats = await this.getOrganizationWarmupStats(organizationId);
    
    const recommendations: string[] = [];
    const riskFactors: string[] = [];
    const nextSteps: string[] = [];

    // Analyser et générer des recommandations
    if (stats.activeSchedules === 0) {
      recommendations.push("Considérez le warm-up IP pour améliorer la délivrabilité");
      nextSteps.push("Configurer un schedule de warm-up pour vos nouvelles IPs");
    }

    if (stats.averageWarmupDuration < 30) {
      riskFactors.push("Durée de warm-up possiblement trop courte");
      recommendations.push("Prolonger la durée de warm-up à 30-45 jours minimum");
    }

    // Vérifications supplémentaires
    const recentBounces = await prisma.bounceList.count({
      where: {
        organizationId,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    if (recentBounces > 10) {
      riskFactors.push(`${recentBounces} bounces dans les 7 derniers jours`);
      recommendations.push("Nettoyer la liste d'emails avant le warm-up");
    }

    if (recommendations.length === 0) {
      recommendations.push("Votre configuration de warm-up semble optimale");
    }

    return {
      recommendations,
      riskFactors,
      nextSteps
    };
  }
}

export const ipWarmupService = new IpWarmupService();