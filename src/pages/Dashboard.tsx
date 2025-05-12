import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import OrdersTable from "@/components/Dashboard/OrdersTable";
import ActivityFeed from "@/components/Dashboard/ActivityFeed";
import { getRecentOrders, Order } from "@/lib/woocommerce";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

const Dashboard = () => {
  const { data: orders, isLoading, error } = useQuery<Order[]>({
    queryKey: ["woocommerce_recent_orders_dashboard", 25],
    queryFn: () => getRecentOrders(25),
  });

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="space-y-6">

            {/* Top Section: KPIs + Activity Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* KPI Cards Area (Placeholder) */}
              <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Skeleton className="h-24 w-full" /> 
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
              </div>
              
              {/* Activity Feed */} 
              <div className="lg:col-span-1">
                 <ActivityFeed numberOfOrders={5} />
              </div>
            </div>

            {/* Orders Table Section */}
            <div> {/* Now takes full width below the top section */} 
              <h2 className="text-xl font-semibold mb-4">Dernières commandes</h2>
              {isLoading && (
                 <div className="bg-white rounded-lg shadow">
                   <Skeleton className="h-10 w-full rounded-t-lg" />
                   <Skeleton className="h-12 w-full mt-1" />
                   <Skeleton className="h-12 w-full mt-1" />
                   <Skeleton className="h-12 w-full mt-1 rounded-b-lg" />
                 </div>
              )}
              {error && (
                <div className="text-red-600 flex items-center p-4 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Erreur lors du chargement des commandes: {error.message}
                </div>
              )}
              {!isLoading && !error && orders && (
                <OrdersTable orders={orders} />
              )}
               {!isLoading && !error && !orders && (
                 <p className="text-gray-500">Aucune commande trouvée.</p>
               )}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard; 