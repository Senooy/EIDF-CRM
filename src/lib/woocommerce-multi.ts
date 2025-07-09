import { QueryFunctionContext } from "@tanstack/react-query";
import { wpClientManager } from './api/wordpress-client';
import type { 
  Order, 
  OrderNote, 
  RefundPayload, 
  Refund,
  OrderTotalsReport,
  SalesReportTotal,
  SalesReportInterval,
  SalesReport,
  Customer,
  Product,
  ProductImage,
  ProductCategory,
  PaginatedProductsResponse,
  UpdateProductPayload
} from './woocommerce';

// Re-export existing interfaces from the original file
export type { 
  Order, 
  OrderNote, 
  RefundPayload, 
  Refund,
  OrderTotalsReport,
  SalesReportTotal,
  SalesReportInterval,
  SalesReport,
  Customer,
  Product,
  ProductImage,
  ProductCategory,
  PaginatedProductsResponse,
  UpdateProductPayload
};

// Multi-site aware WooCommerce functions
export const getOrders = async (siteId?: number): Promise<Order[]> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    const result = await client.getOrders({ per_page: 100, orderby: 'date', order: 'desc' });
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error('Error fetching WooCommerce orders:', error);
    throw error;
  }
};

export const getOrderById = async (orderId: number, siteId?: number): Promise<Order> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    return await client.getOrder(orderId);
  } catch (error) {
    console.error(`Error fetching WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

export const getRecentOrders = async (count: number = 10, siteId?: number): Promise<Order[]> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    const result = await client.getOrders({
      per_page: count,
      page: 1,
      orderby: 'date',
      order: 'desc'
    });
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error(`Error fetching ${count} recent WooCommerce orders:`, error);
    throw error;
  }
};

export const getAllOrders = async (
  contextOrCustomerId?: number | QueryFunctionContext<[string, number?]>,
  siteId?: number
): Promise<Order[]> => {
  let customerId: number | undefined = undefined;

  if (typeof contextOrCustomerId === 'object' && contextOrCustomerId !== null && 'queryKey' in contextOrCustomerId) {
    customerId = contextOrCustomerId.queryKey[1]; 
  } else if (typeof contextOrCustomerId === 'number') {
    customerId = contextOrCustomerId;
  }

  const client = await wpClientManager.getClient(siteId);
  let allOrders: Order[] = [];
  let page = 1;
  const perPage = 100;
  let morePages = true;

  console.log(`Starting to fetch all orders${customerId !== undefined ? ' for customer ' + customerId : ''}...`);

  while (morePages) {
    try {
      console.log(`Fetching orders page ${page}${customerId !== undefined ? ' for customer ' + customerId : ''}...`);
      const params: any = {
        per_page: perPage,
        page: page,
        orderby: 'date',
        order: 'asc'
      };

      if (customerId !== undefined) {
        params.customer = customerId;
      }

      const result = await client.getOrders(params);
      const orders = Array.isArray(result) ? result : result.data || [];
      
      if (orders.length > 0) {
        allOrders = allOrders.concat(orders);
        page++;
      } else {
        morePages = false;
      }

      if (page > 500) {
         console.warn("Stopped fetching orders after 500 pages to prevent potential infinite loop.");
         morePages = false;
      }

    } catch (error) {
      console.error(`Error fetching WooCommerce orders page ${page}:`, error);
      morePages = false;
      throw error;
    }
  }

  console.log(`Finished fetching orders${customerId !== undefined ? ' for customer ' + customerId : ''}. Total found: ${allOrders.length}`);
  return allOrders;
};

export const updateOrderStatus = async (orderId: number, status: string, siteId?: number): Promise<Order> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    return await client.updateOrder(orderId, { status });
  } catch (error) {
    console.error(`Error updating status for WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

export const getOrderNotes = async (orderId: number, siteId?: number): Promise<OrderNote[]> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    return await client.getWooCommerceData(`orders/${orderId}/notes`);
  } catch (error) {
    console.error(`Error fetching notes for WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

export const createOrderNote = async (
  orderId: number, 
  noteData: { note: string; customer_note?: boolean },
  siteId?: number
): Promise<OrderNote> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    return await client.postWooCommerceData(`orders/${orderId}/notes`, noteData);
  } catch (error) {
    console.error(`Error creating note for WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

export const createRefund = async (orderId: number, refundData: RefundPayload, siteId?: number): Promise<Refund> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    return await client.postWooCommerceData(`orders/${orderId}/refunds`, refundData);
  } catch (error) {
    console.error(`Error creating refund for WooCommerce order ${orderId}:`, error);
    throw error;
  }
};

// Reports
export const getOrderTotalsReport = async (siteId?: number): Promise<OrderTotalsReport[]> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    return await client.getReports('orders/totals');
  } catch (error) {
    console.error('Error fetching WooCommerce order totals report:', error);
    throw error;
  }
};

