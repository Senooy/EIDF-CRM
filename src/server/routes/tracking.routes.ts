import { Router, Request, Response } from 'express';
import { trackingService } from '../services/tracking.service';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

const router = Router();

// Track email open (pixel tracking)
router.get('/tracking/open/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip || req.connection.remoteAddress;

  try {
    await trackingService.trackOpen(trackingId, userAgent, ipAddress);
  } catch (error) {
    logger.error('Error tracking open', {
      trackingId,
      error: error.message
    });
  }

  // Return 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.send(pixel);
});

// Track click and redirect
router.get('/tracking/click/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  const { url } = req.query;
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip || req.connection.remoteAddress;

  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  try {
    const originalUrl = decodeURIComponent(url);
    const result = await trackingService.trackClick(
      trackingId,
      originalUrl,
      userAgent,
      ipAddress
    );

    // Redirect to original URL
    res.redirect(302, result.redirectUrl);
  } catch (error) {
    logger.error('Error tracking click', {
      trackingId,
      url,
      error: error.message
    });

    // Still redirect even if tracking fails
    try {
      const originalUrl = decodeURIComponent(url as string);
      res.redirect(302, originalUrl);
    } catch {
      res.status(400).json({ error: 'Invalid URL' });
    }
  }
});

// Unsubscribe page
router.get('/unsubscribe/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;

  try {
    // Get recipient info for display
    const recipient = await prisma.campaignRecipient.findUnique({
      where: { trackingId },
      include: {
        campaign: {
          include: {
            organization: {
              select: { name: true }
            }
          }
        }
      }
    });

    if (!recipient) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lien invalide</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 500px; margin: 0 auto; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Lien invalide</h1>
            <p>Ce lien de désabonnement n'est plus valide.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Check if already unsubscribed
    const alreadyUnsubscribed = await prisma.unsubscribeList.findFirst({
      where: {
        email: recipient.email,
        organizationId: recipient.campaign.organizationId
      }
    });

    if (alreadyUnsubscribed) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Déjà désabonné</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .container { max-width: 500px; margin: 0 auto; }
            .success { color: #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">Vous êtes déjà désabonné</h1>
            <p>L'adresse <strong>${recipient.email}</strong> a déjà été supprimée de notre liste de diffusion.</p>
            <p>Si vous continuez à recevoir des emails, contactez-nous directement.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Show unsubscribe form
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Se désabonner</title>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            text-align: center; 
            padding: 50px; 
            background-color: #f8f9fa;
          }
          .container { 
            max-width: 500px; 
            margin: 0 auto; 
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .btn {
            background-color: #dc3545;
            color: white;
            padding: 12px 30px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin: 10px;
          }
          .btn:hover {
            background-color: #c82333;
          }
          .btn-secondary {
            background-color: #6c757d;
          }
          .btn-secondary:hover {
            background-color: #5a6268;
          }
          select, textarea {
            width: 100%;
            padding: 8px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Se désabonner</h1>
          <p>Souhaitez-vous vous désabonner de notre liste de diffusion ?</p>
          <p><strong>Email :</strong> ${recipient.email}</p>
          <p><strong>Organisation :</strong> ${recipient.campaign.organization.name}</p>
          
          <form method="POST" action="/api/unsubscribe/${trackingId}">
            <div style="margin: 20px 0;">
              <label>Raison du désabonnement (optionnel) :</label>
              <select name="reason">
                <option value="">Sélectionner une raison</option>
                <option value="too_frequent">Trop d'emails</option>
                <option value="not_relevant">Contenu non pertinent</option>
                <option value="never_subscribed">Je ne me suis jamais abonné</option>
                <option value="other">Autre</option>
              </select>
              <textarea name="comment" placeholder="Commentaire (optionnel)" rows="3"></textarea>
            </div>
            
            <button type="submit" class="btn">
              Confirmer le désabonnement
            </button>
            <button type="button" class="btn btn-secondary" onclick="window.close();">
              Annuler
            </button>
          </form>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    logger.error('Error displaying unsubscribe page', {
      trackingId,
      error: error.message
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Process unsubscribe
router.post('/unsubscribe/:trackingId', async (req: Request, res: Response) => {
  const { trackingId } = req.params;
  const { reason, comment } = req.body;
  const userAgent = req.get('User-Agent');
  const ipAddress = req.ip || req.connection.remoteAddress;

  try {
    const fullReason = comment ? `${reason}: ${comment}` : reason;
    
    const success = await trackingService.trackUnsubscribe(
      trackingId,
      fullReason,
      userAgent,
      ipAddress
    );

    if (success) {
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Désabonnement confirmé</title>
          <meta charset="utf-8">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background-color: #f8f9fa;
            }
            .container { 
              max-width: 500px; 
              margin: 0 auto; 
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .success { color: #28a745; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 class="success">Désabonnement confirmé</h1>
            <p>Vous avez été supprimé avec succès de notre liste de diffusion.</p>
            <p>Vous ne recevrez plus d'emails de notre part.</p>
            <p><small>Si vous changez d'avis, vous pouvez toujours vous réabonner via notre site web.</small></p>
          </div>
        </body>
        </html>
      `);
    } else {
      throw new Error('Failed to process unsubscribe');
    }
  } catch (error) {
    logger.error('Error processing unsubscribe', {
      trackingId,
      error: error.message
    });
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Erreur</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .container { max-width: 500px; margin: 0 auto; }
          .error { color: #dc3545; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1 class="error">Erreur</h1>
          <p>Une erreur s'est produite lors du traitement de votre demande.</p>
          <p>Veuillez réessayer plus tard ou nous contacter directement.</p>
        </div>
      </body>
      </html>
    `);
  }
});

export default router;