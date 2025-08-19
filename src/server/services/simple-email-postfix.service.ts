import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

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

class SimpleEmailPostfixService {
  private fromEmail: string;
  private fromName: string;
  private settingsFile = path.join(process.cwd(), 'data', 'email-settings.json');

  constructor() {
    // Try to load settings from file first
    let settings = this.loadSettings();
    this.fromEmail = settings.defaultFromEmail || process.env.DEFAULT_FROM_EMAIL || 'contact@eidf-crm.fr';
    this.fromName = settings.defaultFromName || process.env.DEFAULT_FROM_NAME || 'EIDF CRM';
  }

  private loadSettings() {
    try {
      if (fs.existsSync(this.settingsFile)) {
        const data = fs.readFileSync(this.settingsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading email settings:', error);
    }
    return {};
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      const from = options.from || this.fromEmail;
      const fromName = options.fromName || this.fromName;
      
      // Create email content with headers
      const emailContent = `From: "${fromName}" <${from}>
To: ${options.to}
Subject: ${options.subject}
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="boundary123"

--boundary123
Content-Type: text/plain; charset=utf-8

${options.plainText || this.htmlToText(options.html)}

--boundary123
Content-Type: text/html; charset=utf-8

${options.html}

--boundary123--`;

      // Send email using sendmail command
      const command = `echo '${emailContent.replace(/'/g, "'\\''")}' | sendmail -t`;
      
      await execAsync(command);
      
      console.log('Email sent via Postfix:', {
        to: options.to,
        subject: options.subject
      });

      return {
        success: true,
        messageId: `${Date.now()}@eidf-crm.fr`
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


  async sendTestEmail(to: string, campaignSubject: string, campaignBody: string): Promise<EmailResult> {
    return this.sendEmail({
      to,
      subject: `[TEST] ${campaignSubject}`,
      html: campaignBody,
      plainText: this.htmlToText(campaignBody)
    });
  }

  async sendBulkEmails(recipients: string[], content: { subject: string; html: string; fromName?: string; fromEmail?: string }): Promise<EmailResult[]> {
    console.log(`\n=== BULK EMAIL SEND ===`);
    console.log(`Total recipients: ${recipients.length}`);
    console.log(`Subject: ${content.subject}`);
    
    const results: EmailResult[] = [];
    
    // Send emails in batches to avoid overloading
    const batchSize = 10;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(recipients.length/batchSize)} (${batch.length} emails)`);
      
      const batchPromises = batch.map(email => {
        console.log(`  - Sending to: ${email}`);
        return this.sendEmail({
          to: email,
          subject: content.subject,
          html: content.html,
          fromName: content.fromName,
          fromEmail: content.fromEmail
        });
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      const batchSuccess = batchResults.filter(r => r.success).length;
      console.log(`  Batch result: ${batchSuccess}/${batch.length} sent successfully`);
      
      // Small delay between batches
      if (i + batchSize < recipients.length) {
        console.log('  Waiting 1 second before next batch...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const totalSuccess = results.filter(r => r.success).length;
    const totalFailed = results.filter(r => !r.success).length;
    console.log(`\n=== BULK SEND COMPLETE ===`);
    console.log(`Success: ${totalSuccess}`);
    console.log(`Failed: ${totalFailed}`);
    console.log(`===========================\n`);
    
    return results;
  }

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// Export singleton instance
export const simpleEmailService = new SimpleEmailPostfixService();