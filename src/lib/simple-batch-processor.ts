import axios from 'axios';
import { Product } from './woocommerce';
import { SEOProgressStorage } from './seo-progress-storage';
import { SEOStyle } from './gemini-single-call';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '/api';

export interface BatchProgress {
  total: number;
  completed: number;
  failed: number;
  isProcessing: boolean;
  estimatedTimeRemaining?: number;
  currentProduct?: {
    id: number;
    name: string;
    index: number;
  };
  isPaused?: boolean;
  currentBatch: number;
  totalBatches: number;
}

export interface GeneratedContent {
  productId: number;
  productName: string;
  title: string;
  shortDescription: string;
  description: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    focusKeyphrase: string;
    keywords: string[];
  };
  success: boolean;
  error?: string;
}

// Simple event emitter pour le navigateur
class SimpleEventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }

  removeListener(event: string, listenerToRemove: Function) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(listener => listener !== listenerToRemove);
  }
}

export class SimpleBatchProcessor extends SimpleEventEmitter {
  private queue: Product[] = [];
  private allProducts: Product[] = []; // Garde une copie de tous les produits
  private isProcessing = false;
  private isPaused = false;
  private completed = 0;
  private failed = 0;
  private startTime?: Date;
  private currentProductIndex = 0;
  private currentProduct?: Product;
  private currentBatchResults: GeneratedContent[] = [];
  private isAutoMode = false;
  private waitingForValidation = false;
  private selectedStyle?: SEOStyle;
  
  // Limite : 10 produits par minute
  private readonly PRODUCTS_PER_BATCH = 10;
  private readonly DELAY_BETWEEN_BATCHES = 60000; // 1 minute

  constructor() {
    super();
  }

  // Démarrer le traitement batch
  async startBatch(products: Product[], style?: SEOStyle): Promise<void> {
    if (this.isProcessing) {
      console.log('Batch already in progress');
      return;
    }
    
    // Stocker le style sélectionné
    this.selectedStyle = style;
    console.log('[SimpleBatchProcessor] Style reçu dans startBatch:', style);

    // Filtrer les produits déjà traités
    const unprocessedProducts = products.filter(p => !SEOProgressStorage.isProductProcessed(p.id));
    
    console.log(`Total produits: ${products.length}, Déjà traités: ${products.length - unprocessedProducts.length}, À traiter: ${unprocessedProducts.length}`);
    
    if (unprocessedProducts.length === 0) {
      this.emit('batch-completed', {
        total: products.length,
        completed: products.length,
        failed: 0,
        allAlreadyProcessed: true
      });
      return;
    }

    this.queue = [...unprocessedProducts];
    this.allProducts = [...products];
    this.completed = 0;
    this.failed = 0;
    this.currentProductIndex = products.length - unprocessedProducts.length; // Commence après les produits déjà traités
    this.isProcessing = true;
    this.isPaused = false;
    this.startTime = new Date();

    // Initialiser ou mettre à jour la session
    SEOProgressStorage.saveSession({
      totalProducts: products.length,
      status: 'active'
    });

    this.emitProgress();

    // Commencer le traitement
    this.processNextBatch();
  }

