// Script de test pour vérifier que la synchronisation fonctionne
// À exécuter dans la console du navigateur

async function testSync() {
  const { cacheDB } = await import('/src/lib/db/cache-db.ts');
  const { syncService } = await import('/src/lib/services/sync-service.ts');
  const { configService } = await import('/src/lib/db/config.ts');
  
  console.log('=== Test de synchronisation WooCommerce ===');
  
  // Obtenir le site actif depuis la base de données
  const activeSite = await configService.getActiveSite();
  if (!activeSite) {
    console.error('Aucun site actif configuré');
    console.log('Sites disponibles:');
    const allSites = await configService.getAllSites();
    console.table(allSites);
    return;
  }
  
  const siteId = activeSite.id;
  console.log('Site actif:', activeSite.name, 'ID:', siteId);
  
  // Vérifier la version de la base de données
  console.log('\n--- Version de la base de données ---');
  console.log('Version actuelle:', cacheDB.verno);
  
  // Vérifier l'état avant sync
  console.log('\n--- État avant synchronisation ---');
  const ordersBefore = await cacheDB.orders.where('siteId').equals(siteId).count();
  const productsBefore = await cacheDB.products.where('siteId').equals(siteId).count();
  const customersBefore = await cacheDB.customers.where('siteId').equals(siteId).count();
  
  console.log('Commandes:', ordersBefore);
  console.log('Produits:', productsBefore);
  console.log('Clients:', customersBefore);
  
  // Lancer la synchronisation uniquement pour WooCommerce
  console.log('\n--- Lancement de la synchronisation ---');
  try {
    await syncService.syncAll(siteId, {
      dataTypes: ['orders', 'products', 'customers'],
      forceFullSync: true, // Forcer la synchronisation même si le cache est récent
      onProgress: (progress) => {
        console.log(`${progress.currentType}: ${progress.current}/${progress.total} (${progress.percentage}%)`);
      }
    });
    
    console.log('\n--- État après synchronisation ---');
    const ordersAfter = await cacheDB.orders.where('siteId').equals(siteId).count();
    const productsAfter = await cacheDB.products.where('siteId').equals(siteId).count();
    const customersAfter = await cacheDB.customers.where('siteId').equals(siteId).count();
    
    console.log('Commandes:', ordersAfter, `(+${ordersAfter - ordersBefore})`);
    console.log('Produits:', productsAfter, `(+${productsAfter - productsBefore})`);
    console.log('Clients:', customersAfter, `(+${customersAfter - customersBefore})`);
    
    // Vérifier quelques données
    if (ordersAfter > 0) {
      const firstOrder = await cacheDB.orders.where('siteId').equals(siteId).first();
      console.log('\nPremière commande:', firstOrder);
      
      // Vérifier si on peut retrouver par clé composite
      const testLookup = await cacheDB.orders
        .where('[siteId+orderId]')
        .equals([siteId, firstOrder.orderId])
        .first();
      console.log('Test recherche par clé composite:', testLookup ? 'OK' : 'ECHEC');
    }
    
    console.log('\n✅ Test terminé avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    console.error('Stack trace:', error.stack);
  }
}

// Fonction pour vider le cache WooCommerce uniquement
async function clearWooCommerceCache() {
  const { cacheDB } = await import('/src/lib/db/cache-db.ts');
  const { configService } = await import('/src/lib/db/config.ts');
  
  const activeSite = await configService.getActiveSite();
  if (!activeSite) {
    console.error('Aucun site actif configuré');
    return;
  }
  
  const siteId = activeSite.id;
  
  console.log('Suppression du cache WooCommerce pour le site', siteId);
  await cacheDB.orders.where('siteId').equals(siteId).delete();
  await cacheDB.products.where('siteId').equals(siteId).delete();
  await cacheDB.customers.where('siteId').equals(siteId).delete();
  console.log('Cache WooCommerce vidé');
}

// Lancer le test
testSync();

// Pour vider le cache: clearWooCommerceCache()