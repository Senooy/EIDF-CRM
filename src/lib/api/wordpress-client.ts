import { configService } from '@/lib/db/config';

// Custom error classes for better error handling
export class NoActiveSiteError extends Error {
  constructor() {
    super('Aucun site actif configuré. Veuillez sélectionner un site dans les paramètres.');
    this.name = 'NoActiveSiteError';
  }
}

export class SiteNotFoundError extends Error {
  constructor(siteId: number) {
    super(`Site avec l'ID ${siteId} non trouvé. Veuillez vérifier la configuration.`);
    this.name = 'SiteNotFoundError';
  }
}

export class MissingCredentialsError extends Error {
  constructor(siteId: number, credType: 'WordPress' | 'WooCommerce') {
    super(`Les identifiants ${credType} ne sont pas configurés pour ce site (ID: ${siteId}). Veuillez les ajouter dans les paramètres.`);
    this.name = 'MissingCredentialsError';
  }
}

// Proxy configuration for development
const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3002/proxy/';
const USE_PROXY = import.meta.env.VITE_USE_PROXY === 'true' || import.meta.env.DEV;

export interface WordPressClientConfig {
  siteId: number;
  baseUrl: string;
  wpUsername?: string;
  wpPassword?: string;
  wooConsumerKey?: string;
  wooConsumerSecret?: string;
}

export class WordPressClient {
  private config: WordPressClientConfig;
  
  constructor(config: WordPressClientConfig) {
    this.config = {
      ...config,
      baseUrl: config.baseUrl.replace(/\/$/, '') // Remove trailing slash
    };
  }

