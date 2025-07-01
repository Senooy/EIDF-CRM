import axios from 'axios';

async function testServer() {
  console.log('Testing server connection...');
  
  try {
    const response = await axios.get('http://localhost:3001/api/wc/orders?per_page=1');
    console.log('✅ Server is working!');
    console.log('Response status:', response.status);
    console.log('First order:', response.data[0] ? response.data[0].id : 'No orders found');
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running. Please start it with: npm run start:server');
    } else if (error.response) {
      console.error('❌ Server error:', error.response.status, error.response.data);
    } else {
      console.error('❌ Error:', error.message);
    }
  }
}

testServer();