import { logger } from './logger';
import { toast } from 'sonner';

export class ApplicationError extends Error {
  constructor(
    message: string,
    public code?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export class ApiError extends ApplicationError {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message, `API_ERROR_${statusCode}`);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApplicationError {
  constructor(message: string = 'Erreur de connexion réseau') {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message: string = 'Erreur d\'authentification') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends ApplicationError {
  constructor(
    message: string,
    public validationErrors?: Record<string, string[]>
  ) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export const errorHandler = {
  /**
   * Handle errors consistently across the application
   */
  handle(error: unknown, context: string, showToast: boolean = true): void {
    // Log the error
    logger.error(`Error in ${context}`, error, context);

    // Show user-friendly message
    if (showToast) {
      const message = this.getUserMessage(error);
      toast.error(message);
    }
  },

  /**
   * Get user-friendly error message
   */
  getUserMessage(error: unknown): string {
    if (error instanceof ApiError) {
      switch (error.statusCode) {
        case 400:
          return 'Requête invalide. Veuillez vérifier vos données.';
        case 401:
          return 'Vous devez vous connecter pour accéder à cette ressource.';
        case 403:
          return 'Vous n\'avez pas les permissions nécessaires.';
        case 404:
          return 'Ressource introuvable.';
        case 429:
          return 'Trop de requêtes. Veuillez réessayer plus tard.';
        case 500:
          return 'Erreur serveur. Veuillez réessayer plus tard.';
        default:
          return error.message || 'Une erreur est survenue.';
      }
    }

    if (error instanceof NetworkError) {
      return 'Erreur de connexion. Vérifiez votre connexion internet.';
    }

    if (error instanceof AuthenticationError) {
      return 'Erreur d\'authentification. Veuillez vous reconnecter.';
    }

    if (error instanceof ValidationError) {
      return error.message || 'Données invalides.';
    }

    if (error instanceof Error) {
      // Don't expose technical error messages to users
      return 'Une erreur est survenue. Veuillez réessayer.';
    }

    return 'Une erreur inattendue est survenue.';
  },

  /**
   * Transform API errors into our error types
   */
  transformApiError(error: any): Error {
    if (error.response) {
      // Axios error with response
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      return new ApiError(message, status, error.response.data);
    }

    if (error.request) {
      // Network error
      return new NetworkError();
    }

    if (error.message?.includes('Network')) {
      return new NetworkError();
    }

    // Return original error if we can't transform it
    return error;
  },

  /**
   * Check if error is retryable
   */
  isRetryable(error: unknown): boolean {
    if (error instanceof ApiError) {
      // Retry on server errors or rate limiting
      return error.statusCode >= 500 || error.statusCode === 429;
    }

    if (error instanceof NetworkError) {
      return true;
    }

    return false;
  }
};

// React Query error handler
export const queryErrorHandler = (error: unknown) => {
  // Don't show toast for 401 errors (handled by auth context)
  const showToast = !(error instanceof ApiError && error.statusCode === 401);
  errorHandler.handle(error, 'Query', showToast);
};