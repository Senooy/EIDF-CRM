import { Router, Request, Response } from 'express';
import { authenticateUser, requireOrganization, requireRole, AuthRequest } from '../middleware/auth';
import { UserRole } from '@prisma/client';
import { ipWarmupService } from '../services/ip-warmup.service';
import { logger } from '@/lib/logger';

const router = Router();

// All routes require authentication and organization
router.use(authenticateUser);
router.use(requireOrganization);

// Create a new IP warmup schedule
router.post('/warmup/schedule', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const {
      ipAddress,
      startDate,
      totalDuration = 30,
      maxDailyVolume = 5000,
      growthPattern = 'conservative'
    } = req.body;

    if (!ipAddress) {
      return res.status(400).json({ error: 'IP address is required' });
    }

    if (!startDate) {
      return res.status(400).json({ error: 'Start date is required' });
    }

    const scheduleId = await ipWarmupService.createWarmupSchedule({
      organizationId: req.organizationId!,
      ipAddress,
      startDate: new Date(startDate),
      totalDuration,
      maxDailyVolume,
      growthPattern
    });

    logger.info('IP warmup schedule created via API', {
      scheduleId,
      ipAddress,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.status(201).json({ 
      scheduleId,
      message: 'Warmup schedule created successfully' 
    });
  } catch (error) {
    logger.error('Error creating warmup schedule', {
      error: error.message,
      organizationId: req.organizationId,
      userId: req.userId
    });
    res.status(500).json({ error: error.message });
  }
});

