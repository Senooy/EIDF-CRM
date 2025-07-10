import { configService } from '@/lib/db/config';
import { ApplicationError, ApiError, NetworkError, errorHandler } from '@/lib/error-handler';
import { logger } from '@/lib/logger';

// Custom error classes for better error handling
export class NoActiveSiteError extends ApplicationError {
  constructor() {
    super('Aucun site actif configuré. Veuillez sélectionner un site dans les paramètres.', 'NO_ACTIVE_SITE');
    this.name = 'NoActiveSiteError';
  }
}

export class SiteNotFoundError extends ApplicationError {
  constructor(siteId: number) {
    super(`Site avec l'ID ${siteId} non trouvé. Veuillez vérifier la configuration.`, 'SITE_NOT_FOUND', { siteId });
    this.name = 'SiteNotFoundError';
  }
}

export class MissingCredentialsError extends ApplicationError {
  constructor(siteId: number, credType: 'WordPress' | 'WooCommerce') {
    super(`Les identifiants ${credType} ne sont pas configurés pour ce site (ID: ${siteId}). Veuillez les ajouter dans les paramètres.`, 'MISSING_CREDENTIALS', { siteId, credType });
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
    let url: URL;
    
    if (USE_PROXY) {
      // Use proxy for development
      url = new URL(`${PROXY_URL}${this.config.baseUrl}/wp-json/wp/v2/${endpoint}`);
    } else {
      // Direct URL for production
      url = new URL(`${this.config.baseUrl}/wp-json/wp/v2/${endpoint}`);
    }
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString());
      });
    }

    logger.debug(`WordPress API request: GET ${url.toString()}`, { proxy: USE_PROXY }, 'WordPressClient');

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: await this.getWPHeaders(),
      });

      if (!response.ok) {
        let errorMessage = `WordPress API error: ${response.status} ${response.statusText}`;
        let errorDetails: any = null;
        
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          }
          errorDetails = errorData;
        } catch (e) {
          // Response might not be JSON
          try {
            const errorText = await response.text();
            if (errorText) {
              errorMessage += ` - ${errorText.substring(0, 200)}`;
            }
          } catch (textError) {
            // Ignore text parsing errors
          }
        }
        
        logger.error(`WordPress API error for ${endpoint}`, { 
          status: response.status, 
          message: errorMessage,
          details: errorDetails,
          url: url.toString()
        }, 'WordPressClient');
        
        throw new ApiError(errorMessage, response.status, errorDetails);
      }

      const data = await response.json();
      logger.debug(`WordPress API response for ${endpoint}`, { 
        count: Array.isArray(data) ? data.length : 1 
      }, 'WordPressClient');
      
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error(`WordPress API network error for ${endpoint}`, error, 'WordPressClient');
      throw new NetworkError(`Failed to connect to WordPress API: ${error.message}`);
    }
  }

  async postWordPressData(endpoint: string, data: any): Promise<any> {
    let url: URL;
    
    if (USE_PROXY) {
      // Use proxy for development
      url = new URL(`${PROXY_URL}${this.config.baseUrl}/wp-json/wp/v2/${endpoint}`);
    } else {
      // Direct URL for production
      url = new URL(`${this.config.baseUrl}/wp-json/wp/v2/${endpoint}`);
    }
    
    logger.debug(`WordPress API request: POST ${url.toString()}`, { proxy: USE_PROXY }, 'WordPressClient');
    
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: await this.getWPHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      logger.error(`WordPress API error for POST ${endpoint}`, { 
        status: response.status, 
        statusText: response.statusText
      }, 'WordPressClient');
      throw new ApiError(`WordPress API error: ${response.statusText}`, response.status);
    }

    return response.json();
  }

  // WooCommerce API Methods
  async getWooCommerceData(endpoint: string, params?: Record<string, any>): Promise<any> {
    let url: URL;
    
    if (USE_PROXY) {
      // Use proxy for development
      url = new URL(`${PROXY_URL}${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    } else {
      // Direct URL for production
      url = new URL(`${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    }
    
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
      let errorMessage = `WooCommerce API error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
          if (errorData.message) {
            errorMessage += `: ${errorData.message}`;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const errorText = await response.text();
          if (errorText) {
            errorMessage += ` - ${errorText.substring(0, 200)}`;
          }
        } catch (textError) {
          // Ignore text parsing errors
        }
      }
      throw new ApiError(errorMessage, 401);
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
    let url: URL;
    
    if (USE_PROXY) {
      // Use proxy for development
      url = new URL(`${PROXY_URL}${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    } else {
      // Direct URL for production
      url = new URL(`${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    }
    
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
      throw new ApiError(`WooCommerce API error: ${response.statusText}`, response.status);
    }

    return response.json();
  }

  async putWooCommerceData(endpoint: string, data: any): Promise<any> {
    let url: URL;
    
    if (USE_PROXY) {
      // Use proxy for development
      url = new URL(`${PROXY_URL}${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    } else {
      // Direct URL for production
      url = new URL(`${this.config.baseUrl}/wp-json/wc/v3/${endpoint}`);
    }
    
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
      throw new ApiError(`WooCommerce API error: ${response.statusText}`, response.status);
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
      throw new ApiError(`WooCommerce API error: ${response.statusText}`, response.status);
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