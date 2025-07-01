export interface SEOSession {
  startedAt: Date;
  lastUpdatedAt: Date;
  processedProductIds: number[];
  failedProductIds: number[];
  totalProducts: number;
  status: 'active' | 'paused' | 'completed';
}

export class SEOProgressStorage {
  private static readonly STORAGE_KEY = 'seo-generation-progress';
  private static readonly SESSION_KEY = 'seo-generation-session';

  // Sauvegarder la session courante
  static saveSession(session: Partial<SEOSession>): void {
    const currentSession = this.getSession();
    const updatedSession: SEOSession = {
      startedAt: currentSession?.startedAt || new Date(),
      lastUpdatedAt: new Date(),
      processedProductIds: session.processedProductIds || currentSession?.processedProductIds || [],
      failedProductIds: session.failedProductIds || currentSession?.failedProductIds || [],
      totalProducts: session.totalProducts || currentSession?.totalProducts || 0,
      status: session.status || currentSession?.status || 'active'
    };
    
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(updatedSession));
  }

  // Récupérer la session courante
  static getSession(): SEOSession | null {
    try {
      const data = localStorage.getItem(this.SESSION_KEY);
      if (!data) return null;
      
      const session = JSON.parse(data);
      // Convertir les dates strings en objets Date
      session.startedAt = new Date(session.startedAt);
      session.lastUpdatedAt = new Date(session.lastUpdatedAt);
      
      return session;
    } catch (error) {
      console.error('Erreur lors de la lecture de la session:', error);
      return null;
    }
  }

  // Ajouter un produit traité
  static addProcessedProduct(productId: number): void {
    const session = this.getSession();
    if (!session) {
      this.saveSession({
        processedProductIds: [productId],
        status: 'active'
      });
      return;
    }

    if (!session.processedProductIds.includes(productId)) {
      session.processedProductIds.push(productId);
      this.saveSession(session);
    }
  }

  // Ajouter un produit en échec
  static addFailedProduct(productId: number): void {
    const session = this.getSession();
    if (!session) {
      this.saveSession({
        failedProductIds: [productId],
        status: 'active'
      });
      return;
    }

    if (!session.failedProductIds.includes(productId)) {
      session.failedProductIds.push(productId);
      this.saveSession(session);
    }
  }

  // Vérifier si un produit a déjà été traité
  static isProductProcessed(productId: number): boolean {
    const session = this.getSession();
    if (!session) return false;
    
    return session.processedProductIds.includes(productId);
  }

  // Obtenir tous les produits traités
  static getProcessedProductIds(): number[] {
    const session = this.getSession();
    return session?.processedProductIds || [];
  }

  // Obtenir les produits en échec
  static getFailedProductIds(): number[] {
    const session = this.getSession();
    return session?.failedProductIds || [];
  }

  // Mettre à jour le statut
  static updateStatus(status: 'active' | 'paused' | 'completed'): void {
    const session = this.getSession();
    if (session) {
      session.status = status;
      this.saveSession(session);
    }
  }

  // Effacer la progression
  static clearProgress(): void {
    localStorage.removeItem(this.SESSION_KEY);
  }

  // Vérifier s'il y a une session en cours
  static hasActiveSession(): boolean {
    const session = this.getSession();
    return session !== null && session.status !== 'completed';
  }

  // Obtenir des statistiques de la session
  static getSessionStats() {
    const session = this.getSession();
    if (!session) {
      return {
        hasSession: false,
        processedCount: 0,
        failedCount: 0,
        totalProducts: 0,
        percentComplete: 0,
        elapsedTime: 0,
        status: 'none'
      };
    }

    const elapsedTime = Date.now() - session.startedAt.getTime();
    const processedCount = session.processedProductIds.length;
    const percentComplete = session.totalProducts > 0 
      ? Math.round((processedCount / session.totalProducts) * 100)
      : 0;

    return {
      hasSession: true,
      processedCount,
      failedCount: session.failedProductIds.length,
      totalProducts: session.totalProducts,
      percentComplete,
      elapsedTime,
      status: session.status,
      startedAt: session.startedAt,
      lastUpdatedAt: session.lastUpdatedAt
    };
  }

  // Exporter les données de session
  static exportSession(): string {
    const session = this.getSession();
    if (!session) return '';

    const data = {
      ...session,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(data, null, 2);
  }
}