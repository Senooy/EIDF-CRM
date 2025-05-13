import axios from 'axios';
import { QueryFunctionContext } from "@tanstack/react-query";

// WARNING: Hardcoding keys is insecure. Use environment variables in production.
// const WOOCOMMERCE_CLIENT_KEY = "ck_79c0b154b61a8259c1390deb3c2eebe22b013589"; // REMOVE
// const WOOCOMMERCE_SECRET_KEY = "cs_7f589b934aa97db46be3b9a5736651095ca10550"; // REMOVE

// const API_URL = 'https://eco-industrie-france.com/wp-json/wc/v3'; // Original URL
const API_URL = '/api'; // Use the proxied path

const woocommerceApi = axios.create({
  baseURL: API_URL,
  // auth: {  // REMOVE - Auth handled by the Vercel function
  //   username: WOOCOMMERCE_CLIENT_KEY,
  //   password: WOOCOMMERCE_SECRET_KEY,
  // },     // REMOVE
});

// Define interfaces for nested objects
interface BillingAddress {
  first_name: string;
  last_name: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  email: string;
  phone: string;
}

interface ShippingAddress extends Omit<BillingAddress, 'email' | 'phone'> { }

interface LineItem {
  id: number;
  name: string;
  quantity: number;
  total: string;
  // Add other line item properties if needed
}

interface ShippingLine {
  id: number;
  method_title: string;
  total: string;
  // Add other shipping line properties if needed
}

// Update the main Order interface
export interface Order {
  id: number;
  total: string;
  date_created: string;
  status: string;
  payment_method_title: string; // Added
  billing: BillingAddress; // Use detailed interface
  shipping: ShippingAddress; // Added
  line_items: LineItem[]; // Added
  shipping_lines: ShippingLine[]; // Added
  // Add other relevant order properties here
}

export const getOrders = async (): Promise<Order[]> => {
  try {
    const response = await woocommerceApi.get('/orders');
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce orders:', error);
    // Consider more robust error handling
    throw error;
  }
};

// Fetch a single order by its ID
export const getOrderById = async (orderId: number): Promise<Order> => {
  try {
    const response = await woocommerceApi.get(`/orders/${orderId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

// Fetch the most recent orders
export const getRecentOrders = async (count: number = 10): Promise<Order[]> => {
  try {
    const response = await woocommerceApi.get<Order[]>('/orders', {
      params: {
        per_page: count,
        page: 1,
        orderby: 'date',
        order: 'desc'
      }
    });
    return response.data;
  } catch (error) {
    console.error(`Error fetching ${count} recent WooCommerce orders:`, error);
    throw error;
  }
};

// Fetch all orders, optionally filtering by customer ID.
// Handles being called directly or via react-query's queryFn.
export const getAllOrders = async (
  // Accept either a customer ID number or the react-query context object
  contextOrCustomerId?: number | QueryFunctionContext<[string, number?]>
): Promise<Order[]> => {
  let customerId: number | undefined = undefined;

  // Check if the argument is the react-query context object
  if (typeof contextOrCustomerId === 'object' && contextOrCustomerId !== null && 'queryKey' in contextOrCustomerId) {
    // Extract customerId from the queryKey if it exists (it's the second element)
    customerId = contextOrCustomerId.queryKey[1]; 
  } else if (typeof contextOrCustomerId === 'number') {
    // Argument is directly the customerId
    customerId = contextOrCustomerId;
  }
  // If contextOrCustomerId is undefined or null, customerId remains undefined

  let allOrders: Order[] = [];
  let page = 1;
  const perPage = 100; // Max items per page for WooCommerce API
  let morePages = true;

  console.log(`Starting to fetch all orders${customerId !== undefined ? ' for customer ' + customerId : ''}...`);

  while (morePages) {
    try {
      console.log(`Fetching orders page ${page}${customerId !== undefined ? ' for customer ' + customerId : ''}...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        per_page: perPage,
        page: page,
        orderby: 'date', // Order by date to process chronologically if needed
        order: 'asc'
      };

      // Only add the customer parameter if a valid customerId was extracted
      if (customerId !== undefined) {
        params.customer = customerId;
      }

      const response = await woocommerceApi.get<Order[]>('/orders', { params });

      const orders = response.data;
      if (orders.length > 0) {
        allOrders = allOrders.concat(orders);
        page++;
        // Optional: Add a small delay to avoid hitting rate limits if necessary
        // await new Promise(resolve => setTimeout(resolve, 200)); 
      } else {
        morePages = false; // No more orders found
      }

      // Safety break if something goes wrong (e.g., infinite loop risk)
      if (page > 500) { // Adjust limit as needed based on expected order volume
         console.warn("Stopped fetching orders after 500 pages to prevent potential infinite loop.");
         morePages = false;
      }

    } catch (error) {
      console.error(`Error fetching WooCommerce orders page ${page}:`, error);
      // Stop fetching if one page fails
      morePages = false;
      // Optionally re-throw the error or return partial data
      throw error;
    }
  }

  console.log(`Finished fetching orders${customerId !== undefined ? ' for customer ' + customerId : ''}. Total found: ${allOrders.length}`);
  return allOrders;
};

