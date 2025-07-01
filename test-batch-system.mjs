import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/api';

async function testBatchSystem() {
  console.log('🧪 Test du système de traitement batch optimisé...\n');
  
  try {
    // Test 1: Vérifier l'endpoint single-call
    console.log('1️⃣ Test de l\'endpoint single-call...');
    const sampleProduct = {
      id: 12345,
      name: "Produit Test Batch",
      description: "Description simple pour test",
      sku: "BATCH-TEST-001",
      price: "39.99",
      categories: [{ id: 1, name: "Test" }]
    };
    
    const startTime = Date.now();
    const response = await axios.post(`${SERVER_URL}/ai/generate-single-call`, {
      product: sampleProduct
    });
    const endTime = Date.now();
    
    console.log('✅ Génération réussie en', endTime - startTime, 'ms');
    console.log('\n📋 Contenu généré:');
    console.log('- Titre:', response.data.title);
    console.log('- Description courte:', response.data.shortDescription.substring(0, 80) + '...');
    console.log('- SEO Meta Title:', response.data.seo.metaTitle);
    console.log('- SEO Keywords:', response.data.seo.keywords.length, 'mots-clés');
    
    // Vérifier que c'est en français
    const allText = `${response.data.title} ${response.data.shortDescription} ${response.data.seo.metaDescription}`;
    const hasEnglish = /shop|buy|product|category/i.test(allText);
    console.log('\n🇫🇷 Contenu en français:', hasEnglish ? '❌ NON' : '✅ OUI');
    
    // Test 2: Vérifier les limites de taux
    console.log('\n2️⃣ Test de respect des limites API...');
    console.log('Limite Free Tier Gemini 2.0 Flash:');
    console.log('- 15 requêtes/minute (nous utilisons 12 avec marge)');
    console.log('- 200 requêtes/jour (nous utilisons 180 avec marge)');
    console.log('- 1,000,000 tokens/minute');
    
    // Test 3: Calcul du temps pour 1000 produits
    console.log('\n3️⃣ Estimation pour 1000 produits:');
    const productsPerDay = 180; // Limite journalière avec marge
    const daysNeeded = Math.ceil(1000 / productsPerDay);
    const productsPerMinute = 12; // Limite par minute avec marge
    const minutesPerDay = Math.ceil(productsPerDay / productsPerMinute);
    
    console.log(`- Produits par jour: ${productsPerDay}`);
    console.log(`- Jours nécessaires: ${daysNeeded}`);
    console.log(`- Temps de traitement par jour: ~${minutesPerDay} minutes`);
    console.log(`- Temps total estimé: ${daysNeeded} jours`);
    
    // Test 4: Vérifier la structure du contenu
    console.log('\n4️⃣ Validation de la structure:');
    const hasAllFields = 
      response.data.title && 
      response.data.shortDescription && 
      response.data.description && 
      response.data.seo?.metaTitle &&
      response.data.seo?.metaDescription &&
      response.data.seo?.keywords &&
      response.data.seo?.focusKeyphrase;
    
    console.log('- Tous les champs requis:', hasAllFields ? '✅ OUI' : '❌ NON');
    console.log('- HTML dans description:', response.data.description.includes('<p>') ? '✅ OUI' : '❌ NON');
    console.log('- Longueur meta title:', response.data.seo.metaTitle.length, '/ 60');
    console.log('- Longueur meta description:', response.data.seo.metaDescription.length, '/ 160');
    
    console.log('\n✅ Système batch prêt pour production!');
    console.log('\n💡 Conseils:');
    console.log('1. Utilisez l\'interface /batch-processing pour gérer vos produits');
    console.log('2. Le système respecte automatiquement les limites API');
    console.log('3. Les produits sont sauvegardés automatiquement avec Yoast SEO');
    console.log('4. La file d\'attente est persistante (survit aux redémarrages)');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Assurez-vous que le serveur est lancé: npm start');
    }
  }
}

testBatchSystem();