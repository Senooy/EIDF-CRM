export interface WooCommerceOrder {
  id: number;
  parent_id: number;
  number: string;
  order_key: string;
  created_via: string;
  version: string;
  status: string;
  currency: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  discount_total: string;
  discount_tax: string;
  shipping_total: string;
  shipping_tax: string;
  cart_tax: string;
  total: string;
  total_tax: string;
  prices_include_tax: boolean;
  customer_id: number;
  customer_ip_address: string;
  customer_user_agent: string;
  customer_note: string;
  billing: any;
  shipping: any;
  payment_method: string;
  payment_method_title: string;
  transaction_id: string;
  date_paid: string;
  date_paid_gmt: string;
  date_completed: string;
  date_completed_gmt: string;
  cart_hash: string;
  meta_data: any[];
  line_items: any[];
  tax_lines: any[];
  shipping_lines: any[];
  fee_lines: any[];
  coupon_lines: any[];
  refunds: any[];
  set_paid: boolean;
}

export interface WooCommerceProduct {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  type: string;
  status: string;
  featured: boolean;
  catalog_visibility: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  date_on_sale_from: string;
  date_on_sale_from_gmt: string;
  date_on_sale_to: string;
  date_on_sale_to_gmt: string;
  price_html: string;
  on_sale: boolean;
  purchasable: boolean;
  total_sales: number;
  virtual: boolean;
  downloadable: boolean;
  downloads: any[];
  download_limit: number;
  download_expiry: number;
  external_url: string;
  button_text: string;
  tax_status: string;
  tax_class: string;
  manage_stock: boolean;
  stock_quantity: number;
  stock_status: string;
  backorders: string;
  backorders_allowed: boolean;
  backordered: boolean;
  sold_individually: boolean;
  weight: string;
  dimensions: any;
  shipping_required: boolean;
  shipping_taxable: boolean;
  shipping_class: string;
  shipping_class_id: number;
  reviews_allowed: boolean;
  average_rating: string;
  rating_count: number;
  related_ids: number[];
  upsell_ids: number[];
  cross_sell_ids: number[];
  parent_id: number;
  purchase_note: string;
  categories: any[];
  tags: any[];
  images: any[];
  attributes: any[];
  default_attributes: any[];
  variations: any[];
  grouped_products: any[];
  menu_order: number;
  meta_data: any[];
}

export interface WooCommerceCustomer {
  id: number;
  date_created: string;
  date_created_gmt: string;
  date_modified: string;
  date_modified_gmt: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  username: string;
  billing: any;
  shipping: any;
  is_paying_customer: boolean;
  avatar_url: string;
  meta_data: any[];
}

export function generateMockOrders(count: number = 15): WooCommerceOrder[] {
  const orders: WooCommerceOrder[] = [];
  const statuses = ['completed', 'processing', 'pending', 'on-hold', 'cancelled'];
  const baseDate = new Date();

  for (let i = 0; i < count; i++) {
    const orderDate = new Date(baseDate.getTime() - (i * 2 * 24 * 60 * 60 * 1000));
    const total = (Math.random() * 5000 + 1000).toFixed(2); // Entre 1000 et 6000€
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const order: WooCommerceOrder = {
      id: i + 1000,
      parent_id: 0,
      number: `${i + 1000}`,
      order_key: `wc_order_${Date.now() + i}`,
      created_via: 'checkout',
      version: '6.8.0',
      status,
      currency: 'EUR',
      date_created: orderDate.toISOString(),
      date_created_gmt: orderDate.toISOString(),
      date_modified: orderDate.toISOString(),
      date_modified_gmt: orderDate.toISOString(),
      discount_total: '0.00',
      discount_tax: '0.00',
      shipping_total: '50.00',
      shipping_tax: '10.00',
      cart_tax: (parseFloat(total) * 0.2).toFixed(2),
      total,
      total_tax: (parseFloat(total) * 0.2).toFixed(2),
      prices_include_tax: false,
      customer_id: Math.floor(Math.random() * 50) + 1,
      customer_ip_address: `192.168.1.${Math.floor(Math.random() * 255)}`,
      customer_user_agent: 'Mozilla/5.0',
      customer_note: '',
      billing: {
        first_name: `Client${i + 1}`,
        last_name: 'EIDF',
        company: `Entreprise ${i + 1}`,
        address_1: `${i + 1} Rue de l'Industrie`,
        city: 'Lyon',
        postcode: '69000',
        country: 'FR',
        email: `client${i + 1}@example.com`,
        phone: '0123456789'
      },
      shipping: {},
      payment_method: 'bank_transfer',
      payment_method_title: 'Virement bancaire',
      transaction_id: '',
      date_paid: status === 'completed' ? orderDate.toISOString() : '',
      date_paid_gmt: status === 'completed' ? orderDate.toISOString() : '',
      date_completed: status === 'completed' ? orderDate.toISOString() : '',
      date_completed_gmt: status === 'completed' ? orderDate.toISOString() : '',
      cart_hash: '',
      meta_data: [],
      line_items: [{
        id: i + 2000,
        name: `Gaine de ventilation sur mesure - Commande ${i + 1}`,
        product_id: Math.floor(Math.random() * 10) + 1,
        variation_id: 0,
        quantity: Math.floor(Math.random() * 5) + 1,
        tax_class: '',
        subtotal: (parseFloat(total) * 0.8).toFixed(2),
        subtotal_tax: (parseFloat(total) * 0.16).toFixed(2),
        total: (parseFloat(total) * 0.8).toFixed(2),
        total_tax: (parseFloat(total) * 0.16).toFixed(2),
        taxes: [],
        meta_data: [],
        sku: `EIDF-${i + 1}`,
        price: parseFloat(total) * 0.8
      }],
      tax_lines: [],
      shipping_lines: [],
      fee_lines: [],
      coupon_lines: [],
      refunds: [],
      set_paid: status === 'completed'
    };
    orders.push(order);
  }

  return orders;
}

