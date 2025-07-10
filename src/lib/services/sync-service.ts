import { cacheDB, cacheUtils, SyncMetadata } from '@/lib/db/cache-db';
import { wpClientManager } from '@/lib/api/wordpress-client';
import { 
  getAllOrders, 
  getAllProducts, 
  getAllCustomers,
  getOrderById,
  getProductById,
  getCustomerById
} from '@/lib/woocommerce-multi';
import { wpAnalytics } from '@/lib/api/wordpress-analytics';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export interface SyncProgress {
  total: number;
  current: number;
  percentage: number;
  currentType: string;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  message?: string;
}

export interface SyncOptions {
  forceFullSync?: boolean;
  dataTypes?: Array<'orders' | 'products' | 'customers' | 'posts' | 'pages' | 'media' | 'comments' | 'users'>;
  onProgress?: (progress: SyncProgress) => void;
  silent?: boolean;
}

class SyncService {
  private syncInProgress = false;
  private abortController?: AbortController;

  /**
   * Sync all data for a site
   */
  async syncAll(siteId: number, options: SyncOptions = {}): Promise<void> {
    if (this.syncInProgress) {
      throw new Error('Une synchronisation est déjà en cours');
    }

    this.syncInProgress = true;
    this.abortController = new AbortController();

    const dataTypes = options.dataTypes || [
      'orders', 'products', 'customers', 
      'posts', 'pages', 'media', 'comments', 'users'
    ];

    const startTime = new Date();
    const logId = await cacheDB.logSync({
      siteId,
      startTime,
      dataType: 'all',
      itemsSynced: 0,
      status: 'started'
    });

    try {
      let totalProgress = 0;
      const progressPerType = 100 / dataTypes.length;

      for (const dataType of dataTypes) {
        if (this.abortController.signal.aborted) break;

        await this.syncDataType(siteId, dataType, {
          forceFullSync: options.forceFullSync,
          onProgress: (typeProgress) => {
            const overallProgress = totalProgress + (typeProgress.percentage * progressPerType / 100);
            options.onProgress?.({
              ...typeProgress,
              percentage: Math.round(overallProgress)
            });
          }
        });

        totalProgress += progressPerType;
      }

      await cacheDB.syncLogs.update(logId, {
        endTime: new Date(),
        status: 'completed',
        itemsSynced: await this.getTotalSyncedItems(siteId)
      });

      if (!options.silent) {
        toast.success('Synchronisation terminée avec succès');
      }
    } catch (error) {
      logger.error('Sync failed', error, 'SyncService');
      
      await cacheDB.syncLogs.update(logId, {
        endTime: new Date(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      if (!options.silent) {
        toast.error('Erreur lors de la synchronisation');
      }
      
      throw error;
    } finally {
      this.syncInProgress = false;
      this.abortController = undefined;
    }
  }

  /**
   * Sync a specific data type
   */
  private async syncDataType(
    siteId: number, 
    dataType: SyncMetadata['dataType'],
    options: { forceFullSync?: boolean; onProgress?: (progress: SyncProgress) => void }
  ): Promise<void> {
    logger.info(`Starting sync for ${dataType}`, { siteId }, 'SyncService');

    await cacheDB.updateSyncMetadata(siteId, dataType, {
      status: 'syncing',
      error: undefined
    });

    try {
      switch (dataType) {
        case 'orders':
          await this.syncOrders(siteId, options);
          break;
        case 'products':
          await this.syncProducts(siteId, options);
          break;
        case 'customers':
          await this.syncCustomers(siteId, options);
          break;
        case 'posts':
          await this.syncPosts(siteId, options);
          break;
        case 'pages':
          await this.syncPages(siteId, options);
          break;
        case 'media':
          await this.syncMedia(siteId, options);
          break;
        case 'comments':
          await this.syncComments(siteId, options);
          break;
        case 'users':
          await this.syncUsers(siteId, options);
          break;
      }

      await cacheDB.updateSyncMetadata(siteId, dataType, {
        status: 'completed',
        lastSync: new Date()
      });
    } catch (error) {
      await cacheDB.updateSyncMetadata(siteId, dataType, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Sync WooCommerce orders
   */
  private async syncOrders(
    siteId: number,
    options: { forceFullSync?: boolean; onProgress?: (progress: SyncProgress) => void }
  ): Promise<void> {
    const lastSync = await cacheDB.getLastSync(siteId, 'orders');
    
    // Check if we need to sync
    if (!options.forceFullSync && lastSync && !cacheUtils.isStale(lastSync, 30)) {
      logger.info('Orders cache is fresh, skipping sync', { siteId }, 'SyncService');
      return;
    }

    // Get all orders
    const orders = await getAllOrders(undefined, siteId);
    const total = orders.length;

    // Clear existing orders if full sync
    if (options.forceFullSync) {
      await cacheDB.orders.where('siteId').equals(siteId).delete();
    }

    // Batch insert orders
    const batchSize = 100;
    for (let i = 0; i < orders.length; i += batchSize) {
      if (this.abortController?.signal.aborted) break;

      const batch = orders.slice(i, i + batchSize);
      const cacheItems = batch.map(order => ({
        siteId,
        orderId: order.id,
        data: order,
        lastUpdated: new Date()
      }));

      await cacheUtils.upsertWooCommerceData(cacheDB.orders, cacheItems, ['siteId', 'orderId']);

      const current = Math.min(i + batchSize, total);
      options.onProgress?.({
        total,
        current,
        percentage: Math.round((current / total) * 100),
        currentType: 'orders',
        status: 'syncing',
        message: `Synchronisation des commandes: ${current}/${total}`
      });
    }

    await cacheDB.updateSyncMetadata(siteId, 'orders', {
      totalCount: total,
      syncedCount: total
    });

    logger.info(`Synced ${total} orders`, { siteId }, 'SyncService');
  }

  /**
   * Sync WooCommerce products
   */
  private async syncProducts(
    siteId: number,
    options: { forceFullSync?: boolean; onProgress?: (progress: SyncProgress) => void }
  ): Promise<void> {
    const lastSync = await cacheDB.getLastSync(siteId, 'products');
    
    if (!options.forceFullSync && lastSync && !cacheUtils.isStale(lastSync, 60)) {
      logger.info('Products cache is fresh, skipping sync', { siteId }, 'SyncService');
      return;
    }

    const products = await getAllProducts({}, siteId);
    const total = products.length;

    if (options.forceFullSync) {
      await cacheDB.products.where('siteId').equals(siteId).delete();
    }

    const batchSize = 50;
    for (let i = 0; i < products.length; i += batchSize) {
      if (this.abortController?.signal.aborted) break;

      const batch = products.slice(i, i + batchSize);
      const cacheItems = batch.map(product => ({
        siteId,
        productId: product.id,
        data: product,
        lastUpdated: new Date()
      }));

      await cacheUtils.upsertWooCommerceData(cacheDB.products, cacheItems, ['siteId', 'productId']);

      const current = Math.min(i + batchSize, total);
      options.onProgress?.({
        total,
        current,
        percentage: Math.round((current / total) * 100),
        currentType: 'products',
        status: 'syncing',
        message: `Synchronisation des produits: ${current}/${total}`
      });
    }

    await cacheDB.updateSyncMetadata(siteId, 'products', {
      totalCount: total,
      syncedCount: total
    });

    logger.info(`Synced ${total} products`, { siteId }, 'SyncService');
  }

  /**
   * Sync WooCommerce customers
   */
  private async syncCustomers(
    siteId: number,
    options: { forceFullSync?: boolean; onProgress?: (progress: SyncProgress) => void }
  ): Promise<void> {
    const lastSync = await cacheDB.getLastSync(siteId, 'customers');
    
    if (!options.forceFullSync && lastSync && !cacheUtils.isStale(lastSync, 120)) {
      logger.info('Customers cache is fresh, skipping sync', { siteId }, 'SyncService');
      return;
    }

    const customers = await getAllCustomers({}, siteId);
    const total = customers.length;

    if (options.forceFullSync) {
      await cacheDB.customers.where('siteId').equals(siteId).delete();
    }

    const batchSize = 100;
    for (let i = 0; i < customers.length; i += batchSize) {
      if (this.abortController?.signal.aborted) break;

      const batch = customers.slice(i, i + batchSize);
      const cacheItems = batch.map(customer => ({
        siteId,
        customerId: customer.id,
        data: customer,
        lastUpdated: new Date()
      }));

      await cacheUtils.upsertWooCommerceData(cacheDB.customers, cacheItems, ['siteId', 'customerId']);

      const current = Math.min(i + batchSize, total);
      options.onProgress?.({
        total,
        current,
        percentage: Math.round((current / total) * 100),
        currentType: 'customers',
        status: 'syncing',
        message: `Synchronisation des clients: ${current}/${total}`
      });
    }

    await cacheDB.updateSyncMetadata(siteId, 'customers', {
      totalCount: total,
      syncedCount: total
    });

    logger.info(`Synced ${total} customers`, { siteId }, 'SyncService');
  }

  /**
   * Sync WordPress posts
   */
  private async syncPosts(
    siteId: number,
    options: { forceFullSync?: boolean; onProgress?: (progress: SyncProgress) => void }
  ): Promise<void> {
    const lastSync = await cacheDB.getLastSync(siteId, 'posts');
    
    if (!options.forceFullSync && lastSync && !cacheUtils.isStale(lastSync, 60)) {
      logger.info('Posts cache is fresh, skipping sync', { siteId }, 'SyncService');
      return;
    }

    const client = await wpClientManager.getClient(siteId);
    const analytics = new (wpAnalytics as any).constructor();
    const posts = await analytics.getAllPosts(client);
    const total = posts.length;

    if (options.forceFullSync) {
      await cacheDB.posts.where('siteId').equals(siteId).delete();
    }

    const batchSize = 100;
    for (let i = 0; i < posts.length; i += batchSize) {
      if (this.abortController?.signal.aborted) break;

      const batch = posts.slice(i, i + batchSize);
      const cacheItems = batch.map((post: any) => ({
        siteId,
        postId: post.id,
        data: post,
        lastUpdated: new Date()
      }));

      await cacheDB.posts.bulkPut(cacheItems);

      const current = Math.min(i + batchSize, total);
      options.onProgress?.({
        total,
        current,
        percentage: Math.round((current / total) * 100),
        currentType: 'posts',
        status: 'syncing',
        message: `Synchronisation des articles: ${current}/${total}`
      });
    }

    await cacheDB.updateSyncMetadata(siteId, 'posts', {
      totalCount: total,
      syncedCount: total
    });

    logger.info(`Synced ${total} posts`, { siteId }, 'SyncService');
  }

  /**
   * Similar implementations for pages, media, comments, users
   */
  private async syncPages(siteId: number, options: any): Promise<void> {
    // Similar to syncPosts
    const client = await wpClientManager.getClient(siteId);
    const analytics = new (wpAnalytics as any).constructor();
    const pages = await analytics.getAllPages(client);
    
    await this.syncWordPressData(siteId, 'pages', pages, 'pageId', options);
  }

  private async syncMedia(siteId: number, options: any): Promise<void> {
    const client = await wpClientManager.getClient(siteId);
    const analytics = new (wpAnalytics as any).constructor();
    const media = await analytics.getAllMedia(client);
    
    await this.syncWordPressData(siteId, 'media', media, 'mediaId', options);
  }

  private async syncComments(siteId: number, options: any): Promise<void> {
    const client = await wpClientManager.getClient(siteId);
    const analytics = new (wpAnalytics as any).constructor();
    const comments = await analytics.getAllComments(client);
    
    await this.syncWordPressData(siteId, 'comments', comments, 'commentId', options);
  }

  private async syncUsers(siteId: number, options: any): Promise<void> {
    const client = await wpClientManager.getClient(siteId);
    const analytics = new (wpAnalytics as any).constructor();
    const users = await analytics.getAllUsers(client);
    
    await this.syncWordPressData(siteId, 'users', users, 'userId', options);
  }

  /**
   * Generic WordPress data sync
   */
  private async syncWordPressData(
    siteId: number,
    dataType: string,
    items: any[],
    idField: string,
    options: { forceFullSync?: boolean; onProgress?: (progress: SyncProgress) => void }
  ): Promise<void> {
    const table = (cacheDB as any)[dataType];
    const total = items.length;

    if (options.forceFullSync) {
      await table.where('siteId').equals(siteId).delete();
    }

    const batchSize = 100;
    for (let i = 0; i < items.length; i += batchSize) {
      if (this.abortController?.signal.aborted) break;

      const batch = items.slice(i, i + batchSize);
      const cacheItems = batch.map(item => ({
        siteId,
        [idField]: item.id,
        data: item,
        lastUpdated: new Date()
      }));

      await table.bulkPut(cacheItems);

      const current = Math.min(i + batchSize, total);
      options.onProgress?.({
        total,
        current,
        percentage: Math.round((current / total) * 100),
        currentType: dataType,
        status: 'syncing',
        message: `Synchronisation ${dataType}: ${current}/${total}`
      });
    }

    await cacheDB.updateSyncMetadata(siteId, dataType as any, {
      totalCount: total,
      syncedCount: total
    });

    logger.info(`Synced ${total} ${dataType}`, { siteId }, 'SyncService');
  }

  /**
   * Get total synced items for a site
   */
  private async getTotalSyncedItems(siteId: number): Promise<number> {
    const counts = await Promise.all([
      cacheDB.orders.where('siteId').equals(siteId).count(),
      cacheDB.products.where('siteId').equals(siteId).count(),
      cacheDB.customers.where('siteId').equals(siteId).count(),
      cacheDB.posts.where('siteId').equals(siteId).count(),
      cacheDB.pages.where('siteId').equals(siteId).count(),
      cacheDB.media.where('siteId').equals(siteId).count(),
      cacheDB.comments.where('siteId').equals(siteId).count(),
      cacheDB.users.where('siteId').equals(siteId).count(),
    ]);

    return counts.reduce((sum, count) => sum + count, 0);
  }

  /**
   * Cancel ongoing sync
   */
  cancelSync(): void {
    this.abortController?.abort();
  }

  /**
   * Check if sync is in progress
   */
  isSyncing(): boolean {
    return this.syncInProgress;
  }

  /**
   * Get sync status for a site
   */
  async getSyncStatus(siteId: number): Promise<Record<string, SyncMetadata>> {
    const metadata = await cacheDB.syncMetadata
      .where('siteId')
      .equals(siteId)
      .toArray();

    return metadata.reduce((acc, item) => {
      acc[item.dataType] = item;
      return acc;
    }, {} as Record<string, SyncMetadata>);
  }

  /**
   * Incremental sync - sync only new/updated items
   */
  async incrementalSync(siteId: number, dataType: SyncMetadata['dataType']): Promise<void> {
    const lastSync = await cacheDB.getLastSync(siteId, dataType);
    if (!lastSync) {
      // No previous sync, do full sync
      await this.syncDataType(siteId, dataType, { forceFullSync: true });
      return;
    }

    logger.info(`Starting incremental sync for ${dataType}`, { siteId, lastSync }, 'SyncService');

    // For WooCommerce data, we can use modified_after parameter
    // For WordPress data, we need to compare dates manually
    // This is a simplified version - in production, you'd want more sophisticated logic

    switch (dataType) {
      case 'orders':
        await this.incrementalSyncOrders(siteId, lastSync);
        break;
      // Add other incremental sync methods as needed
    }
  }

  private async incrementalSyncOrders(siteId: number, lastSync: Date): Promise<void> {
    // WooCommerce supports modified_after parameter
    const client = await wpClientManager.getClient(siteId);
    const modifiedOrders = await client.getOrders({
      modified_after: lastSync.toISOString(),
      per_page: 100
    });

    const orders = Array.isArray(modifiedOrders) ? modifiedOrders : modifiedOrders.data || [];
    
    for (const order of orders) {
      await cacheDB.orders.put({
        siteId,
        orderId: order.id,
        data: order,
        lastUpdated: new Date()
      });
    }

    logger.info(`Incremental sync: updated ${orders.length} orders`, { siteId }, 'SyncService');
  }
}

// Export singleton instance
export const syncService = new SyncService();