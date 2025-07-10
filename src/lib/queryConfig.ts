// React Query configuration for optimized performance
import { queryErrorHandler } from './error-handler';

export const queryConfig = {
  // Default options for all queries
  defaultOptions: {
    queries: {
      // Keep data fresh for 5 minutes
      staleTime: 1000 * 60 * 5,
      
      // Cache data for 30 minutes
      cacheTime: 1000 * 60 * 30,
      
      // Retry failed requests up to 3 times
      retry: 3,
      
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      
      // Show stale data while fetching new data
      keepPreviousData: true,
      
      // Global error handler
      onError: queryErrorHandler,
    },
    mutations: {
      // Global error handler for mutations
      onError: queryErrorHandler,
    },
  },
};

// Specific configurations for different query types
export const queryConfigs = {
  // Orders queries
  orders: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  },
  
  // Dashboard stats
  stats: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
  },
  
  // Activity feed
  activity: {
    staleTime: 1000 * 60 * 2, // 2 minutes
    cacheTime: 1000 * 60 * 15, // 15 minutes
  },
  
  // Products
  products: {
    staleTime: 1000 * 60 * 15, // 15 minutes
    cacheTime: 1000 * 60 * 60, // 1 hour
  },
  
  // Customers
  customers: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    cacheTime: 1000 * 60 * 30, // 30 minutes
  },
};