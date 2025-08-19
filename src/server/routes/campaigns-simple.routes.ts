import { Router, Request, Response } from 'express';
import { simpleEmailService } from '../services/simple-email-postfix.service';
import fs from 'fs';
import path from 'path';

const router = Router();

// Persistent storage file
const CAMPAIGNS_FILE = path.join(process.cwd(), 'data', 'campaigns.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(CAMPAIGNS_FILE))) {
  fs.mkdirSync(path.dirname(CAMPAIGNS_FILE), { recursive: true });
}

// Load campaigns from file or initialize empty array
let campaigns: any[] = [];
let campaignIdCounter = 1;

try {
  if (fs.existsSync(CAMPAIGNS_FILE)) {
    const data = fs.readFileSync(CAMPAIGNS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    campaigns = parsed.campaigns || [];
    campaignIdCounter = parsed.nextId || 1;
    console.log(`Loaded ${campaigns.length} campaigns from storage`);
  }
} catch (error) {
  console.error('Error loading campaigns:', error);
  campaigns = [];
}

// Save campaigns to file
function saveCampaigns() {
  try {
    fs.writeFileSync(CAMPAIGNS_FILE, JSON.stringify({
      campaigns,
      nextId: campaignIdCounter
    }, null, 2));
  } catch (error) {
    console.error('Error saving campaigns:', error);
  }
}

// Get queue stats (must be before :id route)
router.get('/campaigns/queue/stats', (req: Request, res: Response) => {
  const stats = {
    waiting: campaigns.filter(c => c.status === 'SCHEDULED').length,
    active: campaigns.filter(c => c.status === 'SENDING').length,
    completed: campaigns.filter(c => c.status === 'SENT').length,
    failed: campaigns.filter(c => c.status === 'FAILED').length,
    delayed: 0
  };
  res.json(stats);
});

// Get all campaigns
router.get('/campaigns', (req: Request, res: Response) => {
  // Ensure all campaigns have stats object
  const campaignsWithStats = campaigns.map(campaign => {
    if (!campaign.stats) {
      campaign.stats = {
        sent: campaign.sentCount || 0,
        delivered: campaign.deliveredCount || 0,
        opened: campaign.openedCount || 0,
        clicked: campaign.clickedCount || 0,
        converted: campaign.convertedCount || 0,
        bounced: campaign.bouncedCount || 0,
        unsubscribed: campaign.unsubscribedCount || 0,
        spamReported: campaign.spamReportedCount || 0,
        revenue: 0,
        lastUpdated: campaign.updatedAt || campaign.createdAt || new Date().toISOString()
      };
    }
    return campaign;
  });
  res.json(campaignsWithStats);
});

// Get single campaign
router.get('/campaigns/:id', (req: Request, res: Response) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  res.json(campaign);
});

// Create campaign
router.post('/campaigns', (req: Request, res: Response) => {
  const { name, subject, body, recipients, recipientEmails, status, scheduledDate, fromName, fromEmail } = req.body;
  
  if (!name || !subject || !body) {
    return res.status(400).json({ error: 'Name, subject, and body are required' });
  }

  // Handle both formats: array of objects with email property or array of strings
  let processedRecipients = [];
  if (recipientEmails && Array.isArray(recipientEmails)) {
    // Direct email list from manual input
    processedRecipients = recipientEmails.map((email: string) => ({ email: email.trim() }));
  } else if (recipients && Array.isArray(recipients)) {
    // Existing format
    processedRecipients = recipients;
  }

  const campaign = {
    id: String(campaignIdCounter++),
    name,
    subject,
    body,
    fromName: fromName || 'EIDF CRM',
    fromEmail: fromEmail || 'noreply@eidf-crm.fr',
    recipients: processedRecipients,
    recipientCount: processedRecipients.length,
    status: status || 'DRAFT',
    scheduledDate,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sentCount: 0,
    openedCount: 0,
    clickedCount: 0,
    deliveredCount: 0,
    bouncedCount: 0,
    unsubscribedCount: 0,
    // Add stats object for compatibility with frontend
    stats: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      bounced: 0,
      unsubscribed: 0,
      spamReported: 0,
      revenue: 0,
      lastUpdated: new Date().toISOString()
    }
  };

  campaigns.push(campaign);
  saveCampaigns(); // Persist to file
  res.status(201).json(campaign);
});

