import nodemailer from 'nodemailer';
import Mail from 'nodemailer/lib/mailer';
import { prisma } from '@/lib/prisma';
import { generateTrackingPixel, generateClickTrackingLink } from './tracking.service';
import { templateVariationService } from './template-variation.service';
import Handlebars from 'handlebars';
import { convert } from 'html-to-text';
import { randomBetween, sleep } from '@/utils/helpers';
import { logger } from '@/lib/logger';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  plainText?: string;
  recipientData?: Record<string, any>;
  trackingId?: string;
  organizationId: string;
  campaignId?: string;
  useContentVariation?: boolean;
}

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth?: {
    user: string;
    pass: string;
  };
}

class EmailService {
  private transporter: Mail | null = null;

  async initializeTransporter(organizationId: string): Promise<Mail> {
    const smtpConfig = await prisma.smtpConfiguration.findUnique({
      where: { organizationId }
    });

    if (!smtpConfig) {
      throw new Error('SMTP configuration not found for organization');
    }

    const config: any = {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
    };

    if (smtpConfig.username && smtpConfig.password) {
      config.auth = {
        user: smtpConfig.username,
        pass: smtpConfig.password, // TODO: Decrypt password
      };
    }

    this.transporter = nodemailer.createTransporter(config);
    return this.transporter;
  }

  async sendEmail(options: EmailOptions): Promise<{ messageId: string; success: boolean }> {
    try {
      const transporter = await this.initializeTransporter(options.organizationId);
      
      const smtpConfig = await prisma.smtpConfiguration.findUnique({
        where: { organizationId: options.organizationId }
      });

      if (!smtpConfig) {
        throw new Error('SMTP configuration not found');
      }

      // Appliquer les variations de contenu si demandé
      let finalSubject = options.subject;
      let finalHtml = options.html;
      let finalPlainText = options.plainText;

      if (options.useContentVariation) {
        const variations = templateVariationService.generateEmailVariations(
          options.subject,
          options.html,
          options.plainText,
          3 // Générer 3 variations max
        );
        const selectedVariation = templateVariationService.getRandomVariation(variations);
        
        finalSubject = selectedVariation.subject;
        finalHtml = selectedVariation.htmlBody;
        finalPlainText = selectedVariation.plainTextBody;
      }

      // Personnaliser le contenu avec Handlebars
      const template = Handlebars.compile(finalHtml);
      let personalizedHtml = template(options.recipientData || {});

      // Ajouter le pixel de tracking si activé
      if (smtpConfig.trackingEnabled && options.trackingId) {
        const trackingPixel = generateTrackingPixel(options.trackingId);
        personalizedHtml = personalizedHtml.replace('</body>', `${trackingPixel}</body>`);
        
        // Remplacer les liens par des liens de tracking
        personalizedHtml = this.addClickTracking(personalizedHtml, options.trackingId);
      }

      // Générer le texte brut si non fourni
      const plainText = finalPlainText || convert(personalizedHtml, {
        wordwrap: 130
      });

      // Headers personnalisés pour paraître plus humain
      const headers = templateVariationService.generateVariedHeaders(
        this.generateHumanHeaders()
      );

      const mailOptions: Mail.Options = {
        from: `${smtpConfig.fromName} <${smtpConfig.fromEmail}>`,
        to: options.to,
        subject: finalSubject,
        html: personalizedHtml,
        text: plainText,
        replyTo: smtpConfig.replyToEmail,
        headers,
        messageId: this.generateMessageId(smtpConfig.fromEmail)
      };

      const result = await transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
        messageId: result.messageId
      });

