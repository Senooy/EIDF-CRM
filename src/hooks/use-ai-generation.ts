import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Product } from '@/lib/woocommerce';
import { GeneratedProductContent } from '@/lib/gemini-service';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '/api';

interface GenerateContentParams {
  product: Partial<Product>;
}

interface BatchGenerateParams {
  products: Partial<Product>[];
}

interface BatchGenerateResponse {
  jobId: string;
  message: string;
  totalProducts: number;
}

// Hook for generating content for a single product
export function useGenerateProductContent() {
  return useMutation<GeneratedProductContent, Error, GenerateContentParams>({
    mutationFn: async ({ product }) => {
      const response = await axios.post(`${SERVER_URL}/ai/generate-product-content`, {
        product
      });
      return response.data;
    },
  });
}

// Hook for batch generating content
export function useBatchGenerateContent() {
  return useMutation<BatchGenerateResponse, Error, BatchGenerateParams>({
    mutationFn: async ({ products }) => {
      const response = await axios.post(`${SERVER_URL}/ai/batch-generate`, {
        products
      });
      return response.data;
    },
  });
}

// Hook to check AI service status
export function useAIServiceStatus() {
  return useMutation<{ configured: boolean; apiKeyPresent: boolean }, Error>({
    mutationFn: async () => {
      const response = await axios.get(`${SERVER_URL}/ai/test`);
      return response.data;
    },
  });
}