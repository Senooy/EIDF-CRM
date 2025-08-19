const nodemailer = require('nodemailer');
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.server' });

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  plainText?: string;
  from?: string;
  fromName?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class SimpleEmailService {
  private transporter: any;

  constructor() {
    // Configure transporter for local Postfix
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '25'),
      secure: false,
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const fromEmail = options.from || process.env.DEFAULT_FROM_EMAIL || 'contact@eidf-crm.fr';
      const fromName = options.fromName || process.env.DEFAULT_FROM_NAME || 'EIDF CRM';
      
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        text: options.plainText || this.htmlToText(options.html),
        html: options.html
      });

      console.log('Email sent successfully:', {
        to: options.to,
        messageId: info.messageId,
        response: info.response
      });

      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error: any) {
      console.error('Email sending failed:', {
        to: options.to,
        error: error.message
      });

      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  async sendBulkEmails(recipients: string[], options: Omit<EmailOptions, 'to'>): Promise<EmailResult[]> {
    const results: EmailResult[] = [];
    
    for (const recipient of recipients) {
      const result = await this.sendEmail({
        ...options,
        to: recipient
      });
      results.push(result);
      
      // Add small delay between emails to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }

  async sendTestEmail(to: string, campaignSubject: string, campaignBody: string): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `[TEST] ${campaignSubject}`,
      html: campaignBody,
      plainText: this.htmlToText(campaignBody)
    });
  }

  private htmlToText(html: string): string {
    // Simple HTML to text conversion
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      console.log('Email service ready');
      return true;
    } catch (error) {
      console.error('Email service verification failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const simpleEmailService = new SimpleEmailService();