// Get warmup status for a specific IP
router.get('/warmup/status/:ipAddress', async (req: AuthRequest, res: Response) => {
  try {
    const { ipAddress } = req.params;

    const status = await ipWarmupService.getWarmupStatus(
      req.organizationId!,
      ipAddress
    );

    res.json(status);
  } catch (error) {
    logger.error('Error getting warmup status', {
      error: error.message,
      ipAddress: req.params.ipAddress,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to get warmup status' });
  }
});

// Check if can send email (for manual checks)
router.get('/warmup/can-send/:ipAddress', async (req: AuthRequest, res: Response) => {
  try {
    const { ipAddress } = req.params;

    const canSend = await ipWarmupService.canSendEmail(
      req.organizationId!,
      ipAddress
    );

    res.json(canSend);
  } catch (error) {
    logger.error('Error checking send permission', {
      error: error.message,
      ipAddress: req.params.ipAddress,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to check send permission' });
  }
});

// Pause a warmup schedule
router.post('/warmup/pause/:scheduleId', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;

    await ipWarmupService.pauseWarmup(scheduleId);

    logger.info('IP warmup paused via API', {
      scheduleId,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.json({ message: 'Warmup paused successfully' });
  } catch (error) {
    logger.error('Error pausing warmup', {
      error: error.message,
      scheduleId: req.params.scheduleId,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: error.message });
  }
});

// Resume a warmup schedule
router.post('/warmup/resume/:scheduleId', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;

    await ipWarmupService.resumeWarmup(scheduleId);

    logger.info('IP warmup resumed via API', {
      scheduleId,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.json({ message: 'Warmup resumed successfully' });
  } catch (error) {
    logger.error('Error resuming warmup', {
      error: error.message,
      scheduleId: req.params.scheduleId,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: error.message });
  }
});

// Get organization warmup statistics
router.get('/warmup/stats', async (req: AuthRequest, res: Response) => {
  try {
    const stats = await ipWarmupService.getOrganizationWarmupStats(req.organizationId!);
    res.json(stats);
  } catch (error) {
    logger.error('Error getting warmup stats', {
      error: error.message,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to get warmup statistics' });
  }
});

// Get warmup recommendations
router.get('/warmup/recommendations', async (req: AuthRequest, res: Response) => {
  try {
    const recommendations = await ipWarmupService.generateWarmupRecommendations(req.organizationId!);
    res.json(recommendations);
  } catch (error) {
    logger.error('Error generating warmup recommendations', {
      error: error.message,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Get all warmup schedules for organization
router.get('/warmup/schedules', async (req: AuthRequest, res: Response) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const where: any = {
      organizationId: req.organizationId!
    };

    if (status) {
      where.status = status;
    }

    const { prisma } = await import('@/lib/prisma');
    
    const schedules = await prisma.ipWarmupSchedule.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string)
    });

    res.json(schedules);
  } catch (error) {
    logger.error('Error fetching warmup schedules', {
      error: error.message,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

// Get detailed warmup schedule by ID
router.get('/warmup/schedules/:scheduleId', async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { prisma } = await import('@/lib/prisma');

    const schedule = await prisma.ipWarmupSchedule.findFirst({
      where: {
        id: scheduleId,
        organizationId: req.organizationId!
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Warmup schedule not found' });
    }

    // Parse daily targets
    const dailyTargets = JSON.parse(schedule.dailyTargets || '[]');
    
    // Calculate additional metrics
    const daysSinceStart = Math.floor(
      (Date.now() - schedule.startDate.getTime()) / (24 * 60 * 60 * 1000)
    ) + 1;

    const progress = schedule.status === 'COMPLETED' ? 100 : 
                    (daysSinceStart / schedule.totalDuration) * 100;

    const todayTarget = dailyTargets.find((t: any) => t.day === schedule.currentDay);

    res.json({
      ...schedule,
      dailyTargets,
      daysSinceStart: Math.max(0, daysSinceStart),
      progress: Math.min(100, Math.max(0, progress)),
      todayTarget: todayTarget?.maxEmails || 0,
      remainingToday: todayTarget ? Math.max(0, todayTarget.maxEmails - schedule.emailsSentToday) : 0
    });
  } catch (error) {
    logger.error('Error fetching warmup schedule details', {
      error: error.message,
      scheduleId: req.params.scheduleId,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to fetch schedule details' });
  }
});

// Delete a warmup schedule (only if DRAFT or SCHEDULED)
router.delete('/warmup/schedules/:scheduleId', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { prisma } = await import('@/lib/prisma');

    const schedule = await prisma.ipWarmupSchedule.findFirst({
      where: {
        id: scheduleId,
        organizationId: req.organizationId!
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Warmup schedule not found' });
    }

    if (['ACTIVE', 'COMPLETED'].includes(schedule.status)) {
      return res.status(400).json({ 
        error: 'Cannot delete active or completed warmup schedule' 
      });
    }

    await prisma.ipWarmupSchedule.delete({
      where: { id: scheduleId }
    });

    logger.info('IP warmup schedule deleted', {
      scheduleId,
      organizationId: req.organizationId,
      userId: req.userId
    });

    res.status(204).send();
  } catch (error) {
    logger.error('Error deleting warmup schedule', {
      error: error.message,
      scheduleId: req.params.scheduleId,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

// Simulate warmup progress (for testing)
router.post('/warmup/simulate/:scheduleId', requireRole(UserRole.OWNER, UserRole.ADMIN), async (req: AuthRequest, res: Response) => {
  try {
    const { scheduleId } = req.params;
    const { days = 1 } = req.body;
    const { prisma } = await import('@/lib/prisma');

    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Simulation not allowed in production' });
    }

    const schedule = await prisma.ipWarmupSchedule.findFirst({
      where: {
        id: scheduleId,
        organizationId: req.organizationId!
      }
    });

    if (!schedule) {
      return res.status(404).json({ error: 'Warmup schedule not found' });
    }

    // Simulate progression
    const newCurrentDay = Math.min(schedule.currentDay + days, schedule.totalDuration);
    const dailyTargets = JSON.parse(schedule.dailyTargets || '[]');
    const todayTarget = dailyTargets.find((t: any) => t.day === newCurrentDay);

    await prisma.ipWarmupSchedule.update({
      where: { id: scheduleId },
      data: {
        currentDay: newCurrentDay,
        emailsSentToday: todayTarget ? Math.floor(todayTarget.maxEmails * 0.8) : 0,
        totalEmailsSent: { increment: todayTarget ? Math.floor(todayTarget.maxEmails * 0.8) : 0 },
        lastEmailSentAt: new Date(),
        ...(newCurrentDay >= schedule.totalDuration && { 
          status: 'COMPLETED',
          completedAt: new Date() 
        })
      }
    });

    logger.info('IP warmup simulated', {
      scheduleId,
      days,
      newCurrentDay,
      organizationId: req.organizationId
    });

    res.json({ 
      message: `Simulated ${days} day(s) of warmup progress`,
      newCurrentDay,
      completed: newCurrentDay >= schedule.totalDuration
    });
  } catch (error) {
    logger.error('Error simulating warmup', {
      error: error.message,
      scheduleId: req.params.scheduleId,
      organizationId: req.organizationId
    });
    res.status(500).json({ error: 'Failed to simulate warmup' });
  }
});

export default router;