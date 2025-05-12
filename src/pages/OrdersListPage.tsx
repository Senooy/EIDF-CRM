import { useQuery } from "@tanstack/react-query";
import { Order as WooCommerceOrder, getAllOrders } from "@/lib/woocommerce";
import OrdersTable from "@/components/Dashboard/OrdersTable";
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { AlertCircle } from "lucide-react"; // For error state

const OrdersListPage = () => {
  // Fetch ALL orders data from WooCommerce
  const { 
    data: allOrders = [], 
    isLoading: ordersLoading, 
    error: ordersError 
  } = useQuery<WooCommerceOrder[]>({
    queryKey: ["woocommerce_all_orders"], // Use the same key as Index to potentially leverage cache
    queryFn: getAllOrders,
    staleTime: 1000 * 60 * 5, // Keep data fresh for 5 minutes
  });

  const isLoading = ordersLoading;
  const isError = !!ordersError;

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          <div className="mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Toutes les commandes</h1>
          </div>
          
          {isLoading && (
            // Basic Loading Skeleton for the table area
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          )}

          {isError && (
             <div className="text-red-600 flex items-center p-4 border border-red-200 bg-red-50 rounded">
              <AlertCircle className="h-5 w-5 mr-2" />
              Erreur lors du chargement des commandes. Veuillez réessayer plus tard.
            </div>
          )}

          {!isLoading && !isError && (
            <OrdersTable orders={allOrders} />
          )}
        </main>
      </div>
    </div>
  );
};

export default OrdersListPage; 