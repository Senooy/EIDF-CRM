import { Router } from 'express';
import { authenticateUser, requireRole, AuthRequest } from '../middleware/auth';
import { OrganizationService } from '../services/organization.service';
import { UserRole } from '@prisma/client';

const router = Router();

// Get current user's organizations
router.get('/my-organizations', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const organizations = await OrganizationService.getUserOrganizations(req.user!.uid);
    res.json(organizations);
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

// Create new organization
router.post('/organizations', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const { name, website, logo } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Organization name is required' });
    }
    
    const organization = await OrganizationService.createOrganization(
      name,
      req.user!.uid,
      { website, logo }
    );
    
    res.status(201).json(organization);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: 'Failed to create organization' });
  }
});

// Get organization details
router.get('/organizations/:id', authenticateUser, async (req: AuthRequest, res) => {
  try {
    const organization = await OrganizationService.getOrganizationById(req.params.id);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // Check if user has access
    const hasAccess = organization.users.some(u => u.userId === req.user!.uid);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: 'Failed to fetch organization' });
  }
});

// Add user to organization
router.post(
  '/organizations/:id/users',
  authenticateUser,
  requireRole(UserRole.OWNER, UserRole.ADMIN),
  async (req: AuthRequest, res) => {
    try {
      const { userId, role = UserRole.MEMBER } = req.body;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }
      
      const orgUser = await OrganizationService.addUserToOrganization(
        req.params.id,
        userId,
        role
      );
      
      res.status(201).json(orgUser);
    } catch (error: any) {
      console.error('Error adding user to organization:', error);
      if (error.message.includes('user limit')) {
        return res.status(403).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to add user to organization' });
    }
  }
);

// Update user role
router.patch(
  '/organizations/:id/users/:userId',
  authenticateUser,
  requireRole(UserRole.OWNER),
  async (req: AuthRequest, res) => {
    try {
      const { role } = req.body;
      
      if (!role || !Object.values(UserRole).includes(role)) {
        return res.status(400).json({ error: 'Valid role is required' });
      }
      
      const updatedUser = await OrganizationService.updateUserRole(
        req.params.id,
        req.params.userId,
        role
      );
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error('Error updating user role:', error);
      if (error.message.includes('last owner')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update user role' });
    }
  }
);

// Remove user from organization
router.delete(
  '/organizations/:id/users/:userId',
  authenticateUser,
  requireRole(UserRole.OWNER, UserRole.ADMIN),
  async (req: AuthRequest, res) => {
    try {
      await OrganizationService.removeUserFromOrganization(
        req.params.id,
        req.params.userId
      );
      
      res.status(204).send();
    } catch (error: any) {
      console.error('Error removing user from organization:', error);
      if (error.message.includes('last owner')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to remove user from organization' });
    }
  }
);

export default router;