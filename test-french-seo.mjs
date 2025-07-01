import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/api';

async function testFrenchSEO() {
  console.log('🇫🇷 Test de génération SEO 100% français...\n');
  
  try {
    // Produit test avec nom technique (comme votre exemple)
    const testProduct = {
      id: 630,
      name: "Collier Tube Isolé 630mm - Fixation Sécurisée",
      description: "Collier de fixation pour tube isolé",
      sku: "COL-ISO-630",
      price: "15.99",
      categories: [{ id: 1, name: "Colliers" }]
    };
    
    console.log('📦 Produit test:', testProduct.name);
    console.log('━'.repeat(60));
    
    // Générer le contenu 5 fois pour vérifier la consistance
    for (let i = 1; i <= 5; i++) {
      console.log(`\n🔄 Test ${i}/5:`);
      
      const response = await axios.post(`${SERVER_URL}/ai/generate-product-content`, {
        product: testProduct
      });
      
      const content = response.data;
      
      // Vérifier la présence de mots anglais
      const englishWords = ['shop', 'for', 'buy', 'our', 'category', 'product', 'purchase', 'item'];
      const allText = `${content.seo.metaTitle} ${content.seo.metaDescription} ${content.title} ${content.shortDescription}`.toLowerCase();
      
      const foundEnglish = englishWords.filter(word => allText.includes(word));
      
      console.log('\n📋 RÉSULTATS:');
      console.log('Meta Title:', content.seo.metaTitle);
      console.log('Meta Description:', content.seo.metaDescription);
      
      if (foundEnglish.length > 0) {
        console.log('\n❌ MOTS ANGLAIS DÉTECTÉS:', foundEnglish.join(', '));
      } else {
        console.log('\n✅ AUCUN MOT ANGLAIS - 100% FRANÇAIS');
      }
      
      // Vérifier la présence de mots français clés
      const frenchKeywords = ['découvrez', 'notre', 'qualité', 'livraison', 'garantie', 'commandez', 'profitez'];
      const foundFrench = frenchKeywords.filter(word => allText.includes(word));
      console.log('🇫🇷 Mots français trouvés:', foundFrench.join(', '));
      
      // Analyser la qualité
      console.log('\n📊 ANALYSE:');
      console.log(`- Longueur meta title: ${content.seo.metaTitle.length}/60`);
      console.log(`- Longueur meta description: ${content.seo.metaDescription.length}/160`);
      console.log(`- Nombre de mots-clés: ${content.seo.keywords.length}`);
      console.log(`- Focus keyphrase: "${content.seo.focusKeyphrase}"`);
      
      // Petite pause entre les tests
      if (i < 5) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n\n✅ Test terminé! Vérifiez que tout est en français.');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Assurez-vous que le serveur est lancé: npm start');
    }
  }
}

testFrenchSEO();