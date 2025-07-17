import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { firestore } from '@/lib/firebase';
import { Campaign, CampaignStats, EmailTemplate } from '@/types/campaign';
import { generateMockCampaigns, generateMockEmailTemplates } from '@/lib/mockCampaignData';

const CAMPAIGNS_COLLECTION = 'campaigns';
const CAMPAIGN_STATS_COLLECTION = 'campaign_stats';
const EMAIL_TEMPLATES_COLLECTION = 'email_templates';

// For demo purposes, we'll use mock data with Firestore structure
let useMockData = false;

export const campaignService = {
  // Get all campaigns
  async getCampaigns(): Promise<Campaign[]> {
    if (useMockData) {
      return generateMockCampaigns(10);
    }
    
    try {
      const campaignsQuery = query(
        collection(firestore, CAMPAIGNS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(campaignsQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Campaign));
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      return generateMockCampaigns(10);
    }
  },

  // Get single campaign
  async getCampaign(id: string): Promise<Campaign | null> {
    if (useMockData) {
      const campaigns = generateMockCampaigns(10);
      return campaigns.find(c => c.id === id) || null;
    }
    
    try {
      const docRef = doc(firestore, CAMPAIGNS_COLLECTION, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Campaign;
      }
      return null;
    } catch (error) {
      console.error('Error fetching campaign:', error);
      return null;
    }
  },

  // Create campaign
  async createCampaign(campaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (useMockData) {
      return `campaign-${Date.now()}`;
    }
    
    try {
      const campaignData = {
        ...campaign,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        stats: {
          sent: 0,
          delivered: 0,
          opened: 0,
          clicked: 0,
          converted: 0,
          bounced: 0,
          unsubscribed: 0,
          spamReported: 0,
          revenue: 0,
          lastUpdated: new Date().toISOString()
        }
      };
      
      const docRef = await addDoc(collection(firestore, CAMPAIGNS_COLLECTION), campaignData);
      
      // Initialize campaign stats document
      await addDoc(collection(firestore, CAMPAIGN_STATS_COLLECTION), {
        campaignId: docRef.id,
        ...campaignData.stats
      });
      
      return docRef.id;
    } catch (error) {
      console.error('Error creating campaign:', error);
      throw error;
    }
  },

  // Update campaign
  async updateCampaign(id: string, updates: Partial<Campaign>): Promise<void> {
    if (useMockData) {
      return;
    }
    
    try {
      const docRef = doc(firestore, CAMPAIGNS_COLLECTION, id);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating campaign:', error);
      throw error;
    }
  },

  // Delete campaign
  async deleteCampaign(id: string): Promise<void> {
    if (useMockData) {
      return;
    }
    
    try {
      await deleteDoc(doc(firestore, CAMPAIGNS_COLLECTION, id));
    } catch (error) {
      console.error('Error deleting campaign:', error);
      throw error;
    }
  },

  // Get campaign stats with real-time updates
  subscribeToCampaignStats(
    campaignId: string, 
    callback: (stats: CampaignStats) => void
  ): () => void {
    if (useMockData) {
      // Simulate real-time updates with mock data
      const interval = setInterval(() => {
        const campaigns = generateMockCampaigns(10);
        const campaign = campaigns.find(c => c.id === campaignId);
        if (campaign) {
          callback(campaign.stats);
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }
    
    const docRef = doc(firestore, CAMPAIGN_STATS_COLLECTION, campaignId);
    const unsubscribe = onSnapshot(docRef, (doc) => {
      if (doc.exists()) {
        callback(doc.data() as CampaignStats);
      }
    });
    
    return unsubscribe;
  },

  // Get email templates
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    if (useMockData) {
      return generateMockEmailTemplates();
    }
    
    try {
      const templatesQuery = query(
        collection(firestore, EMAIL_TEMPLATES_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(templatesQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as EmailTemplate));
    } catch (error) {
      console.error('Error fetching templates:', error);
      return generateMockEmailTemplates();
    }
  },

  // Create email template
  async createEmailTemplate(template: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    if (useMockData) {
      return `template-${Date.now()}`;
    }
    
    try {
      const docRef = await addDoc(collection(firestore, EMAIL_TEMPLATES_COLLECTION), {
        ...template,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating template:', error);
      throw error;
    }
  },

  // Send campaign
  async sendCampaign(campaignId: string): Promise<void> {
    if (useMockData) {
      console.log('Sending campaign:', campaignId);
      return;
    }
    
    try {
      // In a real implementation, this would trigger an email sending service
      await updateDoc(doc(firestore, CAMPAIGNS_COLLECTION, campaignId), {
        status: 'sending',
        sentDate: serverTimestamp()
      });
    } catch (error) {
      console.error('Error sending campaign:', error);
      throw error;
    }
  },

  // Toggle mock data (for development)
  toggleMockData(useMock: boolean) {
    useMockData = useMock;
  }
};