import { prisma } from '../db/prisma';
import { Organization, User, UserRole } from '@prisma/client';

export class OrganizationService {
  static async createOrganization(
    name: string,
    ownerId: string,
    additionalData?: {
      website?: string;
      logo?: string;
    }
  ) {
    // Generate a unique slug from the name
    const baseSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    let slug = baseSlug;
    let counter = 1;
    
    // Ensure slug is unique
    while (await prisma.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    // Create organization with owner
    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        ...additionalData,
        users: {
          create: {
            userId: ownerId,
            role: UserRole.OWNER,
          },
        },
        subscription: {
          create: {
            plan: 'FREE',
            status: 'ACTIVE',
          },
        },
      },
      include: {
        users: true,
        subscription: true,
      },
    });
    
    return organization;
  }
  
  static async getOrganizationById(id: string) {
    return prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          include: {
            user: true,
          },
        },
        subscription: true,
      },
    });
  }
  
  static async getUserOrganizations(userId: string) {
    const orgUsers = await prisma.organizationUser.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            subscription: true,
          },
        },
      },
    });
    
    return orgUsers.map(ou => ({
      ...ou.organization,
      role: ou.role,
      joinedAt: ou.joinedAt,
    }));
  }
  
  static async addUserToOrganization(
    organizationId: string,
    userId: string,
    role: UserRole = UserRole.MEMBER
  ) {
    // Check subscription limits
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    });
    
    const currentUserCount = await prisma.organizationUser.count({
      where: { organizationId },
    });
    
    if (subscription && currentUserCount >= subscription.maxUsers) {
      throw new Error('Organization has reached its user limit');
    }
    
    return prisma.organizationUser.create({
      data: {
        organizationId,
        userId,
        role,
      },
    });
  }
  
  static async updateUserRole(
    organizationId: string,
    userId: string,
    newRole: UserRole
  ) {
    // Prevent removing the last owner
    if (newRole !== UserRole.OWNER) {
      const ownerCount = await prisma.organizationUser.count({
        where: {
          organizationId,
          role: UserRole.OWNER,
        },
      });
      
      const currentUser = await prisma.organizationUser.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId,
          },
        },
      });
      
      if (ownerCount === 1 && currentUser?.role === UserRole.OWNER) {
        throw new Error('Cannot remove the last owner');
      }
    }
    
    return prisma.organizationUser.update({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
      data: { role: newRole },
    });
  }
  
  static async removeUserFromOrganization(
    organizationId: string,
    userId: string
  ) {
    // Check if user is the last owner
    const ownerCount = await prisma.organizationUser.count({
      where: {
        organizationId,
        role: UserRole.OWNER,
      },
    });
    
    const userToRemove = await prisma.organizationUser.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
    
    if (ownerCount === 1 && userToRemove?.role === UserRole.OWNER) {
      throw new Error('Cannot remove the last owner');
    }
    
    return prisma.organizationUser.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }
}