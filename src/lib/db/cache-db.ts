import Dexie, { Table } from 'dexie';
import { logger } from '@/lib/logger';

// Interfaces pour les données cachées
export interface CachedOrder {
  id?: number;
  siteId: number;
  orderId: number;
  data: any; // Order data from WooCommerce
  lastUpdated: Date;
}

export interface CachedProduct {
  id?: number;
  siteId: number;
  productId: number;
  data: any; // Product data from WooCommerce
  lastUpdated: Date;
}

export interface CachedCustomer {
  id?: number;
  siteId: number;
  customerId: number;
  data: any; // Customer data from WooCommerce
  lastUpdated: Date;
}

export interface CachedPost {
  id?: number;
  siteId: number;
  postId: number;
  data: any; // Post data from WordPress
  lastUpdated: Date;
}

export interface CachedPage {
  id?: number;
  siteId: number;
  pageId: number;
  data: any; // Page data from WordPress
  lastUpdated: Date;
}

export interface CachedMedia {
  id?: number;
  siteId: number;
  mediaId: number;
  data: any; // Media data from WordPress
  lastUpdated: Date;
}

export interface CachedComment {
  id?: number;
  siteId: number;
  commentId: number;
  data: any; // Comment data from WordPress
  lastUpdated: Date;
}

export interface CachedUser {
  id?: number;
  siteId: number;
  userId: number;
  data: any; // User data from WordPress
  lastUpdated: Date;
}

export interface SyncMetadata {
  id?: number;
  siteId: number;
  dataType: 'orders' | 'products' | 'customers' | 'posts' | 'pages' | 'media' | 'comments' | 'users';
  lastSync: Date;
  totalCount: number;
  syncedCount: number;
  status: 'idle' | 'syncing' | 'completed' | 'error';
  error?: string;
  nextSyncScheduled?: Date;
}

export interface SyncLog {
  id?: number;
  siteId: number;
  startTime: Date;
  endTime?: Date;
  dataType: string;
  itemsSynced: number;
  status: 'started' | 'completed' | 'failed';
  error?: string;
}

class CacheDatabase extends Dexie {
  // WooCommerce tables
  orders!: Table<CachedOrder>;
  products!: Table<CachedProduct>;
  customers!: Table<CachedCustomer>;
  
  // WordPress tables
  posts!: Table<CachedPost>;
  pages!: Table<CachedPage>;
  media!: Table<CachedMedia>;
  comments!: Table<CachedComment>;
  users!: Table<CachedUser>;
  
  // Metadata tables
  syncMetadata!: Table<SyncMetadata>;
  syncLogs!: Table<SyncLog>;

  constructor() {
    super('EIDFCacheDB');
    
    this.version(1).stores({
      // WooCommerce tables with composite indexes
      orders: '++id, [siteId+orderId], siteId, orderId, lastUpdated',
      products: '++id, [siteId+productId], siteId, productId, lastUpdated',
      customers: '++id, [siteId+customerId], siteId, customerId, lastUpdated',
      
      // WordPress tables
      posts: '++id, [siteId+postId], siteId, postId, lastUpdated',
      pages: '++id, [siteId+pageId], siteId, pageId, lastUpdated',
      media: '++id, [siteId+mediaId], siteId, mediaId, lastUpdated',
      comments: '++id, [siteId+commentId], siteId, commentId, postId, lastUpdated',
      users: '++id, [siteId+userId], siteId, userId, lastUpdated',
      
      // Metadata
      syncMetadata: '++id, [siteId+dataType], siteId, dataType, status, lastSync',
      syncLogs: '++id, siteId, dataType, startTime, status'
    });
  }