export function generateMockProducts(count: number = 20): WooCommerceProduct[] {
  const products: WooCommerceProduct[] = [];
  const productTypes = [
    'Gaine rectangulaire galvanisée',
    'Gaine circulaire inox',
    'Coude 90° galvanisé',
    'Té de dérivation',
    'Réduction concentrique',
    'Silencieux cylindrique',
    'Registre de réglage',
    'Grille de ventilation',
    'Manchette souple',
    'Clapet anti-retour'
  ];

  for (let i = 0; i < Math.min(count, productTypes.length * 2); i++) {
    const productName = productTypes[i % productTypes.length];
    const price = (Math.random() * 500 + 50).toFixed(2); // Entre 50 et 550€
    const productDate = new Date(Date.now() - (i * 24 * 60 * 60 * 1000));

    const product: WooCommerceProduct = {
      id: i + 1,
      name: `${productName} - Dimension ${i + 1}`,
      slug: productName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-'),
      permalink: `https://eco-industrie-france.com/produit/${productName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/`,
      date_created: productDate.toISOString(),
      date_created_gmt: productDate.toISOString(),
      date_modified: productDate.toISOString(),
      date_modified_gmt: productDate.toISOString(),
      type: 'simple',
      status: 'publish',
      featured: i < 5,
      catalog_visibility: 'visible',
      description: `<p>Description détaillée du produit ${productName}. Fabrication sur mesure par EIDF.</p>`,
      short_description: `<p>${productName} de qualité professionnelle.</p>`,
      sku: `EIDF-PROD-${String(i + 1).padStart(3, '0')}`,
      price,
      regular_price: price,
      sale_price: '',
      date_on_sale_from: '',
      date_on_sale_from_gmt: '',
      date_on_sale_to: '',
      date_on_sale_to_gmt: '',
      price_html: `<span class="amount">${price}&nbsp;€</span>`,
      on_sale: false,
      purchasable: true,
      total_sales: Math.floor(Math.random() * 100),
      virtual: false,
      downloadable: false,
      downloads: [],
      download_limit: -1,
      download_expiry: -1,
      external_url: '',
      button_text: '',
      tax_status: 'taxable',
      tax_class: '',
      manage_stock: true,
      stock_quantity: Math.floor(Math.random() * 50) + 10,
      stock_status: 'instock',
      backorders: 'no',
      backorders_allowed: false,
      backordered: false,
      sold_individually: false,
      weight: (Math.random() * 10 + 0.5).toFixed(2),
      dimensions: {
        length: (Math.random() * 100 + 10).toFixed(0),
        width: (Math.random() * 50 + 5).toFixed(0),
        height: (Math.random() * 20 + 2).toFixed(0)
      },
      shipping_required: true,
      shipping_taxable: true,
      shipping_class: '',
      shipping_class_id: 0,
      reviews_allowed: true,
      average_rating: (Math.random() * 2 + 3).toFixed(1), // Entre 3.0 et 5.0
      rating_count: Math.floor(Math.random() * 20),
      related_ids: [],
      upsell_ids: [],
      cross_sell_ids: [],
      parent_id: 0,
      purchase_note: '',
      categories: [{
        id: 1,
        name: 'Ventilation',
        slug: 'ventilation'
      }],
      tags: [],
      images: [{
        id: i + 100,
        date_created: productDate.toISOString(),
        date_created_gmt: productDate.toISOString(),
        date_modified: productDate.toISOString(),
        date_modified_gmt: productDate.toISOString(),
        src: `https://via.placeholder.com/300x300/007BFF/FFFFFF?text=${encodeURIComponent(productName)}`,
        name: productName,
        alt: productName
      }],
      attributes: [],
      default_attributes: [],
      variations: [],
      grouped_products: [],
      menu_order: i,
      meta_data: []
    };
    products.push(product);
  }

  return products;
}

