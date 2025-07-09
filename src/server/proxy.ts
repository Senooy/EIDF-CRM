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

    // Forward the request
    const response = await axios({
      method: req.method,
      url: targetUrl,
      headers: {
        ...req.headers,
        host: undefined,
        'content-length': undefined,
      },
      data: req.body,
      params: req.query,
      responseType: 'stream'
    });

    // Forward the response
    res.status(response.status);
    Object.entries(response.headers).forEach(([key, value]) => {
      res.setHeader(key, value as string);
    });
    
    response.data.pipe(res);
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