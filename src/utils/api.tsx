
import { toast } from "sonner";

export interface WooCommerceOrder {
  id: number;
  status: string;
  date_created: string;
  total: string;
  billing: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  shipping: {
    first_name: string;
    last_name: string;
    address_1?: string;
    address_2?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  line_items: Array<{
    id: number;
    name: string;
    product_id: number;
    quantity: number;
    price: string;
    total: string;
  }>;
  payment_method_title: string;
  shipping_lines: Array<{
    method_title: string;
    total: string;
  }>;
}

export interface WooCommerceStats {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  completedOrders: number;
  revenueToday: number;
  revenueThisMonth: number;
}

// This would be replaced with actual API credentials
const API_CONFIG = {
  url: "",
  consumerKey: "",
  consumerSecret: "",
};

// Mock data for demonstration purposes
const MOCK_ORDERS: WooCommerceOrder[] = [
  {
    id: 1001,
    status: "processing",
    date_created: "2025-05-10T14:23:45",
    total: "149.99",
    billing: {
      first_name: "Jean",
      last_name: "Dupont",
      email: "jean.dupont@example.com",
      phone: "+33 6 12 34 56 78",
      address_1: "123 Rue de Paris",
      city: "Paris",
      state: "Île-de-France",
      postcode: "75001",
      country: "FR"
    },
    shipping: {
      first_name: "Jean",
      last_name: "Dupont",
      address_1: "123 Rue de Paris",
      city: "Paris",
      state: "Île-de-France",
      postcode: "75001",
      country: "FR"
    },
    line_items: [
      {
        id: 101,
        name: "iPhone Case Premium",
        product_id: 501,
        quantity: 1,
        price: "49.99",
        total: "49.99"
      },
      {
        id: 102,
        name: "MacBook Pro Sleeve",
        product_id: 502,
        quantity: 1,
        price: "89.99",
        total: "89.99"
      },
    ],
    payment_method_title: "Carte bancaire",
    shipping_lines: [
      {
        method_title: "Livraison standard",
        total: "10.00"
      }
    ]
  },
  {
    id: 1002,
    status: "completed",
    date_created: "2025-05-09T10:15:30",
    total: "1299.99",
    billing: {
      first_name: "Marie",
      last_name: "Laurent",
      email: "marie.laurent@example.com",
      phone: "+33 6 98 76 54 32",
      address_1: "45 Avenue des Champs-Élysées",
      city: "Paris",
      state: "Île-de-France",
      postcode: "75008",
      country: "FR"
    },
    shipping: {
      first_name: "Marie",
      last_name: "Laurent",
      address_1: "45 Avenue des Champs-Élysées",
      city: "Paris",
      state: "Île-de-France",
      postcode: "75008",
      country: "FR"
    },
    line_items: [
      {
        id: 103,
        name: "iPad Pro",
        product_id: 503,
        quantity: 1,
        price: "1299.99",
        total: "1299.99"
      }
    ],
    payment_method_title: "PayPal",
    shipping_lines: [
      {
        method_title: "Livraison express",
        total: "20.00"
      }
    ]
  },
  {
    id: 1003,
    status: "pending",
    date_created: "2025-05-11T09:05:15",
    total: "249.99",
    billing: {
      first_name: "Pierre",
      last_name: "Martin",
      email: "pierre.martin@example.com",
      phone: "+33 6 11 22 33 44",
      address_1: "8 Rue du Commerce",
      city: "Lyon",
      state: "Auvergne-Rhône-Alpes",
      postcode: "69002",
      country: "FR"
    },
    shipping: {
      first_name: "Pierre",
      last_name: "Martin",
      address_1: "8 Rue du Commerce",
      city: "Lyon",
      state: "Auvergne-Rhône-Alpes",
      postcode: "69002",
      country: "FR"
    },
    line_items: [
      {
        id: 104,
        name: "AirPods Pro",
        product_id: 504,
        quantity: 1,
        price: "249.99",
        total: "249.99"
      }
    ],
    payment_method_title: "Virement bancaire",
    shipping_lines: [
      {
        method_title: "Livraison standard",
        total: "10.00"
      }
    ]
  },
  {
    id: 1004,
    status: "processing",
    date_created: "2025-05-10T16:45:22",
    total: "159.98",
    billing: {
      first_name: "Sophie",
      last_name: "Dubois",
      email: "sophie.dubois@example.com",
      phone: "+33 6 55 66 77 88",
      address_1: "15 Rue de la République",
      city: "Marseille",
      state: "Provence-Alpes-Côte d'Azur",
      postcode: "13001",
      country: "FR"
    },
    shipping: {
      first_name: "Sophie",
      last_name: "Dubois",
      address_1: "15 Rue de la République",
      city: "Marseille",
      state: "Provence-Alpes-Côte d'Azur",
      postcode: "13001",
      country: "FR"
    },
    line_items: [
      {
        id: 105,
        name: "Magic Mouse",
        product_id: 505,
        quantity: 1,
        price: "79.99",
        total: "79.99"
      },
      {
        id: 106,
        name: "Magic Keyboard",
        product_id: 506,
        quantity: 1,
        price: "79.99",
        total: "79.99"
      }
    ],
    payment_method_title: "Carte bancaire",
    shipping_lines: [
      {
        method_title: "Livraison standard",
        total: "10.00"
      }
    ]
  },
  {
    id: 1005,
    status: "on-hold",
    date_created: "2025-05-08T08:30:11",
    total: "429.99",
    billing: {
      first_name: "Lucas",
      last_name: "Bernard",
      email: "lucas.bernard@example.com",
      phone: "+33 6 44 55 66 77",
      address_1: "27 Boulevard Victor Hugo",
      city: "Nice",
      state: "Provence-Alpes-Côte d'Azur",
      postcode: "06000",
      country: "FR"
    },
    shipping: {
      first_name: "Lucas",
      last_name: "Bernard",
      address_1: "27 Boulevard Victor Hugo",
      city: "Nice",
      state: "Provence-Alpes-Côte d'Azur",
      postcode: "06000",
      country: "FR"
    },
    line_items: [
      {
        id: 107,
        name: "Apple Watch SE",
        product_id: 507,
        quantity: 1,
        price: "429.99",
        total: "429.99"
      }
    ],
    payment_method_title: "Paiement à la livraison",
    shipping_lines: [
      {
        method_title: "Livraison standard",
        total: "10.00"
      }
    ]
  }
];

// Function to fetch orders from WooCommerce
export async function fetchOrders(): Promise<WooCommerceOrder[]> {
  // In a real application, this would make an API call
  // For now, we'll return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_ORDERS);
    }, 500);
  });
}

