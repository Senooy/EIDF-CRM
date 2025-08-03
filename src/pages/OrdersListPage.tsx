import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Order as WooCommerceOrder, getOrdersPage, PaginatedOrdersResponse } from "@/lib/woocommerce-multi";
import OrdersTable from "@/components/Dashboard/OrdersTable";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { AlertCircle, RefreshCw, Database } from "lucide-react";
import { RequireSite } from "@/components/RequireSite";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCachedOrders } from "@/hooks/useCachedData";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const OrdersListPage = () => {
  const [useCache, setUseCache] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  // Use cached data
  const {
    data: cachedOrders,
    isLoading: cacheLoading,
    isSyncing,
    error: cacheError,
    totalCount: cachedTotalCount,
    lastSync,
    isStale,
    sync,
    page: cachePage,
    totalPages: cacheTotalPages,
    goToPage: cacheGoToPage
  } = useCachedOrders({
    page: currentPage,
    perPage: ITEMS_PER_PAGE,
    bypassCache: !useCache,
    autoSync: false,
    sort: (a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime()
  });

  // Fetch paginated orders data from WooCommerce (fallback)
  const { 
    data: paginatedData,
    isLoading: ordersLoading, 
    error: ordersError,
    isPlaceholderData
  } = useQuery<PaginatedOrdersResponse>({
    queryKey: ["woocommerce_orders_page", currentPage],
    queryFn: () => getOrdersPage(currentPage, ITEMS_PER_PAGE),
    staleTime: 1000 * 60 * 5,
    placeholderData: (previousData) => previousData,
    enabled: !useCache
  });

  // Use cached data if enabled, otherwise use API data
  const allOrders = useCache ? cachedOrders : (paginatedData?.orders || []);
  const totalPages = useCache ? cacheTotalPages : (paginatedData?.totalPages || 0);
  const totalOrders = useCache ? cachedTotalCount : (paginatedData?.totalOrders || 0);

  const isLoading = useCache ? cacheLoading : (ordersLoading && !paginatedData);
  const isError = useCache ? !!cacheError : !!ordersError;
  const error = useCache ? cacheError : ordersError;

  // Update cache page when current page changes
  useEffect(() => {
    if (useCache && cachePage !== currentPage) {
      cacheGoToPage(currentPage);
    }
  }, [currentPage, useCache, cachePage, cacheGoToPage]);

  return (
    <RequireSite>
      <div className="space-y-6">
        <PageHeader 
          title="Toutes les commandes"
          description={`${totalOrders} commandes au total`}
          actions={
            <div className="flex items-center gap-4">
                  {/* Cache Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="use-cache"
                      checked={useCache}
                      onCheckedChange={setUseCache}
                    />
                    <Label htmlFor="use-cache" className="flex items-center gap-2 cursor-pointer">
                      <Database className="h-4 w-4" />
                      Cache local
                      {useCache && lastSync && (
                        <Badge variant={isStale ? "secondary" : "default"} className="text-xs">
                          {isStale ? "Obsolète" : "À jour"}
                        </Badge>
                      )}
                    </Label>
                  </div>
                  
                  {/* Sync Button */}
                  {useCache && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Synchronisation...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Synchroniser
                        </>
                      )}
                    </Button>
                  )}
            </div>
          }
        />
        
        <div className="container mx-auto px-6">
          {isLoading && <TableSkeleton />}

          {isError && (
             <div className="text-destructive flex items-center p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error?.message || "Erreur lors du chargement des commandes. Veuillez réessayer plus tard."}
            </div>
          )}

          {!isLoading && !isError && (
            <>
              <OrdersTable orders={allOrders} itemsPerPage={ITEMS_PER_PAGE} />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages} (Total : {totalOrders} commandes)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="px-3">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={isPlaceholderData || currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </RequireSite>
  );
};

export default OrdersListPage; 