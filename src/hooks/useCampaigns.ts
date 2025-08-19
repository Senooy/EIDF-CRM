import { useState, useEffect } from 'react';
import { Campaign, EmailTemplate } from '@/types/campaign';
import { toast } from 'sonner';
import { campaignApiService } from '@/services/campaign-api.service';

export const useCampaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/campaigns');
      if (!response.ok) {
        throw new Error('Failed to load campaigns');
      }
      const data = await response.json();
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
    recipientEmails?: string[];
  }) => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: campaignData.name,
          subject: campaignData.subject,
          body: campaignData.body,
          status: campaignData.status.toUpperCase(),
          scheduledDate: campaignData.scheduledDate,
          recipientEmails: campaignData.recipientEmails || [],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      const newCampaign = await response.json();
      
      // Recharger les campagnes après création
      await loadCampaigns();
      
      toast.success('Campagne créée avec succès');
      return newCampaign.id;
    } catch (err) {
      toast.error('Erreur lors de la création de la campagne');
      console.error('Error creating campaign:', err);
      throw err;
    }
  };

  const updateCampaign = async (id: string, updates: Partial<Campaign>) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update campaign');
      }

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
      const response = await fetch(`/api/campaigns/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete campaign');
      }

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
      const response = await fetch(`/api/campaigns/${id}/send`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to send campaign');
      }

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
      // For now, return mock templates until we implement the templates API
      setTemplates([
        {
          id: '1',
          name: 'Template de bienvenue',
          subject: 'Bienvenue chez nous!',
          body: '<h1>Bienvenue!</h1><p>Nous sommes ravis de vous compter parmi nous.</p>',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: '2',
          name: 'Promotion',
          subject: 'Offre spéciale pour vous',
          body: '<h1>Offre exclusive!</h1><p>Profitez de -20% sur votre prochain achat.</p>',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error('Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTemplate = async (templateData: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // For now, just add to local state
      const newTemplate = {
        ...templateData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setTemplates(prev => [...prev, newTemplate]);
      toast.success('Template créé avec succès');
      return newTemplate.id;
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