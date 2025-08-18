import { useState, useEffect } from 'react';
import { Campaign, EmailTemplate } from '@/types/campaign';
import { toast } from 'sonner';
// Import both services for gradual migration
import { campaignService } from '@/services/campaignService';
import { useCampaigns as useNewCampaigns } from '@/hooks/useCampaignApi';

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      // Force la régénération des campagnes avec les bonnes stats
      campaignService.forceRefreshCampaigns();
      const data = await campaignService.getCampaigns();
      setCampaigns(data);
    } catch (err) {
      setError('Erreur lors du chargement des campagnes');
      console.error('Error loading campaigns:', err);
    } finally {
      setLoading(false);
    }
  };

  const createCampaign = async (campaignData: {
    name: string;
    subject: string;
    body: string;
    status: 'draft' | 'scheduled' | 'sent';
    scheduledDate?: string;
    recipientCount: number;
    createdBy: string;
  }) => {
    try {
      const newCampaign: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'> = {
        ...campaignData,
        sentDate: campaignData.status === 'sent' ? new Date().toISOString() : undefined,
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

      const campaignId = await campaignService.createCampaign(newCampaign);
      
      // Recharger les campagnes après création
      await loadCampaigns();
      
      toast.success('Campagne créée avec succès');
      return campaignId;
    } catch (err) {
      toast.error('Erreur lors de la création de la campagne');
      console.error('Error creating campaign:', err);
      throw err;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      await campaignService.updateCampaign(id, updates);
      await loadCampaigns();
      toast.success('Campagne mise à jour');
    } catch (err) {
      toast.error('Erreur lors de la mise à jour');
      console.error('Error updating campaign:', err);
      throw err;
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      await campaignService.deleteCampaign(id);
      await loadCampaigns();
      toast.success('Campagne supprimée');
    } catch (err) {
      toast.error('Erreur lors de la suppression');
      console.error('Error deleting campaign:', err);
      throw err;
    }
  };

  const sendCampaign = async (id: string) => {
    try {
      await campaignService.sendCampaign(id);
      await loadCampaigns();
      toast.success('Campagne envoyée avec succès');
    } catch (err) {
      toast.error('Erreur lors de l\'envoi');
      console.error('Error sending campaign:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  return {
    campaigns,
    loading,
    error,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    refreshCampaigns: loadCampaigns
  };
};

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await campaignService.getEmailTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const templateId = await campaignService.createEmailTemplate(templateData);
      await loadTemplates();
      toast.success('Template créé avec succès');
      return templateId;
    } catch (err) {
      toast.error('Erreur lors de la création du template');
      console.error('Error creating template:', err);
      throw err;
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return {
    templates,
    loading,
    createTemplate,
    refreshTemplates: loadTemplates
  };
};