// Send test email
router.post('/campaigns/:id/test', async (req: Request, res: Response) => {
  try {
    const { testEmails } = req.body;
    
    if (!testEmails || !Array.isArray(testEmails) || testEmails.length === 0) {
      return res.status(400).json({
        error: 'Test emails array is required and must not be empty'
      });
    }

    if (testEmails.length > 5) {
      return res.status(400).json({
        error: 'Maximum 5 test emails allowed'
      });
    }

    let campaign = campaigns.find(c => c.id === req.params.id);
    if (!campaign) {
      // Create a default test campaign if not found
      const defaultCampaign = {
        id: req.params.id,
        name: 'Test Campaign',
        subject: 'Test Email from EIDF CRM',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333;">Test Email</h1>
            <p>Ceci est un email de test envoyé depuis EIDF CRM.</p>
            <p>Le système de campagnes fonctionne correctement!</p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">
              Envoyé depuis EIDF CRM - ${new Date().toLocaleString('fr-FR')}
            </p>
          </div>
        `,
        status: 'DRAFT',
        createdAt: new Date().toISOString(),
        sentCount: 0,
        openedCount: 0,
        clickedCount: 0,
        deliveredCount: 0,
        bouncedCount: 0,
        unsubscribedCount: 0,
        // Add stats object for compatibility
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
          bounced: 0,
          unsubscribed: 0,
          spamReported: 0,
          revenue: 0,
          lastUpdated: new Date().toISOString()
        }
      };
      campaigns.push(defaultCampaign);
      campaign = defaultCampaign;
    }

    // Send test emails
    const results = [];
    for (const email of testEmails) {
      const result = await simpleEmailService.sendEmail({
        to: email,
        subject: `[TEST] ${campaign.subject}`,
        html: campaign.body,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail
      });
      
      results.push({
        email,
        success: result.success,
        messageId: result.messageId,
        error: result.error
      });
    }

    console.log('Test emails sent:', {
      campaignId: req.params.id,
      testEmails,
      results
    });

    res.json({
      message: 'Test emails processed',
      results
    });
  } catch (error: any) {
    console.error('Error sending test emails:', error);
    res.status(500).json({ 
      error: 'Failed to send test emails',
      details: error.message 
    });
  }
});

// Send campaign
router.post('/campaigns/:id/send', async (req: Request, res: Response) => {
  try {
    const campaign = campaigns.find(c => c.id === req.params.id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check for recipients in either format
    const hasRecipients = (campaign.recipients && campaign.recipients.length > 0) || 
                          (campaign.recipientEmails && campaign.recipientEmails.length > 0);
    
    if (!hasRecipients) {
      return res.status(400).json({ error: 'No recipients defined for this campaign' });
    }

    // Update campaign status
    campaign.status = 'SENDING';
    campaign.startedAt = new Date().toISOString();

    // Get email addresses from either format
    let emailList: string[] = [];
    if (campaign.recipients && campaign.recipients.length > 0) {
      emailList = campaign.recipients.map((r: any) => r.email || r);
    } else if (campaign.recipientEmails && campaign.recipientEmails.length > 0) {
      emailList = campaign.recipientEmails;
    }

    // Send emails to all recipients
    const results = await simpleEmailService.sendBulkEmails(
      emailList,
      {
        subject: campaign.subject,
        html: campaign.body,
        fromName: campaign.fromName,
        fromEmail: campaign.fromEmail
      }
    );

    // Update campaign stats
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    campaign.sentCount = successCount;
    campaign.failedCount = failedCount;
    campaign.status = 'SENT';
    campaign.completedAt = new Date().toISOString();
    
    // Update stats object as well
    if (!campaign.stats) {
      campaign.stats = {
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        converted: 0,
        bounced: 0,
        unsubscribed: 0,
        spamReported: 0,
        revenue: 0,
        lastUpdated: new Date().toISOString()
      };
    }
    campaign.stats.sent = successCount;
    campaign.stats.delivered = successCount; // Assume all sent are delivered initially
    campaign.stats.lastUpdated = new Date().toISOString();
    
    saveCampaigns(); // Persist to file

    res.json({
      message: `Campaign sent successfully to ${successCount} recipients`,
      campaignId: campaign.id,
      stats: {
        sent: successCount,
        failed: failedCount,
        total: results.length
      },
      results: results.slice(0, 10) // Return first 10 results for debugging
    });
  } catch (error: any) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ 
      error: 'Failed to send campaign',
      details: error.message 
    });
  }
});

// Update campaign
router.put('/campaigns/:id', (req: Request, res: Response) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  // Handle recipient updates
  const updates = { ...req.body };
  if (req.body.recipientEmails && Array.isArray(req.body.recipientEmails)) {
    updates.recipients = req.body.recipientEmails.map((email: string) => ({ email: email.trim() }));
    updates.recipientCount = updates.recipients.length;
    delete updates.recipientEmails;
  }

  Object.assign(campaign, updates, {
    updatedAt: new Date().toISOString()
  });

  saveCampaigns(); // Persist to file
  res.json(campaign);
});

// Delete campaign
router.delete('/campaigns/:id', (req: Request, res: Response) => {
  const index = campaigns.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Campaign not found' });
  }

  campaigns.splice(index, 1);
  saveCampaigns(); // Persist to file
  res.status(204).send();
});

// Create demo campaign with realistic stats
router.post('/campaigns/seed-demo', (req: Request, res: Response) => {
  // Generate fake email list
  const emailDomains = ['gmail.com', 'yahoo.fr', 'hotmail.com', 'outlook.fr', 'orange.fr', 'free.fr', 'wanadoo.fr'];
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Michel', 'Nathalie', 'Alain', 'Isabelle', 'Philippe', 'Catherine'];
  const lastNames = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy'];
  
  const recipients = [];
  for (let i = 0; i < 6233; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const domain = emailDomains[Math.floor(Math.random() * emailDomains.length)];
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${Math.floor(Math.random() * 100)}@${domain}`;
    
    // Mark some as opened (15% open rate)
    const opened = Math.random() < 0.15;
    // Mark some as clicked (0.2% click rate from total)
    const clicked = Math.random() < 0.002;
    
    recipients.push({
      email,
      status: clicked ? 'clicked' : (opened ? 'opened' : 'sent'),
      sentAt: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Random time in last hour
      openedAt: opened ? new Date(Date.now() - Math.random() * 1800000).toISOString() : null,
      clickedAt: clicked ? new Date(Date.now() - Math.random() * 900000).toISOString() : null
    });
  }
  
  const openedCount = recipients.filter(r => r.status === 'opened' || r.status === 'clicked').length;
  const clickedCount = recipients.filter(r => r.status === 'clicked').length;
  
  const demoCampaign = {
    id: String(campaignIdCounter++),
    name: 'Campagne Black Friday 2024 - Offres Exclusives',
    subject: '🎁 Black Friday: Jusqu’à -70% sur tout le site + Livraison GRATUITE',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
          <h1 style="color: white; font-size: 32px; margin: 0;">BLACK FRIDAY</h1>
          <p style="color: white; font-size: 24px; margin: 10px 0;">Jusqu'à -70% de réduction</p>
        </div>
        <div style="padding: 30px; background: white;">
          <h2 style="color: #333; font-size: 24px;">Offres exceptionnelles limitées</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Chère cliente, cher client,<br><br>
            Le Black Friday est enfin arrivé ! Profitez de réductions allant jusqu'à -70% sur l'ensemble de notre catalogue.
            Ces offres sont valables uniquement aujourd'hui et dans la limite des stocks disponibles.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" style="display: inline-block; background: #764ba2; color: white; padding: 15px 40px; text-decoration: none; border-radius: 5px; font-size: 18px;">Découvrir les offres</a>
          </div>
          <div style="border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px;">
            <p style="color: #999; font-size: 12px; text-align: center;">
              Si vous ne souhaitez plus recevoir nos emails, <a href="#" style="color: #764ba2;">cliquez ici</a>
            </p>
          </div>
        </div>
      </div>
    `,
    recipients: recipients,
    recipientCount: recipients.length,
    recipientEmails: recipients.map(r => r.email),
    status: 'SENT',
    createdAt: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    updatedAt: new Date().toISOString(),
    sentAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    completedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    sentCount: 6233,
    deliveredCount: 6201,
    openedCount: openedCount,
    clickedCount: clickedCount,
    bouncedCount: 32,
    unsubscribedCount: 8,
    spamReportedCount: 1,
    convertedCount: 0,
    stats: {
      sent: 6233,
      delivered: 6201,
      opened: openedCount,
      clicked: clickedCount,
      converted: 0,
      bounced: 32,
      unsubscribed: 8,
      spamReported: 1,
      revenue: 0,
      lastUpdated: new Date().toISOString()
    }
  };
  
  campaigns.push(demoCampaign);
  saveCampaigns();
  
  res.status(201).json({
    message: 'Campagne de démonstration créée avec succès',
    campaign: {
      ...demoCampaign,
      recipients: undefined // Don't send all recipients in response
    }
  });
});

// Get campaign recipients (paginated)
router.get('/campaigns/:id/recipients', (req: Request, res: Response) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const status = req.query.status as string;
  
  let recipients = campaign.recipients || [];
  
  // Filter by status if provided
  if (status && status !== 'all') {
    recipients = recipients.filter((r: any) => r.status === status);
  }
  
  const total = recipients.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedRecipients = recipients.slice(offset, offset + limit);
  
  // Simulate loading delay
  setTimeout(() => {
    res.json({
      recipients: paginatedRecipients,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages
      }
    });
  }, 800); // 800ms delay to simulate loading
});

// Get campaign activities
router.get('/campaigns/:id/activities', (req: Request, res: Response) => {
  const campaign = campaigns.find(c => c.id === req.params.id);
  if (!campaign) {
    return res.status(404).json({ error: 'Campaign not found' });
  }
  
  // Generate fake activities based on campaign stats
  const activities = [];
  const recipients = campaign.recipients || [];
  
  // Add recent activities
  recipients.slice(0, 100).forEach((recipient: any) => {
    if (recipient.status === 'clicked') {
      activities.push({
        id: Math.random().toString(36),
        type: 'click',
        email: recipient.email,
        timestamp: recipient.clickedAt,
        details: 'Lien principal cliqué'
      });
    }
    if (recipient.status === 'opened' || recipient.status === 'clicked') {
      activities.push({
        id: Math.random().toString(36),
        type: 'open',
        email: recipient.email,
        timestamp: recipient.openedAt,
        details: 'Email ouvert'
      });
    }
  });
  
  // Sort by timestamp
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  res.json(activities.slice(0, 50)); // Return last 50 activities
});

export default router;