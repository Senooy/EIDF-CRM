import { logger } from '@/lib/logger';

const PROXY_URL = import.meta.env.VITE_PROXY_URL || 'http://localhost:3002';

export interface ProxyStatus {
  isRunning: boolean;
  message: string;
  error?: string;
}

export async function checkProxyStatus(): Promise<ProxyStatus> {
  try {
    const response = await fetch(`${PROXY_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });

    if (response.ok) {
      const data = await response.json();
      logger.info('Proxy server is running', data, 'ProxyCheck');
      return {
        isRunning: true,
        message: 'Proxy server is running correctly',
      };
    } else {
      logger.warn(`Proxy server returned status ${response.status}`, undefined, 'ProxyCheck');
      return {
        isRunning: false,
        message: `Proxy server returned status ${response.status}`,
        error: response.statusText,
      };
    }
  } catch (error) {
    logger.error('Proxy server is not reachable', error, 'ProxyCheck');
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return {
      isRunning: false,
      message: 'Proxy server is not running',
      error: errorMessage.includes('fetch failed') 
        ? 'Cannot connect to proxy server. Please run: npm run start:proxy'
        : errorMessage,
    };
  }
}

export function useProxyCheck() {
  // This can be converted to a React hook if needed
  return checkProxyStatus;
}