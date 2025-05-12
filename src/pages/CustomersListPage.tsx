import { useQuery } from "@tanstack/react-query";
import { Customer as WooCommerceCustomer, getAllCustomers, Order, getAllOrders } from "@/lib/woocommerce";
import CustomersTable from "@/components/Dashboard/CustomersTable";
import CustomerCard from "@/components/Dashboard/CustomerCard"; // Import the new card component
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { useMemo, useState, useEffect } from "react"; // Import useState, useEffect
import { formatPrice } from "@/utils/formatters"; // Import formatPrice
import { Input } from "@/components/ui/input"; // Import Input
import { Button } from "@/components/ui/button"; // Import Button
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Import Select components

const CustomersListPage = () => {
  // State for search term
  const [searchTerm, setSearchTerm] = useState("");
  // State for debounced search term
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default 10 items per page
  // --- End Pagination State ---

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    // Cleanup function
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  // Fetch ALL customers data (keep, but simplify queryFn if context isn't needed)
  const {
    data: allCustomers = [], // Initialize with empty array for safety
    isLoading: customersLoading,
    error: customersError,
    isSuccess: customersSuccess // Use isSuccess to check if data is available
  } = useQuery<WooCommerceCustomer[], Error>({ // Explicit types <TData, TError>
    queryKey: ["woocommerce_all_customers", { search: debouncedSearchTerm }],
    // Update queryFn if context isn't strictly necessary, pass filters directly
    queryFn: () => getAllCustomers({ search: debouncedSearchTerm }), // Simplified queryFn
    staleTime: 1000 * 60 * 5,
  });

  // --- Pagination Logic ---
  // Calculate total pages based on allCustomers directly
  const totalPages = Math.ceil((allCustomers?.length || 0) / itemsPerPage);

  // Paginate the allCustomers data
  const paginatedCustomers = useMemo(() => {
    // Ensure allCustomers is an array before slicing
    if (!Array.isArray(allCustomers)) {
        return [];
    }
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return allCustomers.slice(startIndex, endIndex);
    // Dependency is now just allCustomers, currentPage, and itemsPerPage
  }, [allCustomers, currentPage, itemsPerPage]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const handleItemsPerPageChange = (value: string) => {
    const newItemsPerPage = parseInt(value, 10);
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to page 1 when items per page changes
  };
  // --- End Pagination Logic ---

  // Simplify loading state: only depends on the main customer query now
  const isLoading = customersLoading;

  // Simplify error state: only depends on the main customer query now
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
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-4 md:p-6 bg-gray-50 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900">Clients</h1>
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
                         Page {currentPage} sur {totalPages}
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
        </main>
      </div>
    </div>
  );
};

export default CustomersListPage; 