import axios from 'axios';

const SERVER_URL = 'http://localhost:3001/api';

async function testYoastSEOIntegration() {
  console.log('🧪 Testing Yoast SEO Integration...\n');
  
  try {
    // Test 1: Generate content with SEO metadata
    console.log('1️⃣ Generating content with SEO for a test product...');
    const sampleProduct = {
      id: 39013,
      name: "Produit Test SEO",
      description: "Description basique",
      sku: "TEST-SEO-001",
      price: "29.99",
      categories: [{ id: 1, name: "Test" }]
    };
    
    const contentResponse = await axios.post(`${SERVER_URL}/ai/generate-product-content`, {
      product: sampleProduct
    });
    
    console.log('✅ Generated SEO Content:');
    console.log('- Meta Title:', contentResponse.data.seo.metaTitle);
    console.log('- Meta Description:', contentResponse.data.seo.metaDescription);
    console.log('- Focus Keyphrase:', contentResponse.data.seo.focusKeyphrase);
    console.log('- Keywords:', contentResponse.data.seo.keywords.join(', '));
    
    // Test 2: Update product with SEO metadata
    console.log('\n2️⃣ Updating product with Yoast SEO metadata...');
    const updatePayload = {
      name: contentResponse.data.title,
      description: contentResponse.data.description,
      short_description: contentResponse.data.shortDescription,
      meta_data: [
        {
          key: '_yoast_wpseo_title',
          value: contentResponse.data.seo.metaTitle
        },
        {
          key: '_yoast_wpseo_metadesc',
          value: contentResponse.data.seo.metaDescription
        },
        {
          key: '_yoast_wpseo_focuskw',
          value: contentResponse.data.seo.focusKeyphrase
        },
        {
          key: '_yoast_wpseo_metakeywords',
          value: contentResponse.data.seo.keywords.join(', ')
        }
      ]
    };
    
    console.log('📤 Sending update with meta_data:', JSON.stringify(updatePayload.meta_data, null, 2));
    
    const updateResponse = await axios.put(`${SERVER_URL}/wc/products/${sampleProduct.id}`, updatePayload);
    
    console.log('✅ Product updated successfully!');
    
    // Test 3: Verify SEO metadata was saved
    console.log('\n3️⃣ Fetching product to verify SEO metadata...');
    const verifyResponse = await axios.get(`${SERVER_URL}/wc/products/${sampleProduct.id}`);
    
    const savedMetaData = verifyResponse.data.meta_data || [];
    const yoastData = savedMetaData.filter(meta => meta.key.startsWith('_yoast_wpseo_'));
    
    if (yoastData.length > 0) {
      console.log('✅ Yoast SEO metadata found:');
      yoastData.forEach(meta => {
        console.log(`- ${meta.key}: ${meta.value}`);
      });
    } else {
      console.log('⚠️  No Yoast SEO metadata found in product');
    }
    
    console.log('\n✅ Yoast SEO integration test completed!');
    console.log('\n💡 Note: For Yoast SEO to work properly, ensure that:');
    console.log('   1. Yoast SEO plugin is installed and activated on WordPress');
    console.log('   2. REST API access is enabled for products');
    console.log('   3. The WooCommerce API user has permission to update meta fields');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the server is running: npm start');
    }
  }
}

testYoastSEOIntegration();