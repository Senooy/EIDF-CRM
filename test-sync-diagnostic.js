// Script de diagnostic complet pour la synchronisation
// À exécuter dans la console du navigateur

async function diagnosticSync() {
  console.log('=== DIAGNOSTIC DE SYNCHRONISATION ===');
  
  // Importer les modules nécessaires
  const modules = {};
  try {
    modules.cacheDB = (await import('/src/lib/db/cache-db.ts')).cacheDB;
    modules.cacheUtils = (await import('/src/lib/db/cache-db.ts')).cacheUtils;
    modules.syncService = (await import('/src/lib/services/sync-service.ts')).syncService;
    modules.configService = (await import('/src/lib/db/config.ts')).configService;
    console.log('✅ Modules importés avec succès');
  } catch (error) {
    console.error('❌ Erreur lors de l\'import des modules:', error);
    return;
  }
  
  const { cacheDB, cacheUtils, syncService, configService } = modules;
  
  // 1. Vérifier le site actif
  console.log('\n--- 1. SITE ACTIF ---');
  const activeSite = await configService.getActiveSite();
  if (!activeSite) {
    console.error('❌ Aucun site actif');
    const allSites = await configService.getAllSites();
    console.log('Sites disponibles:', allSites);
    return;
  }
  
  console.log('✅ Site actif:', activeSite);
  const siteId = activeSite.id;
  
  // 2. Vérifier la base de données
  console.log('\n--- 2. BASE DE DONNÉES ---');
  console.log('Version Dexie:', cacheDB.verno);
  console.log('Tables:', Object.keys(cacheDB._allTables));
  
  // 3. État du cache avant sync
  console.log('\n--- 3. ÉTAT DU CACHE AVANT SYNC ---');
  const countsBefore = {
    orders: await cacheDB.orders.where('siteId').equals(siteId).count(),
    products: await cacheDB.products.where('siteId').equals(siteId).count(),
    customers: await cacheDB.customers.where('siteId').equals(siteId).count(),
    posts: await cacheDB.posts.where('siteId').equals(siteId).count(),
    pages: await cacheDB.pages.where('siteId').equals(siteId).count(),
    users: await cacheDB.users.where('siteId').equals(siteId).count()
  };
  console.table(countsBefore);
  
  // 4. Tester la méthode upsert
  console.log('\n--- 4. TEST UPSERT ---');
  try {
    // Créer des données de test
    const testOrder = {
      siteId: siteId,
      orderId: 99999,
      data: { id: 99999, status: 'test', total: '100.00' },
      lastUpdated: new Date()
    };
    
    // Tester l'insertion
    await cacheUtils.upsertWooCommerceData(cacheDB.orders, [testOrder], ['siteId', 'orderId']);
    console.log('✅ Insertion test réussie');
    
    // Vérifier que l'ordre existe
    const inserted = await cacheDB.orders
      .where('[siteId+orderId]')
      .equals([siteId, 99999])
      .first();
    console.log('Ordre inséré:', inserted);
    
    // Tester la mise à jour
    testOrder.data.total = '200.00';
    testOrder.lastUpdated = new Date();
    await cacheUtils.upsertWooCommerceData(cacheDB.orders, [testOrder], ['siteId', 'orderId']);
    console.log('✅ Mise à jour test réussie');
    
    // Vérifier la mise à jour
    const updated = await cacheDB.orders
      .where('[siteId+orderId]')
      .equals([siteId, 99999])
      .first();
    console.log('Ordre mis à jour:', updated);
    
    // Nettoyer
    await cacheDB.orders.where('[siteId+orderId]').equals([siteId, 99999]).delete();
    console.log('✅ Nettoyage réussi');
    
  } catch (error) {
    console.error('❌ Erreur lors du test upsert:', error);
  }
  
  // 5. Synchronisation partielle
  console.log('\n--- 5. SYNCHRONISATION WOOCOMMERCE ---');
  console.log('Lancement de la synchronisation...');
  
  try {
    await syncService.syncAll(siteId, {
      dataTypes: ['orders', 'products', 'customers'],
      onProgress: (progress) => {
        console.log(`${progress.currentType}: ${progress.current}/${progress.total} (${progress.percentage}%)`);
      },
      silent: true
    });
    
    console.log('✅ Synchronisation terminée');
    
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    console.error('Stack:', error.stack);
    
    // Afficher plus de détails sur l'erreur
    if (error.inner) {
      console.error('Erreur interne:', error.inner);
    }
  }
  
  // 6. État du cache après sync
  console.log('\n--- 6. ÉTAT DU CACHE APRÈS SYNC ---');
  const countsAfter = {
    orders: await cacheDB.orders.where('siteId').equals(siteId).count(),
    products: await cacheDB.products.where('siteId').equals(siteId).count(),
    customers: await cacheDB.customers.where('siteId').equals(siteId).count(),
    posts: await cacheDB.posts.where('siteId').equals(siteId).count(),
    pages: await cacheDB.pages.where('siteId').equals(siteId).count(),
    users: await cacheDB.users.where('siteId').equals(siteId).count()
  };
  console.table(countsAfter);
  
  // 7. Différences
  console.log('\n--- 7. DIFFÉRENCES ---');
  const diffs = {};
  for (const key in countsBefore) {
    diffs[key] = countsAfter[key] - countsBefore[key];
  }
  console.table(diffs);
  
  // 8. Exemples de données
  console.log('\n--- 8. EXEMPLES DE DONNÉES ---');
  if (countsAfter.orders > 0) {
    const firstOrder = await cacheDB.orders.where('siteId').equals(siteId).first();
    console.log('Premier ordre:', firstOrder);
  }
  if (countsAfter.products > 0) {
    const firstProduct = await cacheDB.products.where('siteId').equals(siteId).first();
    console.log('Premier produit:', firstProduct);
  }
  
  console.log('\n=== FIN DU DIAGNOSTIC ===');
}

// Lancer le diagnostic
diagnosticSync();