// Function to update an order's status
export const updateOrderStatus = async (orderId: number, status: string): Promise<Order> => {
  try {
    const response = await woocommerceApi.put(`/orders/${orderId}`, { status });
    return response.data;
  } catch (error) {
    console.error(`Error updating status for WooCommerce order ${orderId}:`, error);
    // Consider more robust error handling, perhaps returning the error or a specific type
    throw error;
  }
};

// Interface for Order Note
export interface OrderNote {
  id: number;
  author: string;
  date_created: string;
  note: string;
  customer_note: boolean;
}

// Fetch notes for a specific order
export const getOrderNotes = async (orderId: number): Promise<OrderNote[]> => {
  try {
    const response = await woocommerceApi.get(`/orders/${orderId}/notes`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching notes for WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

// Create a note for a specific order
export const createOrderNote = async (orderId: number, noteData: { note: string; customer_note?: boolean }): Promise<OrderNote> => {
  try {
    const response = await woocommerceApi.post(`/orders/${orderId}/notes`, noteData);
    return response.data;
  } catch (error) {
    console.error(`Error creating note for WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

// Interface for Refund Line Item (optional, if you need item-level refunds)
interface RefundLineItem {
  id: number;       // The line_item ID being refunded
  quantity: number; // Quantity of this item being refunded
  total: string;    // Refund amount for this line item (negative value)
}

// Interface for the data needed to create a refund
export interface RefundPayload {
  amount: string;         // Total refund amount
  reason?: string;        // Reason for the refund
  api_refund?: boolean;   // Whether to process the refund via the payment gateway (if possible)
  api_restock?: boolean;  // Whether to restock refunded items
  line_items?: RefundLineItem[]; // Optional: for item-level refunds
}

// Interface for the refund object returned by the API
export interface Refund {
  id: number;
  reason: string;
  date_created: string;
  amount: string;
  refunded_by: number; // User ID
  // ... other potential refund properties
}

// Create a refund for a specific order
export const createRefund = async (orderId: number, refundData: RefundPayload): Promise<Refund> => {
  try {
    const response = await woocommerceApi.post(`/orders/${orderId}/refunds`, refundData);
    return response.data;
  } catch (error) {
    console.error(`Error creating refund for WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

// --- Reports API Functions ---

// Interface for Order Totals Report (adjust based on actual API response)
export interface OrderTotalsReport {
  slug: string; // e.g., 'pending', 'processing', 'completed'
  name: string;
  total: number;
}

// Fetch Order Totals Report
export const getOrderTotalsReport = async (): Promise<OrderTotalsReport[]> => {
  try {
    // This endpoint might vary depending on WooCommerce version/plugins
    // Check WooCommerce REST API documentation for /reports/orders/totals
    const response = await woocommerceApi.get('/reports/orders/totals');
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce order totals report:', error);
    throw error;
  }
};

// Interface for Sales Report totals (adjust based on actual API response)
export interface SalesReportTotal {
  sales: string; // Total sales amount as string
  orders: number; // Total number of orders
  items: number; // Total number of items sold
  // ... other properties like tax, shipping etc.
}

// Interface for Sales Report interval data (adjust based on actual API response)
export interface SalesReportInterval {
  interval: string; // e.g., date like "2024-05-13"
  date_start: string;
  date_end: string;
  subtotals: {
    sales: string;
    orders: number;
    items: number;
    // ... other properties
  };
}

// Interface for the full Sales Report (adjust based on actual API response)
export interface SalesReport {
  totals: { [date: string]: SalesReportTotal }; // Totals per interval
  intervals: SalesReportInterval[];
}

// Fetch Sales Report (e.g., daily for the last 30 days)
export const getSalesReport = async (period: string = 'month', interval: string = 'day'): Promise<SalesReport> => {
  try {
    const params: { period?: string; interval?: string; date_min?: string; date_max?: string } = {
      interval: interval,
    };

    if (period === 'quarter') {
      const today = new Date();
      const currentMonth = today.getMonth(); // 0-11
      const currentYear = today.getFullYear();
      
      // Determine the start month of the quarter (0, 3, 6, 9)
      const startMonth = Math.floor(currentMonth / 3) * 3;
      
      const firstDayOfQuarter = new Date(currentYear, startMonth, 1);
      // Get the last day of the quarter by going to the next quarter's start and subtracting one day
      const firstDayOfNextQuarter = new Date(currentYear, startMonth + 3, 1);
      const lastDayOfQuarter = new Date(firstDayOfNextQuarter.getTime() - 86400000); // Subtract 1 day in milliseconds

      params.date_min = firstDayOfQuarter.toISOString().split('T')[0];
      params.date_max = lastDayOfQuarter.toISOString().split('T')[0];
      // Do not pass 'period=quarter' when using date_min/date_max for quarters
    } else {
      // Use the period parameter for other standard periods
      params.period = period;
    }

    const response = await woocommerceApi.get('/reports/sales', { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching WooCommerce sales report:', error);
    throw error;
  }
};

// --- Customers API Functions ---

// Interface for Customer Billing/Shipping Address (similar to Order's)
// We can reuse BillingAddress, but let's redefine for clarity if needed, or reuse if identical
// Assuming BillingAddress from Order is suitable

// Interface for a WooCommerce Customer
export interface Customer {
  id: number;
  date_created: string;
  date_modified: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: BillingAddress; // Reuse from Order interface
  shipping: ShippingAddress; // Reuse from Order interface
  is_paying_customer: boolean;
  orders_count: number;
  total_spent: string;
  avatar_url: string;
  // Add other relevant customer properties if needed
}

// Fetch ALL customers by handling pagination
export const getAllCustomers = async (filters: { search?: string; role?: string } = {}): Promise<Customer[]> => {
  let allCustomers: Customer[] = [];
  let page = 1;
  const perPage = 100; // Max items per page
  let morePages = true;

  console.log("Starting to fetch all customers...", filters);

  while (morePages) {
    try {
      console.log(`Fetching customers page ${page}...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        per_page: perPage,
        page: page,
        orderby: 'registered_date', // Default sort: newest first
        order: 'desc',
        // Only add filters if they are provided and not empty
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
      };

      // If no role filter is provided, default to 'customer' to avoid non-customer roles?
      // Or maybe default to 'all' as it was before? Let's keep 'all' unless specified.
      // The code above correctly handles adding the role only if filters.role is truthy.
      // If filters.role is not provided, the API default will likely be used (often 'customer').
      // Let's explicitly default to 'customer' if no role is passed, assuming that's the desired behavior.
      if (!params.role) {
        params.role = 'customer';
      }

      const response = await woocommerceApi.get<Customer[]>('/customers', { params });

      const customers = response.data;
      if (customers.length > 0) {
        allCustomers = allCustomers.concat(customers);
        page++;
        // Optional delay
        // await new Promise(resolve => setTimeout(resolve, 200)); 
      } else {
        morePages = false;
      }

      // Safety break
      if (page > 500) { 
         console.warn("Stopped fetching customers after 500 pages.");
         morePages = false;
      }

    } catch (error) {
      console.error(`Error fetching WooCommerce customers page ${page}:`, error);
      morePages = false;
      throw error;
    }
  }

  console.log(`Finished fetching customers. Total found: ${allCustomers.length}`);
  return allCustomers;
};

// Fetch a single customer by their ID
export const getCustomerById = async (customerId: number): Promise<Customer> => {
  try {
    const response = await woocommerceApi.get(`/customers/${customerId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching WooCommerce customer ${customerId}:`, error);
    throw error;
  }
};

// Add more functions here for other endpoints (products, customers, etc.)

// --- Products API Functions ---

// Interface for Product Image
export interface ProductImage {
  id: number;
  date_created: string;
  date_modified: string;
  src: string;
  name: string;
  alt: string;
}

// Interface for Product Category
export interface ProductCategory {
  id: number;
  name: string;
  slug: string;
}

// Interface for a WooCommerce Product
export interface Product {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_modified: string;
  type: 'simple' | 'variable' | 'grouped' | 'external'; // Common types
  status: 'draft' | 'pending' | 'private' | 'publish';
  featured: boolean;
  description: string;
  short_description: string;
  sku: string; // Stock Keeping Unit
  price: string;
  regular_price: string;
  sale_price: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  stock_quantity: number | null; // Can be null if stock management is disabled
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  average_rating: string;
  rating_count: number;
  categories: ProductCategory[];
  images: ProductImage[];
  // Add other relevant product properties if needed
}

// Fetch ALL products by handling pagination
export const getAllProducts = async (filters: { search?: string; status?: string; category?: string; tag?: string; sku?: string; stock_status?: string } = {}): Promise<Product[]> => {
  let allProducts: Product[] = [];
  let page = 1;
  const perPage = 100; // Max items per page
  let morePages = true;

  console.log("Starting to fetch all products...", filters);

  while (morePages) {
    try {
      console.log(`Fetching products page ${page}...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const params: any = {
        per_page: perPage,
        page: page,
        orderby: 'date', // Default sort: newest first
        order: 'desc',
        // Add filters if provided
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }), // Category ID or slug
        ...(filters.tag && { tag: filters.tag }),         // Tag ID
        ...(filters.sku && { sku: filters.sku }),
        ...(filters.stock_status && { stock_status: filters.stock_status }),
      };

      const response = await woocommerceApi.get<Product[]>('/products', { params });

      const products = response.data;
      if (products.length > 0) {
        allProducts = allProducts.concat(products);
        page++;
        // Optional delay
        // await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        morePages = false;
      }

      // Safety break
      if (page > 500) {
         console.warn("Stopped fetching products after 500 pages.");
         morePages = false;
      }

    } catch (error) {
      console.error(`Error fetching WooCommerce products page ${page}:`, error);
      morePages = false;
      throw error;
    }
  }

  console.log(`Finished fetching products. Total found: ${allProducts.length}`);
  return allProducts;
};

// Interface for the data returned by getProductsPage, including pagination info
export interface PaginatedProductsResponse {
  products: Product[];
  totalProducts: number;
  totalPages: number;
}

// Fetch a specific page of products
export const getProductsPage = async (
  page: number = 1,
  perPage: number = 10,
  filters: { search?: string; status?: string; category?: string; tag?: string; sku?: string; stock_status?: string } = {}
): Promise<PaginatedProductsResponse> => {
  console.log(`Fetching products page ${page} (perPage: ${perPage})...`, filters);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      page: page,
      per_page: perPage,
      orderby: 'date',
      order: 'desc',
      // Add filters if provided
      ...(filters.search && { search: filters.search }),
      ...(filters.status && { status: filters.status }),
      ...(filters.category && { category: filters.category }),
      ...(filters.tag && { tag: filters.tag }),
      ...(filters.sku && { sku: filters.sku }),
      ...(filters.stock_status && { stock_status: filters.stock_status }),
    };

    const response = await woocommerceApi.get<Product[]>('/products', { params });

    const products = response.data;
    const totalProducts = parseInt(response.headers['x-wp-total'] || '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0', 10);

    console.log(`Fetched products page ${page}. Found: ${products.length}, Total: ${totalProducts}, TotalPages: ${totalPages}`);

    return {
      products,
      totalProducts,
      totalPages,
    };
  } catch (error) {
    console.error(`Error fetching WooCommerce products page ${page}:`, error);
    // In case of an error, return an empty/default structure to avoid breaking the app
    // Or rethrow if preferred, but the calling code must handle it gracefully
    throw error; 
    // return {
    //   products: [],
    //   totalProducts: 0,
    //   totalPages: 0,
    // };
  }
};

// Fetch a single product by its ID
export const getProductById = async (productId: number): Promise<Product> => {
  try {
    console.log(`Fetching product with ID: ${productId}...`);
    const response = await woocommerceApi.get<Product>(`/products/${productId}`);
    console.log(`Successfully fetched product ${productId}.`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching WooCommerce product ${productId}:`, error);
    throw error;
  }
};

// Interface for product update payload (can be partial)
// We can reuse parts of the Product interface, but define explicitly for clarity
export interface UpdateProductPayload {
  name?: string;
  description?: string;
  short_description?: string;
  sku?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number | null;
  stock_status?: 'instock' | 'outofstock' | 'onbackorder';
  // Add other fields you want to make editable
}

// Update an existing product
export const updateProduct = async (
  productId: number,
  payload: UpdateProductPayload
): Promise<Product> => {
  try {
    console.log(`Updating product ${productId}...`, payload);
    // Filter out undefined values from payload to avoid sending them
    const filteredPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as UpdateProductPayload);

    if (Object.keys(filteredPayload).length === 0) {
       console.warn("Update payload is empty, nothing to update.");
       // Optionally fetch and return the current product data if needed
       // For now, we might throw or return null/undefined based on desired behavior
       // Let's throw an error for clarity
       throw new Error("No changes provided for update.");
    }

    const response = await woocommerceApi.put<Product>(`/products/${productId}`, filteredPayload);
    console.log(`Successfully updated product ${productId}.`);
    return response.data;
  } catch (error) {
    console.error(`Error updating WooCommerce product ${productId}:`, error);
    throw error; // Re-throw the error to be caught by useMutation
  }
};

// --- Orders Pagination Function ---
export interface PaginatedOrdersResponse {
  orders: Order[];
  totalOrders: number;
  totalPages: number;
}

export const getOrdersPage = async (
  page: number = 1,
  perPage: number = 25, // Default to a reasonable number for display
  filters: { customerId?: number; status?: string; orderby?: string; order?: string } = {}
): Promise<PaginatedOrdersResponse> => {
  console.log(`Fetching orders page ${page} (perPage: ${perPage})...`, filters);
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any = {
      page: page,
      per_page: perPage,
      orderby: filters.orderby || 'date', // Default to sort by date
      order: filters.order || 'desc',     // Default to most recent first
      ...(filters.customerId && { customer: filters.customerId }),
      ...(filters.status && { status: filters.status }),
      // Consider adding '_fields' to limit data if performance is still an issue
      // e.g., _fields: 'id,date_created,status,total,billing,line_items' 
    };

    const response = await woocommerceApi.get<Order[]>('/orders', { params });

    const orders = response.data;
    // WooCommerce API returns total count and total pages in headers
    const totalOrders = parseInt(response.headers['x-wp-total'] || '0', 10);
    const totalPages = parseInt(response.headers['x-wp-totalpages'] || '0', 10);

    console.log(`Fetched orders page ${page}. Found: ${orders.length}, Total: ${totalOrders}, TotalPages: ${totalPages}`);

    return {
      orders,
      totalOrders,
      totalPages,
    };
  } catch (error) {
    console.error(`Error fetching WooCommerce orders page ${page}:`, error);
    // Rethrow the error to be handled by react-query
    throw error;
  }
};