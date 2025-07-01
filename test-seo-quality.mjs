import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/api';

async function testSEOQuality() {
  console.log('🔍 Test de la qualité SEO optimisée en français...\n');
  
  try {
    // Produits de test variés
    const testProducts = [
      {
        id: 1,
        name: "T-shirt basique",
        description: "Un simple t-shirt",
        sku: "TSH-001",
        price: "19.99",
        categories: [{ id: 1, name: "Vêtements" }]
      },
      {
        id: 2,
        name: "Chaussures de sport",
        description: "Chaussures pour le sport",
        sku: "SHOE-002",
        price: "89.99",
        categories: [{ id: 2, name: "Chaussures" }]
      },
      {
        id: 3,
        name: "Sac à dos",
        description: "Sac pour transporter des affaires",
        sku: "BAG-003",
        price: "49.99",
        categories: [{ id: 3, name: "Accessoires" }]
      }
    ];

    for (const product of testProducts) {
      console.log(`\n📦 Test pour: ${product.name}`);
      console.log('━'.repeat(50));
      
      const response = await axios.post(`${SERVER_URL}/ai/generate-product-content`, {
        product: product
      });
      
      const content = response.data;
      
      // Vérification du titre
      console.log('\n📌 TITRE OPTIMISÉ:');
      console.log(`   "${content.title}"`);
      console.log(`   ✓ Longueur: ${content.title.length} caractères (max 60)`);
      console.log(`   ✓ Commence par mot-clé: ${content.title.split(' ')[0]}`);
      
      // Vérification description courte
      console.log('\n📝 DESCRIPTION COURTE:');
      console.log(`   "${content.shortDescription}"`);
      console.log(`   ✓ Longueur: ${content.shortDescription.length} caractères (max 160)`);
      
      // Vérification SEO
      console.log('\n🎯 MÉTADONNÉES SEO:');
      console.log(`   Meta Title: "${content.seo.metaTitle}"`);
      console.log(`   - Longueur: ${content.seo.metaTitle.length} caractères`);
      
      console.log(`\n   Meta Description: "${content.seo.metaDescription}"`);
      console.log(`   - Longueur: ${content.seo.metaDescription.length} caractères`);
      
      console.log(`\n   Focus Keyphrase: "${content.seo.focusKeyphrase}"`);
      console.log(`   Keywords: ${content.seo.keywords.join(', ')}`);
      console.log(`   - Nombre de mots-clés: ${content.seo.keywords.length}`);
      
      // Analyse de la qualité
      console.log('\n✅ ANALYSE QUALITÉ:');
      
      // Vérifier la présence de mots d'action
      const actionWords = ['découvrez', 'profitez', 'achetez', 'commandez', 'essayez', 'obtenez'];
      const hasActionWords = actionWords.some(word => 
        content.seo.metaDescription.toLowerCase().includes(word) ||
        content.shortDescription.toLowerCase().includes(word)
      );
      console.log(`   - Mots d'action: ${hasActionWords ? '✓ OUI' : '✗ NON'}`);
      
      // Vérifier les caractères spéciaux
      const hasSpecialChars = /[✓•|]/.test(content.seo.metaTitle) || /[✓•|]/.test(content.seo.metaDescription);
      console.log(`   - Caractères spéciaux: ${hasSpecialChars ? '✓ OUI' : '✗ NON'}`);
      
      // Vérifier la langue française
      const frenchWords = ['pour', 'avec', 'notre', 'votre', 'qualité', 'livraison'];
      const isFrench = frenchWords.some(word => 
        content.seo.metaDescription.toLowerCase().includes(word) ||
        content.title.toLowerCase().includes(word)
      );
      console.log(`   - Langue française: ${isFrench ? '✓ OUI' : '✗ NON'}`);
      
      // Score global
      let score = 0;
      if (content.title.length <= 60) score += 25;
      if (content.seo.metaDescription.length >= 150 && content.seo.metaDescription.length <= 160) score += 25;
      if (hasActionWords) score += 25;
      if (isFrench) score += 25;
      
      console.log(`\n   🏆 SCORE QUALITÉ SEO: ${score}/100`);
    }
    
    console.log('\n\n✅ Test de qualité SEO terminé!');
    
  } catch (error) {
    console.error('\n❌ Erreur:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Assurez-vous que le serveur est lancé: npm start');
    }
  }
}

testSEOQuality();