      return {
        messageId: result.messageId,
        success: true
      };
    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error.message
      });

      throw error;
    }
  }

  private generateHumanHeaders(): Record<string, string> {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
    ];

    const mailers = [
      'Thunderbird 102.0',
      'Outlook 16.0',
      'Apple Mail 16.0'
    ];

    return {
      'X-Mailer': mailers[Math.floor(Math.random() * mailers.length)],
      'X-Originating-IP': `[${this.generateFakeIP()}]`,
      'X-Priority': Math.random() > 0.8 ? '3' : '1', // Mostly normal priority
      'X-MSMail-Priority': 'Normal',
      'X-MimeOLE': 'Produced By Microsoft MimeOLE V6.00.2900.2180',
    };
  }

  private generateFakeIP(): string {
    // Générer une IP privée réaliste
    const networks = [
      '192.168.',
      '10.0.',
      '172.16.'
    ];
    const network = networks[Math.floor(Math.random() * networks.length)];
    const octet3 = Math.floor(Math.random() * 255);
    const octet4 = Math.floor(Math.random() * 254) + 1;
    return `${network}${octet3}.${octet4}`;
  }

  private generateMessageId(fromEmail: string): string {
    const domain = fromEmail.split('@')[1];
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return `<${timestamp}.${random}@${domain}>`;
  }

  private addClickTracking(html: string, trackingId: string): string {
    // Remplacer tous les liens href par des liens de tracking
    return html.replace(/href="([^"]+)"/g, (match, url) => {
      if (url.startsWith('#') || url.startsWith('mailto:')) {
        return match; // Ignorer les ancres et emails
      }
      const trackingUrl = generateClickTrackingLink(trackingId, url);
      return `href="${trackingUrl}"`;
    });
  }

  async validateConfiguration(organizationId: string): Promise<boolean> {
    try {
      const transporter = await this.initializeTransporter(organizationId);
      await transporter.verify();
      return true;
    } catch (error) {
      logger.error('SMTP configuration validation failed', {
        organizationId,
        error: error.message
      });
      return false;
    }
  }

  // Variation du contenu pour éviter les filtres spam
  generateVariations(content: string): string {
    const variations = [
      // Synonymes courants
      { from: /\bexcellent\b/gi, to: ['formidable', 'remarquable', 'exceptionnel'] },
      { from: /\brapide\b/gi, to: ['véloce', 'prompt', 'instantané'] },
      { from: /\bqualité\b/gi, to: ['excellence', 'finition', 'standing'] },
      { from: /\bmaintenant\b/gi, to: ['immédiatement', 'à présent', 'dès maintenant'] },
      
      // Variations de ponctuation
      { from: /\s!\s/g, to: [' ! ', ' !  ', '! '] },
      { from: /\s\.\s/g, to: ['. ', ' . ', '. '] },
    ];

    let result = content;
    
    variations.forEach(variation => {
      if (variation.to && Array.isArray(variation.to)) {
        result = result.replace(variation.from, () => {
          const options = variation.to as string[];
          return options[Math.floor(Math.random() * options.length)];
        });
      }
    });

    return result;
  }

  // Délai humanisé entre les envois
  async humanDelay(min: number = 3, max: number = 15): Promise<void> {
    const delay = randomBetween(min * 1000, max * 1000);
    logger.debug(`Waiting ${delay}ms before next email`);
    await sleep(delay);
  }

  // Pause longue tous les N emails
  async longPause(emailsSent: number, interval: number = 50): Promise<void> {
    if (emailsSent > 0 && emailsSent % interval === 0) {
      const pauseMs = randomBetween(120000, 300000); // 2-5 minutes
      logger.info(`Long pause after ${emailsSent} emails: ${pauseMs}ms`);
      await sleep(pauseMs);
    }
  }

  // Vérifier les limites d'envoi
  async checkSendingLimits(organizationId: string): Promise<{
    canSendDaily: boolean;
    canSendHourly: boolean;
    remainingDaily: number;
    remainingHourly: number;
  }> {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());

    const smtpConfig = await prisma.smtpConfiguration.findUnique({
      where: { organizationId }
    });

    if (!smtpConfig) {
      throw new Error('SMTP configuration not found');
    }

    // Compter les emails envoyés aujourd'hui
    const dailySent = await prisma.campaignRecipient.count({
      where: {
        campaign: { organizationId },
        sentAt: { gte: startOfDay },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
      }
    });

    // Compter les emails envoyés cette heure
    const hourlySent = await prisma.campaignRecipient.count({
      where: {
        campaign: { organizationId },
        sentAt: { gte: startOfHour },
        status: { in: ['SENT', 'DELIVERED', 'OPENED', 'CLICKED'] }
      }
    });

    const remainingDaily = Math.max(0, smtpConfig.maxPerDay - dailySent);
    const remainingHourly = Math.max(0, smtpConfig.maxPerHour - hourlySent);

    return {
      canSendDaily: remainingDaily > 0,
      canSendHourly: remainingHourly > 0,
      remainingDaily,
      remainingHourly
    };
  }
}

export const emailService = new EmailService();