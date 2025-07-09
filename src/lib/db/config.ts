import Dexie, { Table } from 'dexie';
import CryptoJS from 'crypto-js';

export interface WordPressSite {
  id?: number;
  name: string;
  url: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WooCommerceCredentials {
  id?: number;
  siteId: number;
  consumerKey: string;
  consumerSecret: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WordPressCredentials {
  id?: number;
  siteId: number;
  username: string;
  applicationPassword: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GeminiConfig {
  id?: number;
  apiKey: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  id?: number;
  userId: string;
  currentSiteId?: number;
  theme: 'light' | 'dark' | 'system';
  language: string;
  dashboardLayout?: string;
  createdAt: Date;
  updatedAt: Date;
}

class ConfigDatabase extends Dexie {
  sites!: Table<WordPressSite>;
  wooCredentials!: Table<WooCommerceCredentials>;
  wpCredentials!: Table<WordPressCredentials>;
  geminiConfig!: Table<GeminiConfig>;
  preferences!: Table<UserPreferences>;

  constructor() {
    super('WordPressMultiSiteConfig');
    
    this.version(1).stores({
      sites: '++id, name, url, isActive',
      wooCredentials: '++id, siteId',
      wpCredentials: '++id, siteId',
      geminiConfig: '++id, isActive',
      preferences: '++id, userId, currentSiteId'
    });
  }
}

export const db = new ConfigDatabase();

// Encryption utilities
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-encryption-key-change-in-production';

export const encrypt = (text: string): string => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decrypt = (encryptedText: string): string => {
  const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// Helper functions
export const configService = {
  // Sites management
  async addSite(site: Omit<WordPressSite, 'id' | 'createdAt' | 'updatedAt'>): Promise<number> {
    const now = new Date();
    
    // Check if this is the first site
    const existingSites = await db.sites.count();
    const isFirstSite = existingSites === 0;
    
    return await db.sites.add({
      ...site,
      isActive: isFirstSite ? true : (site.isActive || false), // Set as active if it's the first site
      createdAt: now,
      updatedAt: now
    });
  },

  async updateSite(id: number, updates: Partial<WordPressSite>): Promise<void> {
    await db.sites.update(id, {
      ...updates,
      updatedAt: new Date()
    });
  },

  async deleteSite(id: number): Promise<void> {
    await db.transaction('rw', db.sites, db.wooCredentials, db.wpCredentials, async () => {
      await db.sites.delete(id);
      await db.wooCredentials.where('siteId').equals(id).delete();
      await db.wpCredentials.where('siteId').equals(id).delete();
    });
  },

  async getAllSites(): Promise<WordPressSite[]> {
    return await db.sites.toArray();
  },

  async getActiveSite(): Promise<WordPressSite | undefined> {
    let activeSite = await db.sites.where('isActive').equals(1).first();
    
    // If no active site but sites exist, activate the first one
    if (!activeSite) {
      const allSites = await db.sites.toArray();
      if (allSites.length > 0) {
        await this.setActiveSite(allSites[0].id!);
        activeSite = allSites[0];
      }
    }
    
    return activeSite;
  },

  async setActiveSite(id: number): Promise<void> {
    await db.transaction('rw', db.sites, async () => {
      await db.sites.where('isActive').equals(1).modify({ isActive: false });
      await db.sites.update(id, { isActive: true, updatedAt: new Date() });
    });
  },

  // WooCommerce credentials
  async saveWooCredentials(siteId: number, consumerKey: string, consumerSecret: string): Promise<void> {
    const encrypted = {
      siteId,
      consumerKey: encrypt(consumerKey),
      consumerSecret: encrypt(consumerSecret),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const existing = await db.wooCredentials.where('siteId').equals(siteId).first();
    if (existing) {
      await db.wooCredentials.update(existing.id!, {
        ...encrypted,
        createdAt: existing.createdAt
      });
    } else {
      await db.wooCredentials.add(encrypted);
    }
  },

  async getWooCredentials(siteId: number): Promise<{ consumerKey: string; consumerSecret: string } | null> {
    const creds = await db.wooCredentials.where('siteId').equals(siteId).first();
    if (!creds) return null;

    return {
      consumerKey: decrypt(creds.consumerKey),
      consumerSecret: decrypt(creds.consumerSecret)
    };
  },

  // WordPress credentials
  async saveWPCredentials(siteId: number, username: string, applicationPassword: string): Promise<void> {
    const encrypted = {
      siteId,
      username: encrypt(username),
      applicationPassword: encrypt(applicationPassword),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const existing = await db.wpCredentials.where('siteId').equals(siteId).first();
    if (existing) {
      await db.wpCredentials.update(existing.id!, {
        ...encrypted,
        createdAt: existing.createdAt
      });
    } else {
      await db.wpCredentials.add(encrypted);
    }
  },

  async getWPCredentials(siteId: number): Promise<{ username: string; applicationPassword: string } | null> {
    const creds = await db.wpCredentials.where('siteId').equals(siteId).first();
    if (!creds) return null;

    return {
      username: decrypt(creds.username),
      applicationPassword: decrypt(creds.applicationPassword)
    };
  },

  // Gemini configuration
  async saveGeminiConfig(apiKey: string): Promise<void> {
    const encrypted = {
      apiKey: encrypt(apiKey),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const existing = await db.geminiConfig.where('isActive').equals(1).first();
    if (existing) {
      await db.geminiConfig.update(existing.id!, {
        ...encrypted,
        createdAt: existing.createdAt
      });
    } else {
      await db.geminiConfig.add(encrypted);
    }
  },

  async getGeminiConfig(): Promise<string | null> {
    const config = await db.geminiConfig.where('isActive').equals(1).first();
    if (!config) return null;

    return decrypt(config.apiKey);
  },

  // User preferences
  async saveUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const existing = await db.preferences.where('userId').equals(userId).first();
    const now = new Date();

    if (existing) {
      await db.preferences.update(existing.id!, {
        ...preferences,
        updatedAt: now
      });
    } else {
      await db.preferences.add({
        userId,
        theme: 'system',
        language: 'fr',
        ...preferences,
        createdAt: now,
        updatedAt: now
      });
    }
  },

  async getUserPreferences(userId: string): Promise<UserPreferences | null> {
    return await db.preferences.where('userId').equals(userId).first() || null;
  },

  // Test connection
  async testWordPressConnection(siteUrl: string, username: string, appPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${siteUrl}/wp-json/wp/v2/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + btoa(`${username}:${appPassword}`),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true, message: 'Connexion réussie!' };
      } else {
        return { success: false, message: `Erreur ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}` };
    }
  },

  async testWooCommerceConnection(siteUrl: string, consumerKey: string, consumerSecret: string): Promise<{ success: boolean; message: string }> {
    try {
      // Basic test with system status endpoint
      const url = new URL(`${siteUrl}/wp-json/wc/v3/system_status`);
      url.searchParams.append('consumer_key', consumerKey);
      url.searchParams.append('consumer_secret', consumerSecret);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true, message: 'Connexion WooCommerce réussie!' };
      } else {
        return { success: false, message: `Erreur ${response.status}: ${response.statusText}` };
      }
    } catch (error) {
      return { success: false, message: `Erreur de connexion: ${error instanceof Error ? error.message : 'Erreur inconnue'}` };
    }
  },

  // Clear all data (for logout or reset)
  async clearAllData(): Promise<void> {
    await db.transaction('rw', db.sites, db.wooCredentials, db.wpCredentials, db.geminiConfig, db.preferences, async () => {
      await db.sites.clear();
      await db.wooCredentials.clear();
      await db.wpCredentials.clear();
      await db.geminiConfig.clear();
      await db.preferences.clear();
    });
  }
};