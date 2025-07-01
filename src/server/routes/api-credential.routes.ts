import { Router } from 'express';
import { authenticateUser, requireOrganization, requireRole, AuthRequest } from '../middleware/auth';
import { ApiCredentialService } from '../services/api-credential.service';
import { WooCommerceFactory } from '../services/woocommerce-factory.service';
import { UserRole } from '@prisma/client';

const router = Router();

// All routes require authentication and organization
router.use(authenticateUser);
router.use(requireOrganization);

// List all credentials for organization
router.get('/credentials', async (req: AuthRequest, res) => {
  try {
    const credentials = await ApiCredentialService.listCredentials(req.organizationId!);
    res.json(credentials);
  } catch (error) {
    console.error('Error listing credentials:', error);
    res.status(500).json({ error: 'Failed to list credentials' });
  }
});

// Create new credential
router.post(
  '/credentials',
  requireRole(UserRole.OWNER, UserRole.ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const { service, name, credentials } = req.body;
      
      if (!service || !name || !credentials) {
        return res.status(400).json({ error: 'Service, name, and credentials are required' });
      }
      
      // Validate credentials based on service type
      if (service === 'woocommerce') {
        if (!credentials.apiUrl || !credentials.consumerKey || !credentials.consumerSecret) {
          return res.status(400).json({
            error: 'WooCommerce credentials must include apiUrl, consumerKey, and consumerSecret',
          });
        }
      } else if (service === 'gemini') {
        if (!credentials.apiKey) {
          return res.status(400).json({
            error: 'Gemini credentials must include apiKey',
          });
        }
      }
      
      const credential = await ApiCredentialService.createCredential(
        req.organizationId!,
        service,
        name,
        credentials
      );
      
      // Clear WooCommerce cache if applicable
      if (service === 'woocommerce') {
        WooCommerceFactory.clearCache(req.organizationId!);
      }
      
      res.status(201).json({
        id: credential.id,
        service: credential.service,
        name: credential.name,
        isActive: credential.isActive,
        createdAt: credential.createdAt,
      });
    } catch (error) {
      console.error('Error creating credential:', error);
      res.status(500).json({ error: 'Failed to create credential' });
    }
  }
);

// Update credential
router.patch(
  '/credentials/:id',
  requireRole(UserRole.OWNER, UserRole.ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const { name, credentials, isActive } = req.body;
      
      const updated = await ApiCredentialService.updateCredential(
        req.params.id,
        req.organizationId!,
        { name, credentials, isActive }
      );
      
      // Clear WooCommerce cache if applicable
      if (updated.service === 'woocommerce') {
        WooCommerceFactory.clearCache(req.organizationId!);
      }
      
      res.json({
        id: updated.id,
        service: updated.service,
        name: updated.name,
        isActive: updated.isActive,
        updatedAt: updated.updatedAt,
      });
    } catch (error) {
      console.error('Error updating credential:', error);
      res.status(500).json({ error: 'Failed to update credential' });
    }
  }
);

// Delete credential
router.delete(
  '/credentials/:id',
  requireRole(UserRole.OWNER),
  async (req: AuthRequest, res) => {
    try {
      const credential = await ApiCredentialService.deleteCredential(
        req.params.id,
        req.organizationId!
      );
      
      // Clear WooCommerce cache if applicable
      if (credential.service === 'woocommerce') {
        WooCommerceFactory.clearCache(req.organizationId!);
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Error deleting credential:', error);
      res.status(500).json({ error: 'Failed to delete credential' });
    }
  }
);

// Test WooCommerce connection
router.post('/credentials/test/woocommerce', async (req: AuthRequest, res) => {
  try {
    const credentials = await ApiCredentialService.getWooCommerceCredentials(req.organizationId!);
    
    if (!credentials) {
      return res.status(404).json({ error: 'WooCommerce credentials not found' });
    }
    
    // Try to fetch store info
    const client = await WooCommerceFactory.getClient(req.organizationId!);
    const response = await client.get('/system_status');
    
    res.json({
      success: true,
      storeInfo: {
        name: response.data.environment?.site_title,
        url: response.data.environment?.site_url,
        wcVersion: response.data.environment?.version,
      },
    });
  } catch (error: any) {
    console.error('Error testing WooCommerce connection:', error);
    res.status(400).json({
      success: false,
      error: error.response?.data?.message || 'Failed to connect to WooCommerce',
    });
  }
});

export default router;