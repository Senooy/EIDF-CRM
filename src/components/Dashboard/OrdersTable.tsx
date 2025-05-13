import { useState, useMemo, useEffect } from "react";
import { formatDate, formatOrderNumber, formatPrice } from "@/utils/formatters";
import OrderStatusBadge from "./OrderStatusBadge";
import {
  Order as WooCommerceOrder,
  getOrdersPage,
  PaginatedOrdersResponse,
  OrderFilters
} from "@/lib/woocommerce";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, Calendar as CalendarIcon, X } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { DateRange } from "react-day-picker";
import { addDays, format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";

// Objet de mapping pour les traductions des statuts
const statusTranslations: { [key: string]: string } = {
  "pending": "En attente de paiement",
  "processing": "En cours",
  "on-hold": "En attente",
  "completed": "Terminée",
  "cancelled": "Annulée",
  "refunded": "Remboursée",
  "failed": "Échouée",
  // Ajoutez d'autres statuts au besoin
};

const getStatusTranslation = (status: string): string => {
  return statusTranslations[status.toLowerCase()] || status;
};

interface OrdersTableProps {
  isLoading?: boolean;
  itemsPerPage?: number;
}

const OrdersTable = ({ isLoading: initialLoading = false, itemsPerPage = 10 }: OrdersTableProps) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [minTotal, setMinTotal] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: 'id' | 'date' | 'total' | "customer";
    direction: "asc" | "desc";
  }>({ key: "date", direction: "desc" });
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Fetch data using react-query
  const queryKey = useMemo(() => [
    'woocommerce_orders_page',
    currentPage,
    itemsPerPage,
    statusFilter,
    searchQuery,
    dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
    sortConfig.key,
    sortConfig.direction,
  ], [currentPage, itemsPerPage, statusFilter, searchQuery, dateRange, sortConfig]);

  const { data, isLoading, error } = useQuery<PaginatedOrdersResponse>({
    queryKey: queryKey,
    queryFn: () => {
      const filters: OrderFilters = {
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        date_min: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
        date_max: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
        orderby: (sortConfig.key !== 'customer' ? sortConfig.key : 'date') as 'id' | 'date' | 'total',
        order: sortConfig.direction,
      };
      return getOrdersPage(currentPage, itemsPerPage, filters);
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 1,
  });

  // Extract data and pagination info
  const ordersOnPage = data?.orders ?? [];
  const totalOrders = data?.totalOrders ?? 0;
  const totalPages = data?.totalPages ?? 0;

  // Client-side filtering (apply AFTER fetching the page) for filters not supported by API
  const clientFilteredOrders = useMemo(() => {
    let result = [...ordersOnPage];

    // Apply client filter (example - refine as needed)
    if (clientFilter) {
      const clientQuery = clientFilter.toLowerCase();
      result = result.filter(order =>
        `${order.billing.first_name} ${order.billing.last_name}`.toLowerCase().includes(clientQuery) ||
        order.billing.email.toLowerCase().includes(clientQuery)
      );
    }

    // Apply total filter
    const min = parseFloat(minTotal);
    const max = parseFloat(maxTotal);
    if (!isNaN(min)) {
      result = result.filter(order => parseFloat(order.total) >= min);
    }
    if (!isNaN(max)) {
      result = result.filter(order => parseFloat(order.total) <= max);
    }

    // Apply client-side sorting ONLY if key is 'customer'
    if (sortConfig.key === 'customer') {
      result.sort((a, b) => {
        const aValue = `${a.billing.first_name} ${a.billing.last_name}`.toLowerCase();
        const bValue = `${b.billing.first_name} ${b.billing.last_name}`.toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [ordersOnPage, clientFilter, minTotal, maxTotal, sortConfig]);

  // Réinitialiser la page actuelle lorsque les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, clientFilter, dateRange, minTotal, maxTotal, itemsPerPage, sortConfig]);

  const handleSort = (key: 'id' | 'date' | 'total' | "customer") => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleOrderClick = (id: number) => {
    navigate(`/orders/${id}`);
  };

  // Calculate display range based on current page and actual items received
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + clientFilteredOrders.length;

  // TODO: Get statuses dynamically or use a predefined list if API for distinct statuses isn't available
  const uniqueStatuses = [
    "pending",
    "processing",
    "on-hold",
    "completed",
    "cancelled",
    "refunded",
    "failed",
  ];

  if (initialLoading) {
    return (
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-medium text-gray-900">Commandes récentes</h2>
        
        {/* Filters row */}
        <div className="mt-4 flex flex-col space-y-4">
          {/* Ligne 1: Recherche globale et Statut */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Recherche globale..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50"
              />
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 bg-gray-50">
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {uniqueStatuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {getStatusTranslation(status)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ligne 2: Client, Date, Montant */}
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            {/* Filtre Client */}
            <div className="relative w-full sm:w-64">
              <Input
                placeholder="Filtrer par client..."
                value={clientFilter}
                onChange={e => setClientFilter(e.target.value)}
                className="pl-10 bg-gray-50"
              />
              <Search className="h-4 w-4 text-gray-400 absolute left-3 top-3" />
            </div>

            {/* Filtre Date */}
            <div className={cn("flex items-center gap-2")}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                      "w-full sm:w-[260px] justify-start text-left font-normal bg-gray-50",
                      !dateRange && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd, y")} -{" "}
                          {format(dateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Choisir une plage de dates</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
              {dateRange && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDateRange(undefined)}
                  className="h-9 w-9 p-0"
                  aria-label="Effacer la date"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Filtre Montant */}
            <div className="flex gap-2 items-center">
              <Input
                type="number"
                placeholder="Min €"
                value={minTotal}
                onChange={e => setMinTotal(e.target.value)}
                className="w-24 bg-gray-50"
                min="0"
              />
              <span>-</span>
              <Input
                type="number"
                placeholder="Max €"
                value={maxTotal}
                onChange={e => setMaxTotal(e.target.value)}
                className="w-24 bg-gray-50"
                min="0"
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Responsive Layout: Table for medium screens and up, Cards for smaller screens */}
      {/* Table View (md and up) */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("id")}
              >
                <div className="flex items-center">
                  <span>ID</span>
                  {sortConfig.key === "id" && (
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("date")}
              >
                <div className="flex items-center">
                  <span>Date</span>
                  {sortConfig.key === "date" && (
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("customer")}
              >
                <div className="flex items-center">
                  <span>Client</span>
                  {sortConfig.key === "customer" && (
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead>Statut</TableHead>
              <TableHead 
                className="cursor-pointer text-right"
                onClick={() => handleSort("total")}
              >
                <div className="flex items-center justify-end">
                  <span>Total</span>
                  {sortConfig.key === "total" && (
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !initialLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-red-500">
                  Erreur lors du chargement des commandes.
                </TableCell>
              </TableRow>
            ) : clientFilteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              clientFilteredOrders.map(order => (
                <TableRow key={order.id} className="hover:bg-gray-50">
                  <TableCell>{formatOrderNumber(order.id)}</TableCell>
                  <TableCell>{formatDate(order.date_created)}</TableCell>
                  <TableCell>
                    <div>
                      <div>{`${order.billing.first_name} ${order.billing.last_name}`}</div>
                      <div className="text-xs text-gray-500">{order.billing.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={order.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatPrice(order.total)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => handleOrderClick(order.id)}
                      className="text-xs h-8"
                    >
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Card View (below md) */}
      <div className="md:hidden p-4 space-y-4">
        {isLoading && !initialLoading ? (
          <p className="text-center py-10 text-gray-500">Chargement...</p>
        ) : error ? (
          <p className="text-center py-10 text-red-500">Erreur lors du chargement.</p>
        ) : clientFilteredOrders.length === 0 ? (
          <p className="text-center py-10 text-gray-500">Aucune commande trouvée</p>
        ) : (
          clientFilteredOrders.map(order => (
            <Card key={order.id} className="overflow-hidden">
              <CardHeader className="p-4 bg-gray-50 border-b">
                 <div className="flex justify-between items-center">
                   <CardTitle className="text-base">Commande {formatOrderNumber(order.id)}</CardTitle>
                   <OrderStatusBadge status={order.status} />
                 </div>
              </CardHeader>
              <CardContent className="p-4 text-sm space-y-2">
                 <div className="flex justify-between">
                   <span className="text-gray-500">Client:</span>
                   <span className="font-medium text-right">{`${order.billing.first_name} ${order.billing.last_name}`}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-gray-500">Date:</span>
                    <span>{formatDate(order.date_created)}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-gray-500">Total:</span>
                   <span className="font-semibold">{formatPrice(order.total)}</span>
                 </div>
              </CardContent>
              <CardFooter className="p-4 border-t bg-gray-50">
                 <Button
                    variant="outline"
                    onClick={() => handleOrderClick(order.id)}
                    className="w-full"
                  >
                    Voir les détails
                  </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Affichage de {clientFilteredOrders.length > 0 ? startIndex + 1 : 0} à {endIndex} sur {totalOrders} commandes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Précédent
            </Button>
            <span>
              Page {currentPage} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Suivant
            </Button>
          </div>
        </div>
      )}

    </div>
  );
};

export default OrdersTable;
