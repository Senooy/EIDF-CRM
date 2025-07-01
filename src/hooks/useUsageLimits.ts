import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

interface UsageLimit {
  allowed: boolean;
  current: number;
  limit: number;
}

export function useUsageLimits() {
  const [limits, setLimits] = useState<Record<string, UsageLimit>>({});
  const [loading, setLoading] = useState(false);

  const checkLimit = useCallback(async (metric: string): Promise<boolean> => {
    try {
      const response = await axios.get(`/api/usage/${metric}`);
      const data = response.data as UsageLimit;
      
      setLimits(prev => ({ ...prev, [metric]: data }));
      
      if (!data.allowed) {
        const messages: Record<string, string> = {
          users: 'Vous avez atteint la limite d\'utilisateurs de votre plan.',
          products: 'Vous avez atteint la limite de produits de votre plan.',
          orders: 'Vous avez atteint la limite de commandes mensuelles.',
          ai_generations: 'Vous avez atteint la limite de générations IA mensuelles.',
        };
        
        toast.error(messages[metric] || `Limite atteinte pour ${metric}`, {
          action: {
            label: 'Mettre à niveau',
            onClick: () => window.location.href = '/billing',
          },
        });
      }
      
      return data.allowed;
    } catch (error) {
      console.error(`Error checking ${metric} limit:`, error);
      return true; // Allow by default on error
    }
  }, []);

  const checkMultipleLimits = useCallback(async (metrics: string[]) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        metrics.map(metric => checkLimit(metric))
      );
      return results.every(allowed => allowed);
    } finally {
      setLoading(false);
    }
  }, [checkLimit]);

  const refreshLimits = useCallback(async (metrics: string[]) => {
    setLoading(true);
    try {
      await checkMultipleLimits(metrics);
    } finally {
      setLoading(false);
    }
  }, [checkMultipleLimits]);

  const getUsagePercentage = useCallback((metric: string): number => {
    const limit = limits[metric];
    if (!limit || limit.limit === 0) return 0;
    return Math.round((limit.current / limit.limit) * 100);
  }, [limits]);

  const isNearLimit = useCallback((metric: string, threshold: number = 80): boolean => {
    return getUsagePercentage(metric) >= threshold;
  }, [getUsagePercentage]);

  const recordUsage = useCallback(async (metric: string, count: number = 1) => {
    try {
      await axios.post('/api/usage/record', { metric, count });
      // Refresh the limit after recording
      await checkLimit(metric);
    } catch (error) {
      console.error(`Error recording ${metric} usage:`, error);
    }
  }, [checkLimit]);

  return {
    limits,
    loading,
    checkLimit,
    checkMultipleLimits,
    refreshLimits,
    getUsagePercentage,
    isNearLimit,
    recordUsage,
  };
}