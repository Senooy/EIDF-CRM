import axios, { AxiosInstance } from 'axios';
import { ApiCredentialService } from './api-credential.service';

interface WooCommerceConfig {
  apiUrl: string;
  consumerKey: string;
  consumerSecret: string;
}

export class WooCommerceFactory {
  private static instances: Map<string, AxiosInstance> = new Map();
  private static configCache: Map<string, { config: WooCommerceConfig; timestamp: number }> = new Map();
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  static async getClient(organizationId: string): Promise<AxiosInstance> {
    // Check if we have a cached instance
    const cacheKey = `wc_${organizationId}`;
    const cachedInstance = this.instances.get(cacheKey);
    
    if (cachedInstance) {
      // Check if config is still valid
      const cachedConfig = this.configCache.get(cacheKey);
      if (cachedConfig && Date.now() - cachedConfig.timestamp < this.CACHE_TTL) {
        return cachedInstance;
      }
    }
    
    // Get credentials from database
    const credentials = await ApiCredentialService.getWooCommerceCredentials(organizationId);
    
    if (!credentials) {
      throw new Error('WooCommerce credentials not found for organization');
    }
    
    // Create new axios instance
    const instance = axios.create({
      baseURL: `${credentials.apiUrl}/wp-json/wc/v3`,
      auth: {
        username: credentials.consumerKey,
        password: credentials.consumerSecret,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Add response interceptor for error handling
    instance.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error(`WooCommerce API error for org ${organizationId}:`, error.message);
        throw error;
      }
    );
    
    // Cache the instance and config
    this.instances.set(cacheKey, instance);
    this.configCache.set(cacheKey, {
      config: credentials,
      timestamp: Date.now(),
    });
    
    return instance;
  }
  
  static clearCache(organizationId?: string) {
    if (organizationId) {
      const cacheKey = `wc_${organizationId}`;
      this.instances.delete(cacheKey);
      this.configCache.delete(cacheKey);
    } else {
      // Clear all caches
      this.instances.clear();
      this.configCache.clear();
    }
  }
  
  // Proxy methods for common WooCommerce operations
  static async getProducts(organizationId: string, params?: any) {
    const client = await this.getClient(organizationId);
    return client.get('/products', { params });
  }
  
  static async getProduct(organizationId: string, productId: string) {
    const client = await this.getClient(organizationId);
    return client.get(`/products/${productId}`);
  }
  
  static async updateProduct(organizationId: string, productId: string, data: any) {
    const client = await this.getClient(organizationId);
    return client.put(`/products/${productId}`, data);
  }
  
  static async getOrders(organizationId: string, params?: any) {
    const client = await this.getClient(organizationId);
    return client.get('/orders', { params });
  }
  
  static async getOrder(organizationId: string, orderId: string) {
    const client = await this.getClient(organizationId);
    return client.get(`/orders/${orderId}`);
  }
  
  static async updateOrder(organizationId: string, orderId: string, data: any) {
    const client = await this.getClient(organizationId);
    return client.put(`/orders/${orderId}`, data);
  }
  
  static async getCustomers(organizationId: string, params?: any) {
    const client = await this.getClient(organizationId);
    return client.get('/customers', { params });
  }
  
  static async getCustomer(organizationId: string, customerId: string) {
    const client = await this.getClient(organizationId);
    return client.get(`/customers/${customerId}`);
  }
  
  static async getReports(organizationId: string, reportType: string, params?: any) {
    const client = await this.getClient(organizationId);
    return client.get(`/reports/${reportType}`, { params });
  }
}