export const getSalesReport = async (
  period: string = 'month', 
  interval: string = 'day',
  siteId?: number
): Promise<SalesReport> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    const params: any = { interval };

    if (period === 'quarter') {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const startMonth = Math.floor(currentMonth / 3) * 3;
      const firstDayOfQuarter = new Date(currentYear, startMonth, 1);
      const firstDayOfNextQuarter = new Date(currentYear, startMonth + 3, 1);
      const lastDayOfQuarter = new Date(firstDayOfNextQuarter.getTime() - 86400000);

      params.date_min = firstDayOfQuarter.toISOString().split('T')[0];
      params.date_max = lastDayOfQuarter.toISOString().split('T')[0];
    } else {
      params.period = period;
    }

    return await client.getReports('sales', params);
  } catch (error) {
    console.error('Error fetching WooCommerce sales report:', error);
    throw error;
  }
};

// Customers
export const getAllCustomers = async (
  filters: { search?: string; role?: string } = {},
  siteId?: number
): Promise<Customer[]> => {
  const client = await wpClientManager.getClient(siteId);
  let allCustomers: Customer[] = [];
  let page = 1;
  const perPage = 100;
  let morePages = true;

  console.log("Starting to fetch all customers...", filters);

  while (morePages) {
    try {
      console.log(`Fetching customers page ${page}...`);
      const params: any = {
        per_page: perPage,
        page: page,
        orderby: 'registered_date',
        order: 'desc',
        ...(filters.search && { search: filters.search }),
        ...(filters.role && { role: filters.role }),
      };

      if (!params.role) {
        params.role = 'customer';
      }

      const result = await client.getCustomers(params);
      const customers = Array.isArray(result) ? result : result.data || [];

      if (customers.length > 0) {
        allCustomers = allCustomers.concat(customers);
        page++;
      } else {
        morePages = false;
      }

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

export const getCustomerById = async (customerId: number, siteId?: number): Promise<Customer> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    return await client.getCustomer(customerId);
  } catch (error) {
    console.error(`Error fetching WooCommerce customer ${customerId}:`, error);
    throw error;
  }
};

// Products
export const getAllProducts = async (
  filters: { 
    search?: string; 
    status?: string; 
    category?: string; 
    tag?: string; 
    sku?: string; 
    stock_status?: string 
  } = {},
  siteId?: number
): Promise<Product[]> => {
  const client = await wpClientManager.getClient(siteId);
  let allProducts: Product[] = [];
  let page = 1;
  const perPage = 100;
  let morePages = true;

  console.log("Starting to fetch all products...", filters);

  while (morePages) {
    try {
      console.log(`Fetching products page ${page}...`);
      const params: any = {
        per_page: perPage,
        page: page,
        orderby: 'date',
        order: 'desc',
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.category && { category: filters.category }),
        ...(filters.tag && { tag: filters.tag }),
        ...(filters.sku && { sku: filters.sku }),
        ...(filters.stock_status && { stock_status: filters.stock_status }),
      };

      const result = await client.getProducts(params);
      const products = Array.isArray(result) ? result : result.data || [];

      if (products.length > 0) {
        allProducts = allProducts.concat(products);
        page++;
      } else {
        morePages = false;
      }

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

export const getProductsPage = async (
  page: number = 1,
  perPage: number = 10,
  filters: { 
    search?: string; 
    status?: string; 
    category?: string;
    tag?: string; 
    sku?: string; 
    stock_status?: 'instock' | 'outofstock' | 'onbackorder';
    min_price?: string;
    max_price?: string;
    orderby?: 'date' | 'id' | 'include' | 'title' | 'slug' | 'modified' | 'rand' | 'menu_order' | 'price' | 'popularity' | 'rating' | 'total_sales';
    order?: 'asc' | 'desc';
  } = {},
  siteId?: number
): Promise<PaginatedProductsResponse> => {
  console.log(`Fetching products page ${page} (perPage: ${perPage})...`, filters.search ? filters.search : '');
  try {
    const client = await wpClientManager.getClient(siteId);
    const params: any = {
      page: page,
      per_page: perPage,
      status: filters.status || 'publish',
    };

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = value;
      }
    });

    const result = await client.getProducts(params);
    
    if (result.pagination) {
      return {
        products: result.data,
        totalProducts: result.pagination.total || 0,
        totalPages: result.pagination.totalPages || 0,
      };
    }

    // Fallback for direct array response
    return {
      products: Array.isArray(result) ? result : [],
      totalProducts: 0,
      totalPages: 1,
    };
  } catch (error) {
    console.error(`Error fetching WooCommerce products page ${page}:`, error);
    throw error;
  }
};

