import { useQuery } from "@tanstack/react-query";
import { Customer as WooCommerceCustomer } from "@/lib/woocommerce-multi";
import { useCachedCustomers } from "@/hooks/useCachedData";
import CustomersTable from "@/components/Dashboard/CustomersTable";
import CustomerCard from "@/components/Dashboard/CustomerCard";
import { PageHeader } from "@/components/Layout/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/loading-skeleton";
import { AlertCircle, RefreshCw, Database } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { formatPrice } from "@/utils/formatters";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const CustomersListPage = () => {
  // State for search term
  const [searchTerm, setSearchTerm] = useState("");
  // State for debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Default 20 items per page
  
  // Cache toggle
  const [useCache, setUseCache] = useState(true);
  // --- End Pagination State ---

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to page 1 when search changes
    }, 500); // 500ms delay

    // Cleanup function
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Use cached customers
  const {
    data: cachedCustomers,
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
  } = useCachedCustomers({
    page: currentPage,
    perPage: itemsPerPage,
    bypassCache: !useCache,
    autoSync: false,
    filter: (customer: WooCommerceCustomer) => {
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const fullName = `${customer.first_name} ${customer.last_name}`.toLowerCase();
        const email = customer.email?.toLowerCase() || '';
        const company = customer.billing?.company?.toLowerCase() || '';
        
        return fullName.includes(searchLower) || 
               email.includes(searchLower) || 
               company.includes(searchLower);
      }
      return true;
    },
    sort: (a: WooCommerceCustomer, b: WooCommerceCustomer) => {
      // Sort by date created descending
      return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
    }
  });

  const allCustomers = cachedCustomers;
  const totalPages = cacheTotalPages;
  const totalCustomers = cachedTotalCount;
  const paginatedCustomers = allCustomers;
  const customersLoading = cacheLoading;
  const customersError = cacheError;
  const customersSuccess = !cacheLoading && !cacheError;

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      if (useCache && cacheGoToPage) {
        cacheGoToPage(currentPage + 1);
      }
    }
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to page 1 when items per page changes
    if (useCache && cacheGoToPage) {
      cacheGoToPage(1);
    }
  };
  // --- End Pagination Logic ---

  // Simplify loading state
  const isLoading = customersLoading;
  const isError = !!customersError;

  // Update ErrorDisplay to only reflect customersError
  const ErrorDisplay = () => {
      let message = "Erreur lors du chargement de la liste des clients.";
      // You could add more specific error info from customersError if needed
      return (
        <div className="text-red-600 flex items-center p-4 border border-red-200 bg-red-50 rounded">
          <AlertCircle className="h-5 w-5 mr-2" />
          {message} Veuillez réessayer plus tard. Details: {customersError?.message}
        </div>
      );
  };

  // Loading state skeleton - adapt based on screen size later if needed
  const LoadingSkeleton = () => (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Clients"
        description={`${totalCustomers} clients au total`}
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
      
      <div className="container mx-auto px-6 space-y-4">
        {/* Search Input */}
        <div className="w-full max-w-sm">
            <Input
                type="search" 
                placeholder="Rechercher par nom, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
            />
        </div>
        
        {isLoading && <LoadingSkeleton />}

          {isError && <ErrorDisplay />}

          {/* Check customersSuccess ensures allCustomers is available */}
          {!isLoading && !isError && customersSuccess && ( 
            <>
              {/* Table view for medium screens and up */}
              <div className="hidden md:block space-y-4">
                {/* Pass PAGINATED basic customer data */}
                <CustomersTable customers={paginatedCustomers} /> 
                
                {/* --- Pagination Controls --- */} 
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">
                        Lignes par page:
                      </span>
                      <Select 
                        value={itemsPerPage.toString()} 
                        onValueChange={handleItemsPerPageChange}
                      >
                        <SelectTrigger className="w-[70px]">
                          <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                       <span className="text-sm text-gray-700">
                         Page {currentPage} sur {totalPages} ({totalCustomers} clients)
                       </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handlePreviousPage} 
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
                {/* --- End Pagination Controls --- */} 

              </div>
              {/* Card list view for small screens - WITH PAGINATION */}
              <div className="block md:hidden space-y-4"> 
                {/* Check paginatedCustomers length */}
                {paginatedCustomers.length > 0 ? (
                  paginatedCustomers.map((customer) => (
                    /* Pass basic customer data */
                    <CustomerCard key={customer.id} customer={customer} />
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">
                    {/* Adjust message based on whether a search is active */}
                    {debouncedSearchTerm ? `Aucun client trouvé pour "${debouncedSearchTerm}".` : "Aucun client trouvé."}
                  </p>
                )}

                {/* --- Pagination Controls for Mobile --- */} 
                {totalPages > 1 && (
                  <div className="flex flex-col items-center space-y-2 pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handlePreviousPage} 
                        disabled={currentPage === 1}
                      >
                        Précédent
                      </Button>
                       <span className="text-sm text-gray-700">
                         Page {currentPage} sur {totalPages}
                       </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleNextPage} 
                        disabled={currentPage === totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">
                        Lignes par page:
                      </span>
                      <Select 
                        value={itemsPerPage.toString()} 
                        onValueChange={handleItemsPerPageChange}
                      >
                        <SelectTrigger className="w-[70px]">
                          <SelectValue placeholder={itemsPerPage} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {/* --- End Pagination Controls for Mobile --- */} 
              </div>
            </>
          )}
      </div>
    </div>
  );
};

export default CustomersListPage; 