// Function to fetch a single order by ID
export async function fetchOrderById(id: number): Promise<WooCommerceOrder | undefined> {
  // In a real application, this would make an API call
  // For now, we'll return mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      const order = MOCK_ORDERS.find(order => order.id === id);
      resolve(order);
    }, 300);
  });
}

// Function to fetch dashboard statistics
export async function fetchDashboardStats(): Promise<WooCommerceStats> {
  // In a real application, this would make an API call
  // For now, we'll calculate stats from mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      const stats = {
        totalOrders: MOCK_ORDERS.length,
        pendingOrders: MOCK_ORDERS.filter(o => o.status === "pending").length,
        processingOrders: MOCK_ORDERS.filter(o => o.status === "processing").length,
        completedOrders: MOCK_ORDERS.filter(o => o.status === "completed").length,
        revenueToday: MOCK_ORDERS
          .filter(o => new Date(o.date_created).toDateString() === new Date().toDateString())
          .reduce((sum, o) => sum + parseFloat(o.total), 0),
        revenueThisMonth: MOCK_ORDERS.reduce((sum, o) => sum + parseFloat(o.total), 0),
      };
      resolve(stats);
    }, 500);
  });
}

// Function to update order status
export async function updateOrderStatus(id: number, status: string): Promise<boolean> {
  // In a real application, this would make an API call
  // For now, we'll just simulate a successful update
  return new Promise((resolve) => {
    setTimeout(() => {
      toast.success(`Commande #${id} mise à jour avec succès`);
      resolve(true);
    }, 500);
  });
}

// Function to generate PDF invoice (mock)
export async function generateInvoice(id: number): Promise<Blob | null> {
  // In a real application, this would make an API call to generate a PDF
  // For now, we'll just simulate the action
  return new Promise((resolve) => {
    setTimeout(() => {
      toast.info(`Génération de la facture pour la commande #${id}`);
      resolve(null);
    }, 500);
  });
}
