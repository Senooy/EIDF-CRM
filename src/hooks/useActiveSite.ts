import { useState, useEffect } from 'react';
import { configService, WordPressSite } from '@/lib/db/config';
import { wpClientManager, NoActiveSiteError } from '@/lib/api/wordpress-client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export function useActiveSite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeSite, setActiveSite] = useState<WordPressSite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActiveSite();
  }, [user]);

  const loadActiveSite = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const site = await configService.getActiveSite();
      if (site) {
        setActiveSite(site);
        
        // Load user preferences if available
        if (user) {
          const prefs = await configService.getUserPreferences(user.uid);
          if (prefs?.currentSiteId && prefs.currentSiteId !== site.id) {
            // User has a different preferred site
            const userSite = await configService.getAllSites()
              .then(sites => sites.find(s => s.id === prefs.currentSiteId));
            if (userSite) {
              setActiveSite(userSite);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error loading active site:', err);
      setError('Erreur lors du chargement du site actif');
    } finally {
      setLoading(false);
    }
  };

  const switchSite = async (siteId: number) => {
    try {
      await configService.setActiveSite(siteId);
      await wpClientManager.setCurrentSite(siteId);
      
      // Save user preference
      if (user) {
        await configService.saveUserPreferences(user.uid, {
          currentSiteId: siteId,
          userId: user.uid
        });
      }
      
      // Invalidate all queries to force refetch with new site
      await queryClient.invalidateQueries();
      
      await loadActiveSite();
      
      // Force page reload to ensure all components use the new site
      window.location.reload();
    } catch (err) {
      console.error('Error switching site:', err);
      throw new Error('Erreur lors du changement de site');
    }
  };

  const hasActiveSite = () => {
    return !!activeSite;
  };

  const requireActiveSite = () => {
    if (!activeSite) {
      throw new NoActiveSiteError();
    }
    return activeSite;
  };

  return {
    activeSite,
    loading,
    error,
    switchSite,
    hasActiveSite,
    requireActiveSite,
    reload: loadActiveSite
  };
}