export function generateMockCustomers(count: number = 25): WooCommerceCustomer[] {
  const customers: WooCommerceCustomer[] = [];
  const firstNames = ['Jean', 'Marie', 'Pierre', 'Sophie', 'Alain', 'Claire', 'Michel', 'Isabelle', 'Laurent', 'Nathalie'];
  const lastNames = ['Dupont', 'Martin', 'Bernard', 'Dubois', 'Moreau', 'Simon', 'Laurent', 'Leroy', 'Roux', 'David'];
  const companies = ['EIDF'];

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
    const company = companies[i % companies.length];
    const customerDate = new Date(Date.now() - (i * 7 * 24 * 60 * 60 * 1000));

    const customer: WooCommerceCustomer = {
      id: i + 1,
      date_created: customerDate.toISOString(),
      date_created_gmt: customerDate.toISOString(),
      date_modified: customerDate.toISOString(),
      date_modified_gmt: customerDate.toISOString(),
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
      first_name: firstName,
      last_name: lastName,
      role: 'customer',
      username: `${firstName.toLowerCase()}_${lastName.toLowerCase()}`,
      billing: {
        first_name: firstName,
        last_name: lastName,
        company: company,
        address_1: `${i + 1} Rue de l'Industrie`,
        address_2: '',
        city: 'Lyon',
        state: '',
        postcode: `69${String(i % 100).padStart(3, '0')}`,
        country: 'FR',
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: `01234567${String(i % 100).padStart(2, '0')}`
      },
      shipping: {},
      is_paying_customer: Math.random() > 0.3,
      avatar_url: `https://secure.gravatar.com/avatar/placeholder-${i}?s=96&d=mm&r=g`,
      meta_data: []
    };
    customers.push(customer);
  }

  return customers;
}

export interface WooCommerceSystemStatus {
  environment: {
    home_url: string;
    site_url: string;
    site_title: string;
    version: string;
    log_directory: string;
    log_directory_writable: boolean;
    wp_version: string;
    wp_multisite: boolean;
    wp_memory_limit: number;
    wp_debug_mode: boolean;
    wp_cron: boolean;
    language: string;
    external_object_cache: any;
    server_info: string;
    php_version: string;
    php_post_max_size: number;
    php_max_execution_time: number;
    php_max_input_vars: number;
    curl_version: string;
    suhosin_installed: boolean;
    max_upload_size: number;
    mysql_version: string;
    mysql_version_string: string;
    default_timezone: string;
    fsockopen_or_curl_enabled: boolean;
    soapclient_enabled: boolean;
    domdocument_enabled: boolean;
    gzip_enabled: boolean;
    multibyte_string_enabled: boolean;
    remote_post_successful: boolean;
    remote_post_response: string;
    remote_get_successful: boolean;
    remote_get_response: string;
  };
}

export function generateMockSystemStatus(): WooCommerceSystemStatus {
  return {
    environment: {
      home_url: 'https://eco-industrie-france.com',
      site_url: 'https://eco-industrie-france.com',
      site_title: 'EIDF - Eco Industrie de France',
      version: '6.8.0',
      log_directory: '/wp-content/uploads/wc-logs/',
      log_directory_writable: true,
      wp_version: '6.3.1',
      wp_multisite: false,
      wp_memory_limit: 256000000,
      wp_debug_mode: false,
      wp_cron: true,
      language: 'fr_FR',
      external_object_cache: null,
      server_info: 'nginx/1.20.1',
      php_version: '8.0.30',
      php_post_max_size: 8388608,
      php_max_execution_time: 300,
      php_max_input_vars: 1000,
      curl_version: '7.68.0',
      suhosin_installed: false,
      max_upload_size: 2097152,
      mysql_version: '8.0.33',
      mysql_version_string: '8.0.33-0ubuntu0.20.04.2',
      default_timezone: 'Europe/Paris',
      fsockopen_or_curl_enabled: true,
      soapclient_enabled: true,
      domdocument_enabled: true,
      gzip_enabled: true,
      multibyte_string_enabled: true,
      remote_post_successful: true,
      remote_post_response: '200',
      remote_get_successful: true,
      remote_get_response: '200'
    }
  };
}

export const mockWooCommerceData = {
  orders: generateMockOrders(15),
  products: generateMockProducts(20),
  customers: generateMockCustomers(25),
  systemStatus: generateMockSystemStatus()
};

export default mockWooCommerceData;