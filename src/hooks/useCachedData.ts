import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cacheDB, cacheUtils } from '@/lib/db/cache-db';
import { syncService } from '@/lib/services/sync-service';
import { useActiveSite } from './useActiveSite';
import { logger } from '@/lib/logger';

export interface UseCachedDataOptions {
  // Force fetching from API instead of cache
  bypassCache?: boolean;
  // Auto-sync if cache is stale
  autoSync?: boolean;
  // Cache max age in minutes
  maxAge?: number;
  // Enable real-time updates
  realtime?: boolean;
  // Custom filter function
  filter?: (item: any) => boolean;
  // Sort function
  sort?: (a: any, b: any) => number;
  // Pagination
  page?: number;
  perPage?: number;
}

export interface CachedDataResult<T> {
  data: T[];
  isLoading: boolean;
  isSyncing: boolean;
  error: Error | null;
  totalCount: number;
  lastSync: Date | null;
  isStale: boolean;
  // Actions
  refresh: () => Promise<void>;
  sync: () => Promise<void>;
  clearCache: () => Promise<void>;
  // Pagination
  page: number;
  perPage: number;
  totalPages: number;
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
}

export function useCachedOrders(options: UseCachedDataOptions = {}): CachedDataResult<any> {
  const { activeSite } = useActiveSite();
  return useCachedData('orders', 'orderId', options);
}

export function useCachedProducts(options: UseCachedDataOptions = {}): CachedDataResult<any> {
  const { activeSite } = useActiveSite();
  return useCachedData('products', 'productId', options);
}

export function useCachedCustomers(options: UseCachedDataOptions = {}): CachedDataResult<any> {
  const { activeSite } = useActiveSite();
  return useCachedData('customers', 'customerId', options);
}

export function useCachedPosts(options: UseCachedDataOptions = {}): CachedDataResult<any> {
  const { activeSite } = useActiveSite();
  return useCachedData('posts', 'postId', options);
}

/**
 * Generic hook for cached data
 */
function useCachedData<T = any>(
  dataType: string,
  idField: string,
  options: UseCachedDataOptions = {}
): CachedDataResult<T> {
  const { activeSite } = useActiveSite();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(options.page || 1);
  const [isSyncing, setIsSyncing] = useState(false);
  const perPage = options.perPage || 20;
  const maxAge = options.maxAge || 30;

  const siteId = activeSite?.id;

  // Query for cached data
  const {
    data: cachedItems = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['cached', dataType, siteId, options.bypassCache],
    queryFn: async () => {
      if (!siteId) return [];

      if (options.bypassCache) {
        // Fetch from API
        logger.info(`Bypassing cache for ${dataType}`, { siteId }, 'useCachedData');
        await syncService.syncAll(siteId, { dataTypes: [dataType as any] });
      }

      // Get from cache
      const table = (cacheDB as any)[dataType];
      const items = await table
        .where('siteId')
        .equals(siteId)
        .toArray();

      return items.map((item: any) => item.data);
    },
    enabled: !!siteId,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  // Query for sync metadata
  const { data: syncMetadata } = useQuery({
    queryKey: ['syncMetadata', dataType, siteId],
    queryFn: async () => {
      if (!siteId) return null;
      return cacheDB.getLastSync(siteId, dataType);
    },
    enabled: !!siteId,
  });

  // Apply filters and sorting
  const processedData = useMemo(() => {
    let result = [...cachedItems];

    // Apply filter
    if (options.filter) {
      result = result.filter(options.filter);
    }

    // Apply sort
    if (options.sort) {
      result.sort(options.sort);
    }

    return result;
  }, [cachedItems, options.filter, options.sort]);

  // Pagination
  const totalCount = processedData.length;
  const totalPages = Math.ceil(totalCount / perPage);
  const paginatedData = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return processedData.slice(start, end);
  }, [processedData, page, perPage]);

  // Check if cache is stale
  const isStale = useMemo(() => {
    if (!syncMetadata) return true;
    return cacheUtils.isStale(syncMetadata, maxAge);
  }, [syncMetadata, maxAge]);

  // Auto-sync if stale
  useEffect(() => {
    if (options.autoSync && isStale && siteId && !isSyncing) {
      sync();
    }
  }, [isStale, options.autoSync, siteId]);

  // Actions
  const sync = useCallback(async () => {
    if (!siteId || isSyncing) return;

    setIsSyncing(true);
    try {
      await syncService.syncAll(siteId, {
        dataTypes: [dataType as any],
        silent: true
      });
      await refetch();
      queryClient.invalidateQueries({ queryKey: ['syncMetadata', dataType, siteId] });
    } catch (error) {
      logger.error(`Failed to sync ${dataType}`, error, 'useCachedData');
    } finally {
      setIsSyncing(false);
    }
  }, [siteId, dataType, refetch, queryClient, isSyncing]);

  const refresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const clearCache = useCallback(async () => {
    if (!siteId) return;
    
    const table = (cacheDB as any)[dataType];
    await table.where('siteId').equals(siteId).delete();
    await refetch();
  }, [siteId, dataType, refetch]);

  // Pagination actions
  const nextPage = useCallback(() => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1);
    }
  }, [page]);

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  }, [totalPages]);

  return {
    data: paginatedData,
    isLoading,
    isSyncing,
    error: error as Error | null,
    totalCount,
    lastSync: syncMetadata,
    isStale,
    refresh,
    sync,
    clearCache,
    page,
    perPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage
  };
}

