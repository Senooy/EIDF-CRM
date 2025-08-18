import { useState, useEffect, useCallback } from 'react';
import { Campaign, CampaignStats, CampaignActivity } from '@/types/campaign';
import { campaignApiService, CreateCampaignRequest, UpdateCampaignRequest } from '@/services/campaign-api.service';
import { useToast } from '@/hooks/useToast';

export interface UseCampaignsResult {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCampaign: (data: CreateCampaignRequest) => Promise<Campaign | null>;
  updateCampaign: (id: string, data: UpdateCampaignRequest) => Promise<Campaign | null>;
  deleteCampaign: (id: string) => Promise<boolean>;
  sendCampaign: (id: string) => Promise<boolean>;
  pauseCampaign: (id: string) => Promise<boolean>;
  resumeCampaign: (id: string) => Promise<boolean>;
  sendTestEmails: (id: string, emails: string[]) => Promise<boolean>;
}

export function useCampaigns(options?: {
  status?: string;
  limit?: number;
  offset?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseCampaignsResult {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await campaignApiService.getCampaigns(options);
      setCampaigns(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      setError(errorMessage);
      console.error('Error fetching campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [options]);

  const createCampaign = useCallback(async (data: CreateCampaignRequest): Promise<Campaign | null> => {
    try {
      const newCampaign = await campaignApiService.createCampaign(data);
      setCampaigns(prev => [newCampaign, ...prev]);
      showToast('success', 'Campagne créée avec succès');
      return newCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      showToast('error', `Erreur lors de la création: ${errorMessage}`);
      return null;
    }
  }, [showToast]);

  const updateCampaign = useCallback(async (id: string, data: UpdateCampaignRequest): Promise<Campaign | null> => {
    try {
      const updatedCampaign = await campaignApiService.updateCampaign(id, data);
      setCampaigns(prev => prev.map(c => c.id === id ? updatedCampaign : c));
      showToast('success', 'Campagne mise à jour avec succès');
      return updatedCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign';
      showToast('error', `Erreur lors de la mise à jour: ${errorMessage}`);
      return null;
    }
  }, [showToast]);

  const deleteCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignApiService.deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      showToast('success', 'Campagne supprimée avec succès');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
      showToast('error', `Erreur lors de la suppression: ${errorMessage}`);
      return false;
    }
  }, [showToast]);

  const sendCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignApiService.sendCampaign(id);
      // Update campaign status locally
      setCampaigns(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'SENDING' as const } : c
      ));
      showToast('success', 'Envoi de campagne initié avec succès');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send campaign';
      showToast('error', `Erreur lors de l'envoi: ${errorMessage}`);
      return false;
    }
  }, [showToast]);

  const pauseCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignApiService.pauseCampaign(id);
      setCampaigns(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'PAUSED' as const } : c
      ));
      showToast('success', 'Campagne mise en pause');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to pause campaign';
      showToast('error', `Erreur lors de la pause: ${errorMessage}`);
      return false;
    }
  }, [showToast]);

  const resumeCampaign = useCallback(async (id: string): Promise<boolean> => {
    try {
      await campaignApiService.resumeCampaign(id);
      setCampaigns(prev => prev.map(c => 
        c.id === id ? { ...c, status: 'SENDING' as const } : c
      ));
      showToast('success', 'Campagne reprise');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resume campaign';
      showToast('error', `Erreur lors de la reprise: ${errorMessage}`);
      return false;
    }
  }, [showToast]);

  const sendTestEmails = useCallback(async (id: string, emails: string[]): Promise<boolean> => {
    try {
      const result = await campaignApiService.sendTestEmails(id, emails);
      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.results.length - successCount;
      
      if (failCount === 0) {
        showToast('success', `${successCount} email(s) de test envoyé(s) avec succès`);
      } else {
        showToast('warning', `${successCount} envoyés, ${failCount} échecs`);
      }
      return successCount > 0;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send test emails';
      showToast('error', `Erreur lors de l'envoi des tests: ${errorMessage}`);
      return false;
    }
  }, [showToast]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (options?.autoRefresh) {
      const interval = setInterval(fetchCampaigns, options.refreshInterval || 30000);
      return () => clearInterval(interval);
    }
  }, [options?.autoRefresh, options?.refreshInterval, fetchCampaigns]);

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    sendCampaign,
    pauseCampaign,
    resumeCampaign,
    sendTestEmails,
  };
}

export interface UseCampaignDetailResult {
  campaign: (Campaign & { realtimeStats: CampaignStats }) | null;
  activities: CampaignActivity[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMoreActivities: () => Promise<void>;
  hasMoreActivities: boolean;
}

export function useCampaignDetail(id: string, options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseCampaignDetailResult {
  const [campaign, setCampaign] = useState<(Campaign & { realtimeStats: CampaignStats }) | null>(null);
  const [activities, setActivities] = useState<CampaignActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activitiesOffset, setActivitiesOffset] = useState(0);
  const [hasMoreActivities, setHasMoreActivities] = useState(true);

  const fetchCampaign = useCallback(async () => {
    try {
      setError(null);
      const data = await campaignApiService.getCampaign(id);
      setCampaign(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch campaign';
      setError(errorMessage);
      console.error('Error fetching campaign:', err);
    }
  }, [id]);

  const fetchActivities = useCallback(async (offset = 0, append = false) => {
    try {
      const data = await campaignApiService.getCampaignActivities(id, {
        limit: 50,
        offset
      });
      
      if (append) {
        setActivities(prev => [...prev, ...data]);
      } else {
        setActivities(data);
      }
      
      setHasMoreActivities(data.length === 50);
      
      if (append) {
        setActivitiesOffset(offset + data.length);
      } else {
        setActivitiesOffset(data.length);
      }
    } catch (err) {
      console.error('Error fetching activities:', err);
    }
  }, [id]);

  const loadMoreActivities = useCallback(async () => {
    await fetchActivities(activitiesOffset, true);
  }, [fetchActivities, activitiesOffset]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchCampaign(),
      fetchActivities(0, false)
    ]);
    setLoading(false);
  }, [fetchCampaign, fetchActivities]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (options?.autoRefresh) {
      const interval = setInterval(() => {
        fetchCampaign(); // Only refresh campaign data, not activities
      }, options.refreshInterval || 10000);
      return () => clearInterval(interval);
    }
  }, [options?.autoRefresh, options?.refreshInterval, fetchCampaign]);

  return {
    campaign,
    activities,
    loading,
    error,
    refetch,
    loadMoreActivities,
    hasMoreActivities,
  };
}

export interface UseQueueStatsResult {
  stats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  } | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useQueueStats(options?: {
  autoRefresh?: boolean;
  refreshInterval?: number;
}): UseQueueStatsResult {
  const [stats, setStats] = useState<UseQueueStatsResult['stats']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);
      const data = await campaignApiService.getQueueStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch queue stats';
      setError(errorMessage);
      console.error('Error fetching queue stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Auto-refresh if enabled
  useEffect(() => {
    if (options?.autoRefresh) {
      const interval = setInterval(fetchStats, options.refreshInterval || 5000);
      return () => clearInterval(interval);
    }
  }, [options?.autoRefresh, options?.refreshInterval, fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}