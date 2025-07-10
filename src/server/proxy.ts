import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PROXY_PORT || 3002;

// Enable CORS
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WordPress proxy is running' });
});

// Proxy endpoint
app.all('/proxy/*', async (req, res) => {
  try {
    const targetUrl = req.params[0];
    
    if (!targetUrl) {
      return res.status(400).json({ error: 'Target URL is required' });
    }

    console.log(`Proxying request to: ${targetUrl}`);

    // Forward the request
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: undefined,
        'content-length': undefined,
        'accept-encoding': 'gzip, deflate', // Ensure we can handle compressed responses
      },
      data: req.body,
      params: req.query,
      responseType: 'arraybuffer', // Get raw data to handle encoding properly
      validateStatus: () => true, // Don't throw on non-2xx status
    });

    // Forward the response status
    res.status(response.status);
    
    // Forward response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key.toLowerCase() !== 'content-encoding') { // Don't forward encoding header
        res.setHeader(key, value as string);
      }
    });

    // Convert arraybuffer to string and check content type
    const contentType = response.headers['content-type'] || '';
    let responseData: any;
    
    try {
      responseData = Buffer.from(response.data).toString('utf-8');
      
      // If it's supposed to be JSON but isn't, try to extract error message
      if (contentType.includes('application/json') || targetUrl.includes('wp-json')) {
        try {
          // Try to parse as JSON
          const jsonData = JSON.parse(responseData);
          res.json(jsonData);
        } catch (jsonError) {
          // If JSON parsing fails, check if it's HTML error page
          if (responseData.includes('<!DOCTYPE') || responseData.includes('<html')) {
            console.error('Received HTML instead of JSON:', responseData.substring(0, 500));
            res.status(502).json({
              error: 'Invalid response from WordPress',
              message: 'Expected JSON but received HTML. This might be due to a plugin conflict or server error.',
              details: responseData.substring(0, 200)
            });
          } else {
            // Try to clean up the JSON
            console.error('Invalid JSON received:', responseData.substring(0, 500));
            res.status(502).json({
              error: 'Invalid JSON response',
              message: 'The server returned malformed JSON data',
              rawData: responseData.substring(0, 500)
            });
          }
        }
      } else {
        // For non-JSON responses, send as-is
        res.send(responseData);
      }
    } catch (decodeError) {
      console.error('Error decoding response:', decodeError);
      res.status(502).json({
        error: 'Response decoding error',
        message: 'Failed to decode the server response'
      });
    }
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json({
        error: 'Proxy request failed',
        status: error.response.status,
        message: error.response.statusText
      });
    } else {
      res.status(500).json({
        error: 'Proxy request failed',
        message: error.message
      });
    }
  }
});

app.listen(PORT, () => {
  console.log(`WordPress proxy server running on port ${PORT}`);
  console.log(`Use http://localhost:${PORT}/proxy/YOUR_WORDPRESS_URL for CORS-free access`);
});