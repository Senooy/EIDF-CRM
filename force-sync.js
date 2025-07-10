// Script pour forcer la synchronisation immédiate
// À exécuter dans la console du navigateur

async function forceSync() {
  const { cacheDB } = await import('/src/lib/db/cache-db.ts');
  const { syncService } = await import('/src/lib/services/sync-service.ts');
  const { configService } = await import('/src/lib/db/config.ts');
  
  console.log('=== SYNCHRONISATION FORCÉE ===');
  
  // Obtenir le site actif
  const activeSite = await configService.getActiveSite();
  if (!activeSite) {
    console.error('Aucun site actif configuré');
    return;
  }
  
  const siteId = activeSite.id;
  console.log('Site:', activeSite.name, 'ID:', siteId);
  
  // Réinitialiser les métadonnées de sync pour forcer une nouvelle sync
  console.log('\n--- Réinitialisation des métadonnées ---');
  await cacheDB.syncMetadata.where('siteId').equals(siteId).delete();
  console.log('✅ Métadonnées supprimées');
  
  // État avant
  console.log('\n--- État avant sync ---');
  const before = {
    orders: await cacheDB.orders.where('siteId').equals(siteId).count(),
    products: await cacheDB.products.where('siteId').equals(siteId).count(),
    customers: await cacheDB.customers.where('siteId').equals(siteId).count()
  };
  console.table(before);
  
  // Synchroniser avec force
  console.log('\n--- Synchronisation en cours ---');
  try {
    await syncService.syncAll(siteId, {
      dataTypes: ['orders', 'products', 'customers'],
      forceFullSync: true,
      onProgress: (progress) => {
        console.log(`${progress.currentType}: ${progress.current}/${progress.total} (${progress.percentage}%)`);
      }
    });
    
    console.log('\n✅ Synchronisation terminée');
    
    // État après
    console.log('\n--- État après sync ---');
    const after = {
      orders: await cacheDB.orders.where('siteId').equals(siteId).count(),
      products: await cacheDB.products.where('siteId').equals(siteId).count(),
      customers: await cacheDB.customers.where('siteId').equals(siteId).count()
    };
    console.table(after);
    
    // Afficher les différences
    console.log('\n--- Nouveaux éléments ---');
    console.log('Commandes:', after.orders - before.orders);
    console.log('Produits:', after.products - before.products);
    console.log('Clients:', after.customers - before.customers);
    
    // Afficher un exemple de chaque type
    if (after.orders > 0) {
      const order = await cacheDB.orders.where('siteId').equals(siteId).first();
      console.log('\nExemple de commande:', order);
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    console.error('Stack:', error.stack);
    
    // Détails supplémentaires pour debug
    if (error.message && error.message.includes('upsert')) {
      console.error('\n⚠️ Problème avec la fonction upsert');
      console.log('Vérification de cacheUtils.upsertWooCommerceData:', 
        typeof cacheDB.cacheUtils?.upsertWooCommerceData);
    }
  }
}

// Fonction pour vérifier l'état des métadonnées
async function checkSyncMetadata() {
  const { cacheDB } = await import('/src/lib/db/cache-db.ts');
  const { configService } = await import('/src/lib/db/config.ts');
  
  const activeSite = await configService.getActiveSite();
  if (!activeSite) return;
  
  const metadata = await cacheDB.syncMetadata
    .where('siteId')
    .equals(activeSite.id)
    .toArray();
    
  console.log('Métadonnées de synchronisation:');
  console.table(metadata);
}

// Lancer la synchronisation forcée
forceSync();