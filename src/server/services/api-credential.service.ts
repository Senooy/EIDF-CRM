import { prisma } from '../db/prisma';
import { EncryptionService } from './encryption.service';
import { ApiCredential } from '@prisma/client';

interface WooCommerceCredentials {
  apiUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

interface GeminiCredentials {
  apiKey: string;
}

export class ApiCredentialService {
  static async createCredential(
    organizationId: string,
    service: string,
    name: string,
    credentials: any
  ) {
    // Encrypt the credentials
    const encryptedCredentials = EncryptionService.encryptObject(credentials);
    
    return prisma.apiCredential.create({
      data: {
        organizationId,
        service,
        name,
        credentials: encryptedCredentials,
      },
    });
  }
  
  static async getCredential(
    organizationId: string,
    service: string,
    name?: string
  ): Promise<ApiCredential | null> {
    const where: any = {
      organizationId,
      service,
      isActive: true,
    };
    
    if (name) {
      where.name = name;
    }
    
    const credential = await prisma.apiCredential.findFirst({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    if (credential) {
      // Update last used timestamp
      await prisma.apiCredential.update({
        where: { id: credential.id },
        data: { lastUsedAt: new Date() },
      });
    }
    
    return credential;
  }
  
  static async getDecryptedCredentials<T = any>(
    organizationId: string,
    service: string,
    name?: string
  ): Promise<T | null> {
    const credential = await this.getCredential(organizationId, service, name);
    
    if (!credential) {
      return null;
    }
    
    try {
      return EncryptionService.decryptObject<T>(credential.credentials as string);
    } catch (error) {
      console.error('Failed to decrypt credentials:', error);
      return null;
    }
  }
  
  static async getWooCommerceCredentials(
    organizationId: string
  ): Promise<WooCommerceCredentials | null> {
    return this.getDecryptedCredentials<WooCommerceCredentials>(
      organizationId,
      'woocommerce'
    );
  }
  
  static async getGeminiCredentials(
    organizationId: string
  ): Promise<GeminiCredentials | null> {
    return this.getDecryptedCredentials<GeminiCredentials>(
      organizationId,
      'gemini'
    );
  }
  
  static async updateCredential(
    id: string,
    organizationId: string,
    updates: {
      name?: string;
      credentials?: any;
      isActive?: boolean;
    }
  ) {
    const data: any = {};
    
    if (updates.name !== undefined) {
      data.name = updates.name;
    }
    
    if (updates.credentials !== undefined) {
      data.credentials = EncryptionService.encryptObject(updates.credentials);
    }
    
    if (updates.isActive !== undefined) {
      data.isActive = updates.isActive;
    }
    
    return prisma.apiCredential.update({
      where: {
        id,
        organizationId, // Ensure user can only update their own org's credentials
      },
      data,
    });
  }
  
  static async deleteCredential(id: string, organizationId: string) {
    return prisma.apiCredential.delete({
      where: {
        id,
        organizationId, // Ensure user can only delete their own org's credentials
      },
    });
  }
  
  static async listCredentials(organizationId: string) {
    const credentials = await prisma.apiCredential.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
    
    // Return credentials without decrypting (for security)
    return credentials.map(cred => ({
      id: cred.id,
      service: cred.service,
      name: cred.name,
      isActive: cred.isActive,
      lastUsedAt: cred.lastUsedAt,
      createdAt: cred.createdAt,
      updatedAt: cred.updatedAt,
    }));
  }
}