/**
 * Hook to get a single cached item by ID
 */
export function useCachedItem<T = any>(
  dataType: string,
  itemId: number,
  options: { bypassCache?: boolean } = {}
): {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const { activeSite } = useActiveSite();
  const siteId = activeSite?.id;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['cachedItem', dataType, siteId, itemId],
    queryFn: async () => {
      if (!siteId) return null;

      const table = (cacheDB as any)[dataType];
      const idField = getIdField(dataType);
      
      const cachedItem = await table
        .where(['siteId', idField])
        .equals([siteId, itemId])
        .first();

      if (cachedItem && !options.bypassCache) {
        return cachedItem.data;
      }

      // Fetch from API if not in cache or bypass requested
      logger.info(`Fetching ${dataType} ${itemId} from API`, { siteId }, 'useCachedItem');
      
      // This would need to be implemented based on dataType
      // For now, return cached data if available
      return cachedItem?.data || null;
    },
    enabled: !!siteId && !!itemId,
  });

  return {
    data: data || null,
    isLoading,
    error: error as Error | null,
    refresh: refetch
  };
}

/**
 * Hook to get sync status
 */
export function useSyncStatus() {
  const { activeSite } = useActiveSite();
  const siteId = activeSite?.id;

  const { data: syncStatus, refetch } = useQuery({
    queryKey: ['syncStatus', siteId],
    queryFn: async () => {
      if (!siteId) return {};
      return syncService.getSyncStatus(siteId);
    },
    enabled: !!siteId,
    refetchInterval: 5000, // Refresh every 5 seconds when syncing
  });

  const { data: cacheSize } = useQuery({
    queryKey: ['cacheSize'],
    queryFn: () => cacheDB.getCacheSize(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const isSyncing = syncService.isSyncing();

  return {
    syncStatus: syncStatus || {},
    cacheSize: cacheSize || { totalItems: 0, sizeEstimate: '0 MB' },
    isSyncing,
    refresh: refetch
  };
}

/**
 * Hooks for getting single items by ID
 */
export function useCachedOrderById(orderId: number) {
  return useCachedItem('orders', orderId);
}

export function useCachedProductById(productId: number) {
  return useCachedItem('products', productId);
}

export function useCachedCustomerById(customerId: number) {
  return useCachedItem('customers', customerId);
}

// Helper function to get ID field name
function getIdField(dataType: string): string {
  const idFields: Record<string, string> = {
    orders: 'orderId',
    products: 'productId',
    customers: 'customerId',
    posts: 'postId',
    pages: 'pageId',
    media: 'mediaId',
    comments: 'commentId',
    users: 'userId'
  };
  return idFields[dataType] || 'id';
}