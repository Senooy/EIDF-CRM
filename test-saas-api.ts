import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

// Test token pour le développement
const headers = {
  'Authorization': 'Bearer demo-token'
};

async function testSaaSAPI() {
  console.log('🧪 Testing SaaS API endpoints...\n');

  try {
    // 1. Test getting user organizations
    console.log('1️⃣ Getting user organizations...');
    const orgsResponse = await axios.get(`${API_URL}/my-organizations`, { headers });
    console.log(`✅ Found ${orgsResponse.data.length} organizations`);
    orgsResponse.data.forEach((org: any) => {
      console.log(`   - ${org.name} (${org.role}) - Plan: ${org.subscription.plan}`);
    });

    if (orgsResponse.data.length > 0) {
      const orgId = orgsResponse.data[0].id;
      
      // 2. Test getting organization details
      console.log('\n2️⃣ Getting organization details...');
      const orgDetails = await axios.get(`${API_URL}/organizations/${orgId}`, { headers });
      console.log(`✅ Organization: ${orgDetails.data.name}`);
      console.log(`   Users: ${orgDetails.data.users.length}`);
      console.log(`   Plan: ${orgDetails.data.subscription.plan}`);

      // 3. Test API credentials
      console.log('\n3️⃣ Getting API credentials...');
      const credsResponse = await axios.get(`${API_URL}/credentials`, {
        headers: {
          ...headers,
          'X-Organization-Id': orgId
        }
      });
      console.log(`✅ Found ${credsResponse.data.length} credentials`);
      credsResponse.data.forEach((cred: any) => {
        console.log(`   - ${cred.service}: ${cred.name} (${cred.isActive ? 'Active' : 'Inactive'})`);
      });

      // 4. Test WooCommerce connection
      console.log('\n4️⃣ Testing WooCommerce connection...');
      try {
        const wcTestResponse = await axios.post(`${API_URL}/credentials/test/woocommerce`, {}, {
          headers: {
            ...headers,
            'X-Organization-Id': orgId
          }
        });
        if (wcTestResponse.data.success) {
          console.log(`✅ WooCommerce connected: ${wcTestResponse.data.storeInfo.name}`);
        } else {
          console.log('❌ WooCommerce connection failed');
        }
      } catch (error: any) {
        console.log(`⚠️  WooCommerce not configured: ${error.response?.data?.error || error.message}`);
      }
    }

    console.log('\n✨ All tests completed!');
  } catch (error: any) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testSaaSAPI();