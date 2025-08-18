import { Router } from 'express';
import { authenticateUser, requireOrganization, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { campaignQueueService } from '../services/campaign-queue.service';
import { trackingService } from '../services/tracking.service';
import { emailService } from '../services/email.service';
import { logger } from '@/lib/logger';

const router = Router();

// All routes require authentication and organization
router.use(authenticateUser);
router.use(requireOrganization);

// Get all campaigns for organization
router.get('/campaigns', async (req: AuthRequest, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    const where: any = {
      organizationId: req.organizationId!
    };

    if (status) {
      where.status = status;
    }

    const campaigns = await prisma.campaign.findMany({
      where,
      include: {
        template: {
          select: { id: true, name: true }
        },
        segment: {
          select: { id: true, name: true, estimatedSize: true }
        },
        _count: {
          select: {
            recipients: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json(campaigns);
  } catch (error) {
    console.error('Error fetching campaigns:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// Get single campaign with detailed stats
router.get('/campaigns/:id', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      },
      include: {
        template: true,
        segment: true,
        recipients: {
          take: 100, // Limit for performance
          orderBy: { createdAt: 'desc' }
        },
        activities: {
          take: 100,
          orderBy: { timestamp: 'desc' },
          include: {
            recipient: {
              select: { email: true }
            }
          }
        }
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get real-time stats
    const stats = await trackingService.getCampaignStats(campaign.id);

    res.json({
      ...campaign,
      realtimeStats: stats
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// Create new campaign
router.post('/campaigns', requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER), async (req: AuthRequest, res) => {
  try {
    const {
      name,
      subject,
      body,
      plainTextBody,
      templateId,
      segmentId,
      fromEmail,
      fromName,
      replyToEmail,
      scheduledAt,
      dailyLimit,
      hourlyLimit,
      delayBetweenMin,
      delayBetweenMax,
      recipients
    } = req.body;

    if (!name || !subject || !body) {
      return res.status(400).json({ 
        error: 'Name, subject, and body are required' 
      });
    }

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({
        error: 'Recipients list is required and must not be empty'
      });
    }

    // Validate recipients
    const validRecipients = recipients.filter(r => 
      r.email && 
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)
    );

    if (validRecipients.length === 0) {
      return res.status(400).json({
        error: 'No valid email addresses found in recipients list'
      });
    }

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        organizationId: req.organizationId!,
        name,
        subject,
        body,
        plainTextBody,
        templateId: templateId || null,
        segmentId: segmentId || null,
        fromEmail,
        fromName,
        replyToEmail,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        dailyLimit: dailyLimit || 100,
        hourlyLimit: hourlyLimit || 20,
        delayBetweenMin: delayBetweenMin || 3,
        delayBetweenMax: delayBetweenMax || 15,
        totalRecipients: validRecipients.length,
        createdBy: req.userId!,
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT'
      }
    });

    // Create recipients
    await prisma.campaignRecipient.createMany({
      data: validRecipients.map(recipient => ({
        campaignId: campaign.id,
        email: recipient.email.toLowerCase().trim(),
        firstName: recipient.firstName || null,
        lastName: recipient.lastName || null,
        customData: recipient.customData || null
      }))
    });

    // If scheduled, add to queue
    if (scheduledAt) {
      const delay = new Date(scheduledAt).getTime() - Date.now();
      if (delay > 0) {
        // Schedule campaign
        setTimeout(() => {
          campaignQueueService.startCampaign(campaign.id);
        }, delay);
      }
    }

    logger.info('Campaign created', {
      campaignId: campaign.id,
      organizationId: req.organizationId,
      recipientCount: validRecipients.length,
      userId: req.userId
    });

    res.status(201).json(campaign);
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// Update campaign
router.put('/campaigns/:id', requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER), async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Only allow updates for draft and scheduled campaigns
    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      return res.status(400).json({
        error: 'Campaign cannot be modified once sending has started'
      });
    }

    const updateData: any = {};
    const allowedFields = [
      'name', 'subject', 'body', 'plainTextBody', 'fromEmail', 'fromName', 
      'replyToEmail', 'scheduledAt', 'dailyLimit', 'hourlyLimit', 
      'delayBetweenMin', 'delayBetweenMax'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.scheduledAt) {
      updateData.scheduledAt = new Date(req.body.scheduledAt);
      updateData.status = 'SCHEDULED';
    }

    const updatedCampaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: updateData
    });

    logger.info('Campaign updated', {
      campaignId: req.params.id,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.json(updatedCampaign);
  } catch (error) {
    console.error('Error updating campaign:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// Delete campaign
router.delete('/campaigns/:id', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Only allow deletion for draft campaigns
    if (campaign.status !== 'DRAFT') {
      return res.status(400).json({
        error: 'Only draft campaigns can be deleted'
      });
    }

    await prisma.campaign.delete({
      where: { id: req.params.id }
    });

    logger.info('Campaign deleted', {
      campaignId: req.params.id,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting campaign:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

// Send campaign immediately
router.post('/campaigns/:id/send', requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER), async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!['DRAFT', 'SCHEDULED'].includes(campaign.status)) {
      return res.status(400).json({
        error: 'Campaign is already being sent or has been sent'
      });
    }

    // Start sending immediately
    await campaignQueueService.startCampaign(campaign.id);

    logger.info('Campaign send initiated', {
      campaignId: req.params.id,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.json({ message: 'Campaign send initiated successfully' });
  } catch (error) {
    console.error('Error starting campaign:', error);
    res.status(500).json({ error: 'Failed to start campaign' });
  }
});

// Pause campaign
router.post('/campaigns/:id/pause', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'SENDING') {
      return res.status(400).json({
        error: 'Only sending campaigns can be paused'
      });
    }

    await campaignQueueService.pauseCampaign(campaign.id);

    logger.info('Campaign paused', {
      campaignId: req.params.id,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.json({ message: 'Campaign paused successfully' });
  } catch (error) {
    console.error('Error pausing campaign:', error);
    res.status(500).json({ error: 'Failed to pause campaign' });
  }
});

// Resume campaign
router.post('/campaigns/:id/resume', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (campaign.status !== 'PAUSED') {
      return res.status(400).json({
        error: 'Only paused campaigns can be resumed'
      });
    }

    await campaignQueueService.resumeCampaign(campaign.id);

    logger.info('Campaign resumed', {
      campaignId: req.params.id,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.json({ message: 'Campaign resumed successfully' });
  } catch (error) {
    console.error('Error resuming campaign:', error);
    res.status(500).json({ error: 'Failed to resume campaign' });
  }
});

// Send test email
router.post('/campaigns/:id/test', requireRole(UserRole.OWNER, UserRole.ADMIN, UserRole.MEMBER), async (req: AuthRequest, res) => {
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

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Send test emails
    const results = [];
    for (const email of testEmails) {
      try {
        const result = await emailService.sendEmail({
          to: email,
          subject: `[TEST] ${campaign.subject}`,
          html: campaign.body,
          plainText: campaign.plainTextBody || undefined,
          recipientData: {
            firstName: 'Test',
            lastName: 'User',
            email: email
          },
          organizationId: req.organizationId!,
          campaignId: campaign.id
        });
        
        results.push({
          email,
          success: true,
          messageId: result.messageId
        });
      } catch (error) {
        results.push({
          email,
          success: false,
          error: error.message
        });
      }
    }

    logger.info('Test emails sent', {
      campaignId: req.params.id,
      organizationId: req.organizationId,
      testEmails,
      results,
      userId: req.userId
    });

    res.json({
      message: 'Test emails processed',
      results
    });
  } catch (error) {
    console.error('Error sending test emails:', error);
    res.status(500).json({ error: 'Failed to send test emails' });
  }
});

// Get campaign stats
router.get('/campaigns/:id/stats', async (req: AuthRequest, res) => {
  try {
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: req.params.id,
        organizationId: req.organizationId!
      }
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const stats = await trackingService.getCampaignStats(campaign.id);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching campaign stats:', error);
    res.status(500).json({ error: 'Failed to fetch campaign stats' });
  }
});

// Get campaign activities
router.get('/campaigns/:id/activities', async (req: AuthRequest, res) => {
  try {
    const { limit = 100, offset = 0, action } = req.query;

    const where: any = {
      campaignId: req.params.id,
      campaign: {
        organizationId: req.organizationId!
      }
    };

    if (action) {
      where.action = action;
    }

    const activities = await prisma.campaignActivity.findMany({
      where,
      include: {
        recipient: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching campaign activities:', error);
    res.status(500).json({ error: 'Failed to fetch campaign activities' });
  }
});

// Get queue statistics
router.get('/campaigns/queue/stats', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res) => {
  try {
    const queueStats = await campaignQueueService.getQueueStats();
    res.json(queueStats);
  } catch (error) {
    console.error('Error fetching queue stats:', error);
    res.status(500).json({ error: 'Failed to fetch queue stats' });
  }
});

export default router;