export const getProductById = async (productId: number, siteId?: number): Promise<Product> => {
  try {
    console.log(`Fetching product with ID: ${productId}...`);
    const client = await wpClientManager.getClient(siteId);
    const product = await client.getProduct(productId);
    console.log(`Successfully fetched product ${productId}.`);
    return product;
  } catch (error) {
    console.error(`Error fetching WooCommerce product ${productId}:`, error);
    throw error;
  }
};

export const updateProduct = async (
  productId: number,
  payload: UpdateProductPayload,
  siteId?: number
): Promise<Product> => {
  try {
    console.log(`Updating product ${productId}...`, payload);
    const client = await wpClientManager.getClient(siteId);
    
    const filteredPayload = Object.entries(payload).reduce((acc, [key, value]) => {
      if (value !== undefined) {
        (acc as any)[key] = value;
      }
      return acc;
    }, {} as UpdateProductPayload);

    if (Object.keys(filteredPayload).length === 0) {
       throw new Error("No changes provided for update.");
    }

    const updatedProduct = await client.updateProduct(productId, filteredPayload);
    console.log(`Successfully updated product ${productId}.`);
    return updatedProduct;
  } catch (error) {
    console.error(`Error updating WooCommerce product ${productId}:`, error);
    throw error;
  }
};

export const getProductCategories = async (siteId?: number): Promise<ProductCategory[]> => {
  try {
    const client = await wpClientManager.getClient(siteId);
    const result = await client.getWooCommerceData('products/categories', {
      per_page: 100,
      orderby: 'name',
      order: 'asc'
    });
    return Array.isArray(result) ? result : result.data || [];
  } catch (error) {
    console.error('Error fetching WooCommerce product categories:', error);
    throw error;
  }
};

// WordPress specific functions
export const getWordPressStats = async (siteId?: number) => {
  const client = await wpClientManager.getClient(siteId);
  
  const [posts, pages, comments, users, media] = await Promise.all([
    client.getPosts({ per_page: 1 }),
    client.getPages({ per_page: 1 }),
    client.getComments({ per_page: 1 }),
    client.getUsers({ per_page: 1 }),
    client.getMedia({ per_page: 1 })
  ]);

  return {
    posts: posts.pagination?.total || 0,
    pages: pages.pagination?.total || 0,
    comments: comments.pagination?.total || 0,
    users: users.pagination?.total || 0,
    media: media.pagination?.total || 0
  };
};

// Re-export the client manager for direct use
export { wpClientManager };