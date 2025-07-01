#!/usr/bin/env node

/**
 * Test du flux du style SEO
 * Ce script simule l'envoi d'une requête de génération SEO avec un style spécifique
 */

import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Charger les variables d'environnement
dotenv.config({ path: join(__dirname, '.env.server') });

const SERVER_URL = 'http://localhost:3001/api';

// Produit de test
const testProduct = {
  id: 1,
  name: "Table Basse Design",
  sku: "TB-001",
  price: "299.99",
  categories: [{ name: "Mobilier" }],
  description: "Une table basse moderne pour votre salon"
};

// Style de test
const testStyle = {
  name: "ecological",
  description: "Écologique et durable",
  guidelines: "Mettre en avant l'aspect écologique, durable et responsable du produit.",
  tone: "Engagé et responsable, sensibilisation environnementale",
  focusPoints: ["durabilité", "impact environnemental", "matériaux écologiques", "commerce équitable"]
};

async function testStyleFlow() {
  console.log('🧪 Test du flux du style SEO\n');
  
  try {
    console.log('📤 Envoi de la requête avec le style:', testStyle);
    console.log('\n📦 Produit:', testProduct.name);
    console.log('🎨 Style sélectionné:', testStyle.name, '-', testStyle.description);
    console.log('\n');

    const response = await axios.post(`${SERVER_URL}/ai/generate-single-call`, {
      product: testProduct,
      style: testStyle
    });

    console.log('✅ Réponse reçue!\n');
    console.log('📝 Contenu généré:');
    console.log('  - Titre:', response.data.title);
    console.log('  - Description courte:', response.data.shortDescription);
    console.log('  - Meta titre:', response.data.seo.metaTitle);
    console.log('  - Meta description:', response.data.seo.metaDescription);
    console.log('  - Mots-clés:', response.data.seo.keywords.join(', '));
    
    // Vérifier si le contenu reflète le style écologique
    const allContent = `${response.data.title} ${response.data.description} ${response.data.shortDescription}`;
    const ecoKeywords = ['durable', 'écologique', 'responsable', 'environnement', 'naturel', 'recyclable'];
    
    const foundEcoTerms = ecoKeywords.filter(keyword => 
      allContent.toLowerCase().includes(keyword)
    );
    
    console.log('\n🔍 Analyse du contenu:');
    console.log(`  - Termes écologiques trouvés: ${foundEcoTerms.length > 0 ? foundEcoTerms.join(', ') : 'AUCUN ⚠️'}`);
    
    if (foundEcoTerms.length > 0) {
      console.log('\n✅ Le style écologique semble avoir été appliqué correctement!');
    } else {
      console.log('\n⚠️  Attention: Le style écologique ne semble pas avoir été appliqué.');
      console.log('    Vérifiez les logs du serveur et de la fonction generateAllContentSingleCall.');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.response?.data || error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Le serveur n\'est pas démarré. Lancez d\'abord: npm run server');
    }
  }
}

// Lancer le test
testStyleFlow();