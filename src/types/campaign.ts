export interface Campaign {
  id: string;
  organizationId: string;
  name: string;
  subject: string;
  body: string;
  plainTextBody?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'CANCELLED';
  templateId?: string;
  segmentId?: string;
  fromEmail?: string;
  fromName?: string;
  replyToEmail?: string;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  dailyLimit: number;
  hourlyLimit: number;
  delayBetweenMin: number;
  delayBetweenMax: number;
  template?: EmailTemplate;
  segment?: RecipientSegment;
  recipients?: CampaignRecipient[];
  activities?: CampaignActivity[];
  _count?: {
    recipients: number;
  };
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
  firstName?: string;
  lastName?: string;
  customData?: Record<string, any>;
  status: 'PENDING' | 'SENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'UNSUBSCRIBED' | 'FAILED' | 'CANCELLED';
  trackingId: string;
  messageId?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  firstOpenedAt?: string;
  clickedAt?: string;
  firstClickedAt?: string;
  bouncedAt?: string;
  unsubscribedAt?: string;
  sendAttempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignActivity {
  id: string;
  campaignId: string;
  recipientId: string;
  action: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
  linkUrl?: string;
  createdAt: string;
  recipient?: {
    email: string;
    firstName?: string;
    lastName?: string;
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