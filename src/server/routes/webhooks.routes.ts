import { Router, Request, Response } from 'express';
import { bounceManagementService } from '../services/bounce-management.service';
import { unsubscribeManagementService } from '../services/unsubscribe-management.service';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

const router = Router();

/**
 * Vérifie la signature webhook SendGrid
 */
function verifySendGridSignature(req: Request): boolean {
  const signature = req.get('X-Twilio-Email-Event-Webhook-Signature');
  const timestamp = req.get('X-Twilio-Email-Event-Webhook-Timestamp');
  
  if (!signature || !timestamp) return false;

  const publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY;
  if (!publicKey) return false;

  // Vérifier la signature selon la doc SendGrid
  const payload = timestamp + JSON.stringify(req.body);
  const verify = crypto.createVerify('sha256WithRSAEncryption');
  verify.update(payload, 'utf-8');
  
  return verify.verify(publicKey, signature, 'base64');
}

/**
 * Vérifie la signature webhook Mailgun
 */
function verifyMailgunSignature(req: Request): boolean {
  const signature = req.body.signature;
  if (!signature) return false;

  const signingKey = process.env.MAILGUN_WEBHOOK_SIGNING_KEY;
  if (!signingKey) return false;

  const hmac = crypto.createHmac('sha256', signingKey);
  hmac.update(signature.timestamp + signature.token);
  const computedSignature = hmac.digest('hex');
  
  return computedSignature === signature.signature;
}

