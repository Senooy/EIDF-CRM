import { Campaign, CampaignStats, CampaignActivity } from '@/types/campaign';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

export interface CreateCampaignRequest {
  name: string;
  subject: string;
  body: string;
  plainTextBody?: string;
  templateId?: string;
  segmentId?: string;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  scheduledAt?: string;
  dailyLimit?: number;
  hourlyLimit?: number;
  delayBetweenMin?: number;
  delayBetweenMax?: number;
  recipients: Array<{
    email: string;
    firstName?: string;
    lastName?: string;
    customData?: Record<string, any>;
  }>;
}

export interface UpdateCampaignRequest {
  name?: string;
  subject?: string;
  body?: string;
  plainTextBody?: string;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  scheduledAt?: string;
  dailyLimit?: number;
  hourlyLimit?: number;
  delayBetweenMin?: number;
  delayBetweenMax?: number;
}

export interface CampaignListResponse {
  campaigns: Campaign[];
  total: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

class CampaignApiService {
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ 
        error: `HTTP ${response.status}: ${response.statusText}` 
      }));
      throw new Error(error.error || error.message || 'API request failed');
    }

    return response.json();
  }

  // Get all campaigns
  async getCampaigns(options?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Campaign[]> {
    const params = new URLSearchParams();
    if (options?.status) params.append('status', options.status);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    
    const queryString = params.toString();
    const endpoint = `/campaigns${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<Campaign[]>(endpoint);
  }

  // Get single campaign with detailed stats
  async getCampaign(id: string): Promise<Campaign & { realtimeStats: CampaignStats }> {
    return this.makeRequest<Campaign & { realtimeStats: CampaignStats }>(`/campaigns/${id}`);
  }

  // Create new campaign
  async createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
    return this.makeRequest<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update campaign
  async updateCampaign(id: string, data: UpdateCampaignRequest): Promise<Campaign> {
    return this.makeRequest<Campaign>(`/campaigns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete campaign
  async deleteCampaign(id: string): Promise<void> {
    return this.makeRequest<void>(`/campaigns/${id}`, {
      method: 'DELETE',
    });
  }

  // Send campaign immediately
  async sendCampaign(id: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/campaigns/${id}/send`, {
      method: 'POST',
    });
  }

  // Pause campaign
  async pauseCampaign(id: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/campaigns/${id}/pause`, {
      method: 'POST',
    });
  }

  // Resume campaign
  async resumeCampaign(id: string): Promise<{ message: string }> {
    return this.makeRequest<{ message: string }>(`/campaigns/${id}/resume`, {
      method: 'POST',
    });
  }

  // Send test emails
  async sendTestEmails(id: string, testEmails: string[]): Promise<{
    message: string;
    results: Array<{
      email: string;
      success: boolean;
      messageId?: string;
      error?: string;
    }>;
  }> {
    return this.makeRequest<any>(`/campaigns/${id}/test`, {
      method: 'POST',
      body: JSON.stringify({ testEmails }),
    });
  }

  // Get campaign stats
  async getCampaignStats(id: string): Promise<CampaignStats> {
    return this.makeRequest<CampaignStats>(`/campaigns/${id}/stats`);
  }

  // Get campaign activities
  async getCampaignActivities(id: string, options?: {
    limit?: number;
    offset?: number;
    action?: string;
  }): Promise<CampaignActivity[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.action) params.append('action', options.action);
    
    const queryString = params.toString();
    const endpoint = `/campaigns/${id}/activities${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<CampaignActivity[]>(endpoint);
  }

  // Get queue statistics
  async getQueueStats(): Promise<QueueStats> {
    return this.makeRequest<QueueStats>('/campaigns/queue/stats');
  }

  // Bounce and unsubscribe management
  async getBounceStats(organizationId?: string): Promise<{
    hardBounces: number;
    softBounces: number;
    complaints: number;
    recentBounces: number;
    bounceRate: number;
  }> {
    const endpoint = organizationId 
      ? `/bounces/stats?organizationId=${organizationId}`
      : '/bounces/stats';
    return this.makeRequest<any>(endpoint);
  }

  async getUnsubscribeStats(organizationId?: string): Promise<{
    totalUnsubscribes: number;
    recentUnsubscribes: number;
    unsubscribeRate: number;
    bySource: Record<string, number>;
    byReason: Record<string, number>;
  }> {
    const endpoint = organizationId
      ? `/unsubscribes/stats?organizationId=${organizationId}`
      : '/unsubscribes/stats';
    return this.makeRequest<any>(endpoint);
  }

  async getUnsubscribeList(organizationId?: string, options?: {
    limit?: number;
    offset?: number;
    source?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    unsubscribes: Array<{
      email: string;
      reason: string | null;
      source: string;
      date: Date;
      campaignId?: string;
    }>;
    total: number;
  }> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.offset) params.append('offset', options.offset.toString());
    if (options?.source) params.append('source', options.source);
    if (options?.dateFrom) params.append('dateFrom', options.dateFrom.toISOString());
    if (options?.dateTo) params.append('dateTo', options.dateTo.toISOString());
    
    const queryString = params.toString();
    const endpoint = `/unsubscribes${queryString ? `?${queryString}` : ''}`;
    
    return this.makeRequest<any>(endpoint);
  }
}

export const campaignApiService = new CampaignApiService();