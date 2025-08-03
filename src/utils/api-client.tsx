import axios, { AxiosInstance } from 'axios';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';

class ApiClient {
  private axiosInstance: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
    
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 30000,
    });

    // Request interceptor to add auth token
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        try {
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            config.headers.Authorization = `Bearer ${token}`;
          }
          
          // Add organization ID if available
          const organizationId = localStorage.getItem('selectedOrganizationId');
          if (organizationId) {
            config.headers['x-organization-id'] = organizationId;
          }
        } catch (error) {
          console.error('Error getting auth token:', error);
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          toast.error('Session expirée. Veuillez vous reconnecter.');
          // Sign out and redirect to login
          await auth.signOut();
          window.location.href = '/login';
        } else if (error.response?.status === 403) {
          toast.error('Accès refusé. Permissions insuffisantes.');
        } else if (error.response?.status >= 500) {
          toast.error('Erreur serveur. Veuillez réessayer plus tard.');
        }
        return Promise.reject(error);
      }
    );
  }

  // WooCommerce endpoints
  async getOrders(params?: any) {
    const response = await this.axiosInstance.get('/api/wc/orders', { params });
    return response;
  }

  async getOrder(id: string | number) {
    const response = await this.axiosInstance.get(`/api/wc/orders/${id}`);
    return response;
  }

  async updateOrder(id: string | number, data: any) {
    const response = await this.axiosInstance.put(`/api/wc/orders/${id}`, data);
    return response;
  }

  async getOrderNotes(orderId: string | number) {
    const response = await this.axiosInstance.get(`/api/wc/orders/${orderId}/notes`);
    return response;
  }

  async addOrderNote(orderId: string | number, note: string) {
    const response = await this.axiosInstance.post(`/api/wc/orders/${orderId}/notes`, { note });
    return response;
  }

  async createRefund(orderId: string | number, data: any) {
    const response = await this.axiosInstance.post(`/api/wc/orders/${orderId}/refunds`, data);
    return response;
  }

  async getCustomers(params?: any) {
    const response = await this.axiosInstance.get('/api/wc/customers', { params });
    return response;
  }

  async getCustomer(id: string | number) {
    const response = await this.axiosInstance.get(`/api/wc/customers/${id}`);
    return response;
  }

  async getProducts(params?: any) {
    const response = await this.axiosInstance.get('/api/wc/products', { params });
    return response;
  }

  async getProduct(id: string | number) {
    const response = await this.axiosInstance.get(`/api/wc/products/${id}`);
    return response;
  }

  async updateProduct(id: string | number, data: any) {
    const response = await this.axiosInstance.put(`/api/wc/products/${id}`, data);
    return response;
  }

  async getProductCategories(params?: any) {
    const response = await this.axiosInstance.get('/api/wc/products/categories', { params });
    return response;
  }

  async getOrderTotals() {
    const response = await this.axiosInstance.get('/api/wc/reports/orders/totals');
    return response;
  }

  async getSalesReports(params?: any) {
    const response = await this.axiosInstance.get('/api/wc/reports/sales', { params });
    return response;
  }

  // AI endpoints
  async generateProductContent(product: any) {
    const response = await this.axiosInstance.post('/api/ai/generate-product-content', { product });
    return response;
  }

  async generateSingleCallContent(product: any, style?: string) {
    const response = await this.axiosInstance.post('/api/ai/generate-single-call', { product, style });
    return response;
  }

  async batchGenerateContent(products: any[]) {
    const response = await this.axiosInstance.post('/api/ai/batch-generate', { products });
    return response;
  }

  async testAI() {
    const response = await this.axiosInstance.get('/api/ai/test');
    return response;
  }

  // Organization endpoints
  async getOrganizations() {
    const response = await this.axiosInstance.get('/api/organizations');
    return response;
  }

  async createOrganization(data: any) {
    const response = await this.axiosInstance.post('/api/organizations', data);
    return response;
  }

  async updateOrganization(id: string, data: any) {
    const response = await this.axiosInstance.put(`/api/organizations/${id}`, data);
    return response;
  }

  async deleteOrganization(id: string) {
    const response = await this.axiosInstance.delete(`/api/organizations/${id}`);
    return response;
  }

  // API Credentials endpoints
  async getApiCredentials(organizationId: string) {
    const response = await this.axiosInstance.get('/api/api-credentials', {
      params: { organizationId }
    });
    return response;
  }

  async createApiCredential(data: any) {
    const response = await this.axiosInstance.post('/api/api-credentials', data);
    return response;
  }

  async updateApiCredential(id: string, data: any) {
    const response = await this.axiosInstance.put(`/api/api-credentials/${id}`, data);
    return response;
  }

  async deleteApiCredential(id: string) {
    const response = await this.axiosInstance.delete(`/api/api-credentials/${id}`);
    return response;
  }

  // Billing endpoints
  async getBillingInfo() {
    const response = await this.axiosInstance.get('/api/billing/info');
    return response;
  }

  async getSubscriptions() {
    const response = await this.axiosInstance.get('/api/billing/subscriptions');
    return response;
  }

  async createCheckoutSession(priceId: string) {
    const response = await this.axiosInstance.post('/api/billing/create-checkout-session', { priceId });
    return response;
  }

  async createPortalSession() {
    const response = await this.axiosInstance.post('/api/billing/create-portal-session');
    return response;
  }

  async getUsageStats() {
    const response = await this.axiosInstance.get('/api/billing/usage-stats');
    return response;
  }

  // Analytics endpoints
  async getAnalytics(params?: any) {
    const response = await this.axiosInstance.get('/api/analytics', { params });
    return response;
  }

  async getActivities(params?: any) {
    const response = await this.axiosInstance.get('/api/analytics/activities', { params });
    return response;
  }

  // Generic request method
  async request(method: string, url: string, data?: any, config?: any) {
    const response = await this.axiosInstance.request({
      method,
      url,
      data,
      ...config
    });
    return response;
  }
}

// Export a singleton instance
export const apiClient = new ApiClient();

// Export types from the old api.tsx for compatibility
export interface WooCommerceOrder {
  id: number;
  status: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: string;
    total: string;
  }>;
  payment_method_title: string;
  shipping_lines: Array<{
    method_title: string;
    total: string;
  }>;
}

export interface WooCommerceStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  revenueToday: number;
  revenueThisMonth: number;
}