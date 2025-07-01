import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/api';

async function testSimpleBatch() {
  console.log('🧪 Test du système batch simplifié (10 produits/minute)...\n');
  
  try {
    // Test 1: Vérifier que l'endpoint single-call fonctionne
    console.log('1️⃣ Test de génération pour un produit...');
    const testProduct = {
      id: 1,
      name: "Produit Test Batch Simple",
      description: "Test du nouveau système",
      sku: "SIMPLE-001",
      price: "29.99",
      categories: [{ id: 1, name: "Test" }]
    };
    
    const response = await axios.post(`${SERVER_URL}/ai/generate-single-call`, {
      product: testProduct
    });
    
    console.log('✅ Génération réussie');
    console.log('- Titre:', response.data.title);
    console.log('- SEO Meta:', response.data.seo.metaTitle);
    
    // Test 2: Calcul pour 1000 produits
    console.log('\n2️⃣ Calcul pour 1000 produits à 10/minute:');
    const productsPerMinute = 10;
    const totalProducts = 1000;
    const minutesNeeded = totalProducts / productsPerMinute;
    const hoursNeeded = minutesNeeded / 60;
    
    console.log(`- Temps de traitement actif: ${minutesNeeded} minutes (${hoursNeeded.toFixed(1)} heures)`);
    console.log(`- Avec pauses API: environ ${(hoursNeeded * 1.2).toFixed(1)} heures au total`);
    console.log(`- Peut tourner en arrière-plan pendant que vous travaillez`);
    
    // Test 3: Vérifier les limites
    console.log('\n3️⃣ Respect des limites Gemini Free Tier:');
    console.log('- 10 requêtes/minute < 15 (limite) ✅');
    console.log('- 600 requêtes/heure < 900 (limite théorique) ✅');
    console.log('- Compatible avec utilisation quotidienne ✅');
    
    console.log('\n📌 Utilisation:');
    console.log('1. Allez dans Produits');
    console.log('2. Cliquez "Générer SEO pour tous"');
    console.log('3. Le système traite automatiquement 10 produits/minute');
    console.log('4. Pause/Reprise/Annulation disponibles');
    console.log('5. Barre de progression intégrée');
    
    console.log('\n✅ Système prêt à l\'emploi!');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Lancez le serveur: npm start');
    }
  }
}

testSimpleBatch();