  // Traiter le prochain lot de produits
  private async processNextBatch(): Promise<void> {
    if (!this.isProcessing || this.isPaused) {
      return;
    }

    // Prendre les 10 prochains produits
    const batch = this.queue.splice(0, this.PRODUCTS_PER_BATCH);
    
    if (batch.length === 0) {
      // Terminé !
      this.isProcessing = false;
      SEOProgressStorage.updateStatus('completed');
      this.emit('all-batches-completed', {
        total: this.completed + this.failed,
        completed: this.completed,
        failed: this.failed
      });
      return;
    }

    // Réinitialiser les résultats du batch
    this.currentBatchResults = [];
    
    // Calculer les informations du batch
    const totalProducts = this.allProducts.length || (this.completed + this.failed + this.queue.length + batch.length);
    const currentBatch = Math.floor(this.currentProductIndex / this.PRODUCTS_PER_BATCH) + 1;
    const totalBatches = Math.ceil(totalProducts / this.PRODUCTS_PER_BATCH);
    
    this.emit('batch-started', {
      batchSize: batch.length,
      currentBatch: currentBatch,
      totalBatches: totalBatches
    });

    // Traiter les produits séquentiellement
    for (let i = 0; i < batch.length; i++) {
      if (!this.isProcessing || this.isPaused) break;
      
      const product = batch[i];
      const globalIndex = this.currentProductIndex + i;
      await this.processProduct(product, globalIndex);
    }

    // Incrémenter l'index global
    this.currentProductIndex += batch.length;
    
    this.emitProgress();

    // Émettre les résultats du batch pour validation
    this.emit('batch-results', {
      results: this.currentBatchResults,
      hasMore: this.queue.length > 0
    });

    // Si mode auto ou pas d'autres produits, continuer
    if (this.isAutoMode && this.queue.length > 0) {
      this.emit('waiting-next-batch', { 
        waitTime: this.DELAY_BETWEEN_BATCHES,
        remaining: this.queue.length 
      });
      
      setTimeout(() => {
        this.processNextBatch();
      }, this.DELAY_BETWEEN_BATCHES);
    } else if (this.queue.length > 0) {
      // Mode manuel : attendre la validation
      this.waitingForValidation = true;
      this.emit('waiting-validation');
    } else {
      // Plus de produits
      this.isProcessing = false;
      SEOProgressStorage.updateStatus('completed');
      this.emit('all-batches-completed', {
        total: this.completed + this.failed,
        completed: this.completed,
        failed: this.failed
      });
    }
  }

  // Traiter un seul produit
  private async processProduct(product: Product, globalIndex: number): Promise<void> {
    try {
      // Mettre à jour le produit courant
      this.currentProduct = product;
      
      this.emit('product-processing', {
        product,
        index: globalIndex + 1,
        total: this.allProducts.length
      });
      
      // Appel API pour générer le contenu
      console.log('[SimpleBatchProcessor] Envoi API avec style:', this.selectedStyle);
      const response = await axios.post(`${SERVER_URL}/ai/generate-single-call`, {
        product,
        style: this.selectedStyle
      });
      
      // Stocker le résultat pour affichage
      const generatedContent: GeneratedContent = {
        productId: product.id,
        productName: product.name,
        title: response.data.title,
        shortDescription: response.data.shortDescription,
        description: response.data.description,
        seo: response.data.seo,
        success: true
      };
      
      this.currentBatchResults.push(generatedContent);
      
      // Préparer les données pour la mise à jour
      const updatePayload = {
        name: response.data.title,
        description: response.data.description,
        short_description: response.data.shortDescription,
        meta_data: [
          { key: '_yoast_wpseo_title', value: response.data.seo.metaTitle },
          { key: '_yoast_wpseo_metadesc', value: response.data.seo.metaDescription },
          { key: '_yoast_wpseo_focuskw', value: response.data.seo.focusKeyphrase },
          { key: '_yoast_wpseo_metakeywords', value: response.data.seo.keywords.join(', ') }
        ]
      };
      
      // Mettre à jour le produit dans WooCommerce
      await axios.put(`${SERVER_URL}/wc/products/${product.id}`, updatePayload);
      
      this.completed++;
      SEOProgressStorage.addProcessedProduct(product.id);
      this.emit('product-completed', {
        product,
        content: generatedContent,
        index: globalIndex + 1,
        total: this.allProducts.length
      });
      
    } catch (error) {
      this.failed++;
      SEOProgressStorage.addFailedProduct(product.id);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const failedContent: GeneratedContent = {
        productId: product.id,
        productName: product.name,
        title: '',
        shortDescription: '',
        description: '',
        seo: {
          metaTitle: '',
          metaDescription: '',
          focusKeyphrase: '',
          keywords: []
        },
        success: false,
        error: errorMessage
      };
      
      this.currentBatchResults.push(failedContent);
      
      this.emit('product-failed', { 
        product, 
        error: errorMessage,
        index: globalIndex + 1,
        total: this.allProducts.length
      });
    }
  }

