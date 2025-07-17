export interface Campaign {
  id: string;
  name: string;
  subject: string;
  body: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused';
  scheduledDate?: string;
  sentDate?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  recipientCount: number;
  recipientSegment?: RecipientSegment;
  template?: EmailTemplate;
  stats: CampaignStats;
}

export interface CampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
  bounced: number;
  unsubscribed: number;
  spamReported: number;
  revenue: number;
  lastUpdated: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  thumbnailUrl?: string;
  category: 'promotional' | 'transactional' | 'newsletter' | 'welcome' | 'other';
  variables?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RecipientSegment {
  id: string;
  name: string;
  criteria: SegmentCriteria[];
  estimatedSize: number;
}

export interface SegmentCriteria {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: string | number | string[] | number[];
}

export interface CampaignRecipient {
  id: string;
  campaignId: string;
  email: string;
  customerId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'converted' | 'bounced' | 'unsubscribed';
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  convertedAt?: string;
  bouncedAt?: string;
  unsubscribedAt?: string;
  revenue?: number;
}

export interface CampaignActivity {
  id: string;
  campaignId: string;
  recipientId: string;
  action: 'sent' | 'delivered' | 'opened' | 'clicked' | 'converted' | 'bounced' | 'unsubscribed' | 'spam_reported';
  timestamp: string;
  metadata?: {
    linkUrl?: string;
    userAgent?: string;
    ipAddress?: string;
    revenue?: number;
  };
}

export interface CampaignConversionFunnel {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface CampaignTimelineData {
  timestamp: string;
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface CampaignKPI {
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  spamRate: number;
  averageOrderValue: number;
  roi: number;
}