import { toast } from 'sonner';

export function useToast() {
  return {
    showToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        case 'info':
          toast.info(message);
          break;
      }
    }
  };
}