// Webhook SendGrid pour bounces et complaints
router.post('/webhooks/sendgrid', async (req: Request, res: Response) => {
  try {
    // Vérifier la signature si configurée
    if (process.env.SENDGRID_WEBHOOK_PUBLIC_KEY) {
      if (!verifySendGridSignature(req)) {
        logger.warn('Invalid SendGrid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      if (['bounce', 'blocked', 'dropped'].includes(event.event)) {
        await bounceManagementService.processBounceWebhook('sendgrid', event);
      } else if (['spamreport', 'unsubscribe'].includes(event.event)) {
        // Traiter comme désabonnement
        await unsubscribeManagementService.processUnsubscribe({
          email: event.email,
          organizationId: event.organizationId || 'default', // À adapter selon votre logique
          reason: event.event === 'spamreport' ? 'Spam complaint' : 'Unsubscribe request',
          source: 'complaint'
        });
      }
    }

    logger.info('SendGrid webhook processed', { eventCount: events.length });
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('SendGrid webhook error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook Amazon SES pour bounces et complaints
router.post('/webhooks/ses', async (req: Request, res: Response) => {
  try {
    const message = req.body;
    
    // SES envoie d'abord une confirmation d'abonnement SNS
    if (message.Type === 'SubscriptionConfirmation') {
      logger.info('SES SNS subscription confirmation', { 
        topicArn: message.TopicArn,
        subscribeUrl: message.SubscribeURL 
      });
      return res.status(200).json({ success: true });
    }

    if (message.Type === 'Notification') {
      const notification = JSON.parse(message.Message);
      
      if (notification.notificationType === 'Bounce') {
        await bounceManagementService.processBounceWebhook('ses', notification);
      } else if (notification.notificationType === 'Complaint') {
        // Traiter les complaints comme des désabonnements automatiques
        const complaint = notification.complaint;
        for (const recipient of complaint.complainedRecipients) {
          await unsubscribeManagementService.processUnsubscribe({
            email: recipient.emailAddress,
            organizationId: 'default', // À adapter
            reason: 'SES complaint',
            source: 'complaint'
          });
        }
      }
    }

    logger.info('SES webhook processed', { messageType: message.Type });
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('SES webhook error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook Mailgun pour bounces et unsubscribes
router.post('/webhooks/mailgun', async (req: Request, res: Response) => {
  try {
    // Vérifier la signature si configurée
    if (process.env.MAILGUN_WEBHOOK_SIGNING_KEY) {
      if (!verifyMailgunSignature(req)) {
        logger.warn('Invalid Mailgun webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const eventData = req.body['event-data'];
    
    if (['failed', 'rejected'].includes(eventData.event)) {
      await bounceManagementService.processBounceWebhook('mailgun', eventData);
    } else if (['unsubscribed', 'complained'].includes(eventData.event)) {
      await unsubscribeManagementService.processUnsubscribe({
        email: eventData.recipient,
        organizationId: 'default', // À adapter
        reason: eventData.event === 'complained' ? 'Spam complaint' : 'Unsubscribe request',
        source: eventData.event === 'complained' ? 'complaint' : 'campaign'
      });
    }

    logger.info('Mailgun webhook processed', { event: eventData.event });
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Mailgun webhook error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Webhook générique Postfix (logs parsés)
router.post('/webhooks/postfix', async (req: Request, res: Response) => {
  try {
    // Vérifier une clé API simple
    const apiKey = req.get('X-API-Key');
    if (process.env.POSTFIX_WEBHOOK_API_KEY && apiKey !== process.env.POSTFIX_WEBHOOK_API_KEY) {
      logger.warn('Invalid Postfix webhook API key');
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { messageId, email, status, reason } = req.body;

    if (['bounced', 'rejected', 'deferred'].includes(status)) {
      const bounceType = ['bounced', 'rejected'].includes(status) ? 'hard' : 'soft';
      
      await bounceManagementService.processBounceWebhook('postfix', {
        messageId,
        email,
        bounceType,
        reason
      });
    }

    logger.info('Postfix webhook processed', { status, email });
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Postfix webhook error', { error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Endpoint pour les désabonnements via token
router.get('/webhooks/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lien invalide</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>Lien invalide</h1>
          <p>Ce lien de désabonnement n'est pas valide.</p>
        </body>
        </html>
      `);
    }

    const tokenData = unsubscribeManagementService.validateUnsubscribeToken(token);
    
    if (!tokenData.valid) {
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Lien expiré</title>
          <meta charset="utf-8">
        </head>
        <body>
          <h1>Lien expiré</h1>
          <p>Ce lien de désabonnement a expiré.</p>
        </body>
        </html>
      `);
    }

    // Vérifier si déjà désabonné
    const { unsubscribed } = await unsubscribeManagementService.isUnsubscribed(
      tokenData.email!,
      tokenData.organizationId!
    );

    if (unsubscribed) {
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
            <h1 class="success">Déjà désabonné</h1>
            <p>L'adresse <strong>${tokenData.email}</strong> est déjà désabonnée de notre liste de diffusion.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Afficher le formulaire de désabonnement
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
          .btn:hover { background-color: #c82333; }
          .btn-secondary {
            background-color: #6c757d;
          }
          .btn-secondary:hover { background-color: #5a6268; }
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
          <p><strong>Email :</strong> ${tokenData.email}</p>
          
          <form method="POST" action="/api/webhooks/unsubscribe">
            <input type="hidden" name="token" value="${token}">
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
    logger.error('Unsubscribe page error', { error: error.message });
    res.status(500).send('Une erreur s\'est produite.');
  }
});

// Traitement du formulaire de désabonnement
router.post('/webhooks/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { token, reason, comment } = req.body;
    
    const tokenData = unsubscribeManagementService.validateUnsubscribeToken(token);
    
    if (!tokenData.valid) {
      return res.status(400).send('Token invalide ou expiré.');
    }

    const fullReason = comment ? `${reason}: ${comment}` : reason;
    
    const success = await unsubscribeManagementService.processUnsubscribe({
      email: tokenData.email!,
      organizationId: tokenData.organizationId!,
      campaignId: tokenData.campaignId,
      reason: fullReason,
      source: 'campaign',
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip
    });

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
    logger.error('Unsubscribe processing error', { error: error.message });
    res.status(500).send('Une erreur s\'est produite lors du traitement de votre demande.');
  }
});

export default router;