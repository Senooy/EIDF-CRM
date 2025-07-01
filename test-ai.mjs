import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/api';

async function testAIService() {
  console.log('🧪 Testing AI Service...\n');
  
  try {
    // Test 1: Check if AI service is configured
    console.log('1️⃣ Checking AI service status...');
    const statusResponse = await axios.get(`${SERVER_URL}/ai/test`);
    console.log('✅ AI Service Status:', statusResponse.data);
    
    if (!statusResponse.data.configured) {
      console.error('❌ AI service is not configured. Please check your GEMINI_API_KEY in .env.server');
      return;
    }
    
    // Test 2: Generate content for a sample product
    console.log('\n2️⃣ Testing single product content generation...');
    const sampleProduct = {
      id: 1,
      name: "T-shirt Eco-Friendly",
      description: "Un t-shirt basique en coton",
      sku: "TSH-001",
      price: "19.99",
      categories: [{ id: 1, name: "Vêtements" }]
    };
    
    const contentResponse = await axios.post(`${SERVER_URL}/ai/generate-product-content`, {
      product: sampleProduct
    });
    
    console.log('✅ Generated Content:');
    console.log('- Title:', contentResponse.data.title);
    console.log('- Short Description:', contentResponse.data.shortDescription);
    console.log('- Description Preview:', contentResponse.data.description.substring(0, 100) + '...');
    console.log('- SEO Meta Title:', contentResponse.data.seo.metaTitle);
    console.log('- SEO Keywords:', contentResponse.data.seo.keywords.join(', '));
    
    // Test 3: Test batch generation
    console.log('\n3️⃣ Testing batch generation...');
    const batchProducts = [
      { id: 1, name: "Produit 1", category: "Test" },
      { id: 2, name: "Produit 2", category: "Test" }
    ];
    
    const batchResponse = await axios.post(`${SERVER_URL}/ai/batch-generate`, {
      products: batchProducts
    });
    
    console.log('✅ Batch Generation Started:', batchResponse.data);
    
    console.log('\n✅ All tests passed! AI service is working correctly.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the server is running: npm run start:server');
    }
  }
}

testAIService();