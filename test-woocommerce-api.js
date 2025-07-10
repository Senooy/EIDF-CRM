// Test direct de l'API WooCommerce
// À exécuter dans la console du navigateur

async function testWooCommerceAPI() {
  console.log('=== TEST API WOOCOMMERCE ===');
  
  const { wpClientManager } = await import('/src/lib/api/wordpress-client.ts');
  const { getAllOrders, getAllProducts, getAllCustomers } = await import('/src/lib/woocommerce-multi.ts');
  const { configService } = await import('/src/lib/db/config.ts');
  
  // Obtenir le site actif
  const activeSite = await configService.getActiveSite();
  if (!activeSite) {
    console.error('Aucun site actif configuré');
    return;
  }
  
  const siteId = activeSite.id;
  console.log('Site:', activeSite.name, 'ID:', siteId);
  
  // Tester la connexion au client
  console.log('\n--- Test du client WooCommerce ---');
  try {
    const client = await wpClientManager.getClient(siteId);
    console.log('✅ Client WooCommerce obtenu');
    
    // Tester les endpoints
    console.log('\n--- Test des endpoints ---');
    
    // 1. Test Orders
    console.log('\n1. Test récupération des commandes...');
    try {
      const ordersResult = await client.getOrders({ per_page: 5 });
      const orders = Array.isArray(ordersResult) ? ordersResult : ordersResult.data || [];
      console.log(`✅ ${orders.length} commandes récupérées`);
      if (orders.length > 0) {
        console.log('Première commande:', orders[0]);
      }
    } catch (error) {
      console.error('❌ Erreur commandes:', error.message);
    }
    
    // 2. Test Products
    console.log('\n2. Test récupération des produits...');
    try {
      const productsResult = await client.getProducts({ per_page: 5 });
      const products = Array.isArray(productsResult) ? productsResult : productsResult.data || [];
      console.log(`✅ ${products.length} produits récupérés`);
      if (products.length > 0) {
        console.log('Premier produit:', products[0]);
      }
    } catch (error) {
      console.error('❌ Erreur produits:', error.message);
    }
    
    // 3. Test Customers
    console.log('\n3. Test récupération des clients...');
    try {
      const customersResult = await client.getCustomers({ per_page: 5 });
      const customers = Array.isArray(customersResult) ? customersResult : customersResult.data || [];
      console.log(`✅ ${customers.length} clients récupérés`);
      if (customers.length > 0) {
        console.log('Premier client:', customers[0]);
      }
    } catch (error) {
      console.error('❌ Erreur clients:', error.message);
    }
    
    // Test des fonctions getAllXXX
    console.log('\n--- Test des fonctions getAllXXX ---');
    
    console.log('\n4. Test getAllOrders...');
    try {
      console.log('Récupération de toutes les commandes (peut prendre du temps)...');
      const allOrders = await getAllOrders(undefined, siteId);
      console.log(`✅ Total des commandes: ${allOrders.length}`);
    } catch (error) {
      console.error('❌ Erreur getAllOrders:', error);
    }
    
  } catch (error) {
    console.error('❌ Erreur générale:', error);
    console.error('Stack:', error.stack);
  }
}

// Lancer le test
testWooCommerceAPI();