  // WordPress REST API Authentication
  private async getWPHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.config.wpUsername && this.config.wpPassword) {
      headers['Authorization'] = 'Basic ' + btoa(`${this.config.wpUsername}:${this.config.wpPassword}`);
    }

    return headers;
  }

  // WooCommerce OAuth 1.0a signature generation
  private generateOAuthSignature(method: string, url: string, params: Record<string, string>): string {
    // This is a simplified version. In production, use a proper OAuth library
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2);
    
    const oauthParams = {
      oauth_consumer_key: this.config.wooConsumerKey || '',
      oauth_timestamp: timestamp,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_version: '1.0',
    };

    // For simplicity, we'll use query parameters for authentication
    return new URLSearchParams({
      ...params,
      consumer_key: this.config.wooConsumerKey || '',
      consumer_secret: this.config.wooConsumerSecret || '',
    }).toString();
  }

  // WordPress API Methods
  async getWordPressData(endpoint: string, params?: Record<string, any>): Promise<any> {
    const url = new URL(`${this.config.baseUrl}/wp-json/wp/v2/${endpoint}`);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: await this.getWPHeaders(),
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async postWordPressData(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${this.config.baseUrl}/wp-json/wp/v2/${endpoint}`, {
      method: 'POST',
      headers: await this.getWPHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`WordPress API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // WooCommerce API Methods
  async getWooCommerceData(endpoint: string, params?: Record<string, any>): Promise<any> {
    const url = new URL(`${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    
    // Add authentication parameters
    url.searchParams.append('consumer_key', this.config.wooConsumerKey || '');
    url.searchParams.append('consumer_secret', this.config.wooConsumerSecret || '');
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    // Extract pagination info from headers
    const totalPages = response.headers.get('x-wp-totalpages');
    const total = response.headers.get('x-wp-total');
    
    const data = await response.json();
    
    // If pagination info exists, return it with the data
    if (totalPages || total) {
      return {
        data,
        pagination: {
          totalPages: totalPages ? parseInt(totalPages) : undefined,
          total: total ? parseInt(total) : undefined,
        }
      };
    }

    return data;
  }

  async postWooCommerceData(endpoint: string, data: any): Promise<any> {
    const url = new URL(`${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    
    // Add authentication parameters
    url.searchParams.append('consumer_key', this.config.wooConsumerKey || '');
    url.searchParams.append('consumer_secret', this.config.wooConsumerSecret || '');

    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async putWooCommerceData(endpoint: string, data: any): Promise<any> {
    const url = new URL(`${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    
    // Add authentication parameters
    url.searchParams.append('consumer_key', this.config.wooConsumerKey || '');
    url.searchParams.append('consumer_secret', this.config.wooConsumerSecret || '');

    const response = await fetch(url.toString(), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async deleteWooCommerceData(endpoint: string): Promise<any> {
    const url = new URL(`${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    
    // Add authentication parameters
    url.searchParams.append('consumer_key', this.config.wooConsumerKey || '');
    url.searchParams.append('consumer_secret', this.config.wooConsumerSecret || '');

    const response = await fetch(url.toString(), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`WooCommerce API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Specific WordPress endpoints
  async getPosts(params?: { per_page?: number; page?: number; search?: string }) {
    return this.getWordPressData('posts', params);
  }

  async getPages(params?: { per_page?: number; page?: number }) {
    return this.getWordPressData('pages', params);
  }

  async getMedia(params?: { per_page?: number; page?: number }) {
    return this.getWordPressData('media', params);
  }

  async getUsers(params?: { per_page?: number; page?: number }) {
    return this.getWordPressData('users', params);
  }

  async getComments(params?: { per_page?: number; page?: number; post?: number }) {
    return this.getWordPressData('comments', params);
  }

  // WooCommerce specific endpoints
  async getOrders(params?: any) {
    return this.getWooCommerceData('orders', params);
  }

  async getOrder(id: number) {
    return this.getWooCommerceData(`orders/${id}`);
  }

  async updateOrder(id: number, data: any) {
    return this.putWooCommerceData(`orders/${id}`, data);
  }

  async getProducts(params?: any) {
    return this.getWooCommerceData('products', params);
  }

  async getProduct(id: number) {
    return this.getWooCommerceData(`products/${id}`);
  }

  async updateProduct(id: number, data: any) {
    return this.putWooCommerceData(`products/${id}`, data);
  }

  async getCustomers(params?: any) {
    return this.getWooCommerceData('customers', params);
  }

  async getCustomer(id: number) {
    return this.getWooCommerceData(`customers/${id}`);
  }

  async getReports(type: string, params?: any) {
    return this.getWooCommerceData(`reports/${type}`, params);
  }

  async getSystemStatus() {
    return this.getWooCommerceData('system_status');
  }
}

// Singleton instance manager
class WordPressClientManager {
  private clients: Map<number, WordPressClient> = new Map();
  private currentSiteId: number | null = null;

  async getClient(siteId?: number): Promise<WordPressClient> {
    // Use provided siteId or current active site
    const targetSiteId = siteId || this.currentSiteId;
    
    if (!targetSiteId) {
      // Get active site from config
      const activeSite = await configService.getActiveSite();
      if (!activeSite || !activeSite.id) {
        throw new NoActiveSiteError();
      }
      this.currentSiteId = activeSite.id;
    }

    const finalSiteId = targetSiteId || this.currentSiteId!;

    // Check if client already exists
    if (this.clients.has(finalSiteId)) {
      return this.clients.get(finalSiteId)!;
    }

    // Create new client
    const site = await configService.getAllSites().then(sites => 
      sites.find(s => s.id === finalSiteId)
    );

    if (!site) {
      throw new SiteNotFoundError(finalSiteId);
    }

    // Get credentials
    const wpCreds = await configService.getWPCredentials(finalSiteId);
    const wooCreds = await configService.getWooCredentials(finalSiteId);

    // Validate that at least one set of credentials is available
    if (!wpCreds && !wooCreds) {
      throw new MissingCredentialsError(finalSiteId, 'WordPress');
    }

    const client = new WordPressClient({
      siteId: finalSiteId,
      baseUrl: site.url,
      wpUsername: wpCreds?.username,
      wpPassword: wpCreds?.applicationPassword,
      wooConsumerKey: wooCreds?.consumerKey,
      wooConsumerSecret: wooCreds?.consumerSecret,
    });

    this.clients.set(finalSiteId, client);
    return client;
  }

  async setCurrentSite(siteId: number): Promise<void> {
    this.currentSiteId = siteId;
    await configService.setActiveSite(siteId);
  }

  clearCache(siteId?: number): void {
    if (siteId) {
      this.clients.delete(siteId);
    } else {
      this.clients.clear();
    }
  }
}

export const wpClientManager = new WordPressClientManager();