  // Mettre en pause
  pause(): void {
    if (this.isProcessing && !this.isPaused) {
      this.isPaused = true;
      SEOProgressStorage.updateStatus('paused');
      this.emit('batch-paused');
      this.emitProgress();
    }
  }

  // Reprendre
  resume(): void {
    if (this.isProcessing && this.isPaused) {
      this.isPaused = false;
      SEOProgressStorage.updateStatus('active');
      this.emit('batch-resumed');
      this.emitProgress();
      this.processNextBatch();
    }
  }

  // Annuler
  cancel(): void {
    this.isProcessing = false;
    this.isPaused = false;
    this.queue = [];
    this.emit('batch-cancelled');
  }

  // Obtenir l'état actuel
  getProgress(): BatchProgress {
    const total = this.allProducts.length || (this.completed + this.failed + this.queue.length);
    const estimatedTimeRemaining = this.calculateTimeRemaining();
    const processedIds = SEOProgressStorage.getProcessedProductIds();
    const actualCompleted = processedIds.length;
    const currentBatch = Math.floor(this.currentProductIndex / this.PRODUCTS_PER_BATCH) + 1;
    const totalBatches = Math.ceil(total / this.PRODUCTS_PER_BATCH);
    
    return {
      total,
      completed: actualCompleted,
      failed: this.failed,
      isProcessing: this.isProcessing,
      isPaused: this.isPaused,
      estimatedTimeRemaining,
      currentProduct: this.currentProduct ? {
        id: this.currentProduct.id,
        name: this.currentProduct.name,
        index: this.currentProductIndex
      } : undefined,
      currentBatch,
      totalBatches
    };
  }

  // Calculer le temps restant
  private calculateTimeRemaining(): number | undefined {
    if (!this.startTime || this.completed === 0) {
      return undefined;
    }

    const elapsedTime = Date.now() - this.startTime.getTime();
    const averageTimePerProduct = elapsedTime / this.completed;
    const remainingProducts = this.queue.length;
    
    // Ajouter le temps d'attente entre les batchs
    const remainingBatches = Math.ceil(remainingProducts / this.PRODUCTS_PER_BATCH);
    const waitingTime = (remainingBatches - 1) * this.DELAY_BETWEEN_BATCHES;
    
    return (remainingProducts * averageTimePerProduct) + waitingTime;
  }

  // Émettre la progression
  private emitProgress(): void {
    const progress = this.getProgress();
    this.emit('progress-update', progress);
    
    // Mettre à jour la session dans localStorage
    if (this.isProcessing) {
      SEOProgressStorage.saveSession({
        totalProducts: progress.total,
        status: this.isPaused ? 'paused' : 'active'
      });
    }
  }

  // Vérifier si le traitement est en cours
  isRunning(): boolean {
    return this.isProcessing;
  }

  // Vérifier si en pause
  isPausedStatus(): boolean {
    return this.isPaused;
  }
  
  // Définir le mode auto
  setAutoMode(autoMode: boolean): void {
    this.isAutoMode = autoMode;
    this.emit('auto-mode-changed', autoMode);
  }
  
  // Définir le style SEO
  setStyle(style?: SEOStyle): void {
    this.selectedStyle = style;
    console.log('[SimpleBatchProcessor] Style défini via setStyle:', style);
  }
  
  // Valider le batch et continuer
  validateAndContinue(): void {
    if (this.waitingForValidation && this.queue.length > 0) {
      this.waitingForValidation = false;
      
      // Attendre avant le prochain batch
      this.emit('waiting-next-batch', { 
        waitTime: this.DELAY_BETWEEN_BATCHES,
        remaining: this.queue.length 
      });
      
      setTimeout(() => {
        this.processNextBatch();
      }, this.DELAY_BETWEEN_BATCHES);
    }
  }
  
  // Obtenir les résultats du batch actuel
  getCurrentBatchResults(): GeneratedContent[] {
    return [...this.currentBatchResults];
  }
}