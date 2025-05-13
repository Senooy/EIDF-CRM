import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

console.log("PROXY_WOOCOMMERCE_API_URL:", process.env.WOOCOMMERCE_API_URL);
console.log("PROXY_WOOCOMMERCE_CLIENT_KEY:", process.env.WOOCOMMERCE_CLIENT_KEY);
console.log("PROXY_WOOCOMMERCE_SECRET_KEY:", process.env.WOOCOMMERCE_SECRET_KEY);

const WOOCOMMERCE_API_URL = process.env.WOOCOMMERCE_API_URL;
const WOOCOMMERCE_CLIENT_KEY = process.env.WOOCOMMERCE_CLIENT_KEY;
const WOOCOMMERCE_SECRET_KEY = process.env.WOOCOMMERCE_SECRET_KEY;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Ensure required environment variables are set
  if (!WOOCOMMERCE_API_URL || !WOOCOMMERCE_CLIENT_KEY || !WOOCOMMERCE_SECRET_KEY) {
    console.error("WooCommerce API environment variables are not set.");
    return res.status(500).json({ message: 'Internal Server Error: Missing API configuration.' });
  }

  // Extract the path and query parameters from the incoming request
  // req.url will contain something like '/api/orders?per_page=100&page=1'
  // We want to extract '/orders?per_page=100&page=1'
  const targetPath = req.url?.replace(/^\/api/, '') || '';
  const targetUrl = `${WOOCOMMERCE_API_URL}${targetPath}`;

  console.log(`Proxying request: ${req.method} ${targetUrl}`); // Log the target URL

  try {
    const response = await axios({
      method: req.method as 'GET' | 'POST' | 'PUT' | 'DELETE', // Cast method
      url: targetUrl,
      headers: {
        ...req.headers, // Forward original headers (optional, consider security)
        'host': new URL(WOOCOMMERCE_API_URL).host, // Set the correct host header for WC API
        // Remove headers that shouldn't be forwarded
        'connection': undefined, 
        'transfer-encoding': undefined,
      },
      auth: {
        username: WOOCOMMERCE_CLIENT_KEY,
        password: WOOCOMMERCE_SECRET_KEY,
      },
      params: req.method === 'GET' ? req.query : undefined, // Forward query params for GET
      data: req.method !== 'GET' ? req.body : undefined, // Forward body for non-GET
      responseType: 'stream' // Proxy as stream to handle different content types
    });
    
    // Forward the status code from WooCommerce API
    res.status(response.status);

    // Forward headers from WooCommerce API response
    // Be selective about which headers to forward if needed
    Object.keys(response.headers).forEach((key) => {
        // Vercel automatically handles content-encoding, transfer-encoding, connection
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
             const headerValue = response.headers[key];
             if (headerValue !== undefined) {
                res.setHeader(key, headerValue);
             }
        }
    });

    // Pipe the response stream from WooCommerce API back to the client
    response.data.pipe(res);

  } catch (error: unknown) {
    console.error("Error proxying request to WooCommerce:", error);

    if (axios.isAxiosError(error)) {
        if (error.response) {
            // Case: Axios error WITH a response from WooCommerce
            const errorResponse = error.response; // Assign to new variable
            console.error('WooCommerce API Error Status:', errorResponse.status);
            console.error('WooCommerce API Error Data:', errorResponse.data); // Might need stream handling

            // Forward the status code from the WooCommerce error response
            res.status(errorResponse.status);
            
            // Forward headers from the error response
            Object.keys(errorResponse.headers).forEach((key) => {
                if (!['content-encoding', 'transfer-encoding', 'connection'].includes(key.toLowerCase())) {
                    const headerValue = errorResponse.headers[key];
                    if (headerValue !== undefined) {
                        res.setHeader(key, headerValue);
                    }
                }
            });

            // Attempt to pipe or send the error data back
            if (errorResponse.data && typeof errorResponse.data.pipe === 'function') {
                errorResponse.data.pipe(res);
            } else {
                res.send(errorResponse.data);
            }
        } else {
            // Case: Axios error WITHOUT a response (e.g., network error, DNS error)
            console.error("Axios error without response:", error.message, error.code);
            res.status(502).json({ message: 'Bad Gateway: Error connecting to upstream API', error: error.message });
        }
    } else if (error instanceof Error) {
        // Case: Non-Axios JavaScript error
        console.error("Non-Axios error:", error.message);
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } else {
        // Case: Unknown error type
        console.error("Unknown error type:", error);
        res.status(500).json({ message: 'Unknown Internal Server Error' });
    }
  }
}

// module.exports = handler; // Remove CommonJS export 