  // Helper methods for cache management
  async clearSiteCache(siteId: number): Promise<void> {
    logger.info(`Clearing cache for site ${siteId}`, undefined, 'CacheDB');
    
    await this.transaction('rw', 
      this.orders, this.products, this.customers,
      this.posts, this.pages, this.media, this.comments, this.users,
      this.syncMetadata, this.syncLogs,
      async () => {
        await Promise.all([
          this.orders.where('siteId').equals(siteId).delete(),
          this.products.where('siteId').equals(siteId).delete(),
          this.customers.where('siteId').equals(siteId).delete(),
          this.posts.where('siteId').equals(siteId).delete(),
          this.pages.where('siteId').equals(siteId).delete(),
          this.media.where('siteId').equals(siteId).delete(),
          this.comments.where('siteId').equals(siteId).delete(),
          this.users.where('siteId').equals(siteId).delete(),
          this.syncMetadata.where('siteId').equals(siteId).delete(),
          this.syncLogs.where('siteId').equals(siteId).delete(),
        ]);
      }
    );
  }

  async getCacheSize(): Promise<{ totalItems: number; sizeEstimate: string }> {
    const counts = await Promise.all([
      this.orders.count(),
      this.products.count(),
      this.customers.count(),
      this.posts.count(),
      this.pages.count(),
      this.media.count(),
      this.comments.count(),
      this.users.count(),
    ]);

    const totalItems = counts.reduce((sum, count) => sum + count, 0);
    
    // Rough estimate: 1KB per item average
    const sizeEstimate = `${(totalItems / 1024).toFixed(2)} MB`;

    return { totalItems, sizeEstimate };
  }

  async getLastSync(siteId: number, dataType: string): Promise<Date | null> {
    const metadata = await this.syncMetadata
      .where(['siteId', 'dataType'])
      .equals([siteId, dataType])
      .first();
    
    return metadata?.lastSync || null;
  }

  async updateSyncMetadata(
    siteId: number, 
    dataType: SyncMetadata['dataType'], 
    updates: Partial<SyncMetadata>
  ): Promise<void> {
    const existing = await this.syncMetadata
      .where(['siteId', 'dataType'])
      .equals([siteId, dataType])
      .first();

    if (existing && existing.id !== undefined) {
      await this.syncMetadata.update(existing.id, updates);
    } else {
      await this.syncMetadata.add({
        siteId,
        dataType,
        lastSync: new Date(),
        totalCount: 0,
        syncedCount: 0,
        status: 'idle',
        ...updates
      });
    }
  }

  async logSync(log: Omit<SyncLog, 'id'>): Promise<number> {
    return await this.syncLogs.add(log);
  }
}

// Export singleton instance
export const cacheDB = new CacheDatabase();

// Cache utilities
export const cacheUtils = {
  /**
   * Check if cache is stale
   */
  isStale(lastUpdated: Date, maxAgeMinutes: number = 30): boolean {
    const now = new Date();
    const diffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    return diffMinutes > maxAgeMinutes;
  },

  /**
   * Get cache key for composite indexes
   */
  getCacheKey(siteId: number, itemId: number): string {
    return `${siteId}-${itemId}`;
  },

  /**
   * Batch update items in cache
   */
  async batchUpdate<T extends { siteId: number; [key: string]: any }>(
    table: Table<T>,
    siteId: number,
    items: any[],
    getItemId: (item: any) => number,
    transformItem: (item: any) => T
  ): Promise<void> {
    const now = new Date();
    const cacheItems = items.map(item => ({
      ...transformItem(item),
      lastUpdated: now
    }));

    await table.bulkPut(cacheItems);
    logger.debug(`Cached ${items.length} items`, { table: table.name, siteId }, 'CacheDB');
  },

  /**
   * Upsert items with composite keys for WooCommerce data
   */
  async upsertWooCommerceData<T extends { siteId: number; [key: string]: any }>(
    table: Table<T>,
    items: T[],
    compositeKeyFields: [string, string]
  ): Promise<void> {
    // Pour chaque item, vérifier s'il existe déjà et faire un update ou insert
    for (const item of items) {
      const [field1, field2] = compositeKeyFields;
      const existing = await table
        .where(`[${field1}+${field2}]`)
        .equals([item[field1], item[field2]])
        .first();
      
      if (existing && existing.id) {
        // Update existing record
        await table.update(existing.id, item);
      } else {
        // Insert new record (sans l'id)
        const { id, ...itemWithoutId } = item;
        await table.add(itemWithoutId as T);
      }
    }
  }
};