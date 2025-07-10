import { useState, useMemo, useEffect } from "react";
import { formatDate, formatOrderNumber, formatPrice } from "@/utils/formatters";
import OrderStatusBadge from "./OrderStatusBadge";
import { Order as WooCommerceOrder } from "@/lib/woocommerce";
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
  orders: WooCommerceOrder[];
  isLoading?: boolean;
  itemsPerPage?: number;
}

const OrdersTable = ({ orders, isLoading = false, itemsPerPage = 10 }: OrdersTableProps) => {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [clientFilter, setClientFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [minTotal, setMinTotal] = useState<string>("");
  const [maxTotal, setMaxTotal] = useState<string>("");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof WooCommerceOrder | "customer";
    direction: "asc" | "desc";
  }>({ key: "date_created", direction: "desc" });
  const [currentPage, setCurrentPage] = useState<number>(1);
  const internalItemsPerPage = itemsPerPage || 10;

  const filteredAndSortedOrders = useMemo(() => {
    let result = [...orders];
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(order => order.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        order => 
          order.id.toString().includes(query) ||
          order.billing.first_name.toLowerCase().includes(query) ||
          order.billing.last_name.toLowerCase().includes(query) ||
          order.billing.email.toLowerCase().includes(query)
      );
    }
    
    // Apply client filter
    if (clientFilter) {
      const clientQuery = clientFilter.toLowerCase();
      result = result.filter(order =>
        `${order.billing.first_name} ${order.billing.last_name}`.toLowerCase().includes(clientQuery) ||
        order.billing.email.toLowerCase().includes(clientQuery)
      );
    }
    
    // Apply date range filter
    if (dateRange?.from) {
      const startDate = dateRange.from.setHours(0, 0, 0, 0);
      result = result.filter(order => {
        const orderDate = parseISO(order.date_created).getTime();
        return orderDate >= startDate;
      });
    }
    if (dateRange?.to) {
      const endDate = dateRange.to.setHours(23, 59, 59, 999);
      result = result.filter(order => {
        const orderDate = parseISO(order.date_created).getTime();
        return orderDate <= endDate;
      });
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
    
    // Sort orders
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      if (sortConfig.key === "customer") {
        aValue = `${a.billing.first_name} ${a.billing.last_name}`.toLowerCase();
        bValue = `${b.billing.first_name} ${b.billing.last_name}`.toLowerCase();
      } else if (sortConfig.key === "date_created") {
        aValue = new Date(a.date_created).getTime();
        bValue = new Date(b.date_created).getTime();
      } else if (sortConfig.key === "total") {
        aValue = parseFloat(a.total);
        bValue = parseFloat(b.total);
      } else {
         if (sortConfig.key in a && sortConfig.key in b) {
            aValue = a[sortConfig.key as keyof WooCommerceOrder];
            bValue = b[sortConfig.key as keyof WooCommerceOrder];
         } else {
             aValue = 0;
             bValue = 0;
         }
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
    
    return result;
  }, [orders, statusFilter, searchQuery, clientFilter, dateRange, minTotal, maxTotal, sortConfig]);

  // Calculer les commandes pour la page actuelle
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * internalItemsPerPage;
    const endIndex = startIndex + internalItemsPerPage;
    return filteredAndSortedOrders.slice(startIndex, endIndex);
  }, [filteredAndSortedOrders, currentPage, internalItemsPerPage]);

  // Calculer le nombre total de pages
  const totalPages = useMemo(() => {
    return Math.ceil(filteredAndSortedOrders.length / internalItemsPerPage);
  }, [filteredAndSortedOrders, internalItemsPerPage]);

  // Réinitialiser la page actuelle lorsque les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchQuery, clientFilter, dateRange, minTotal, maxTotal, internalItemsPerPage]);

  const handleSort = (key: keyof WooCommerceOrder | "customer") => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleOrderClick = (id: number) => {
    navigate(`/orders/${id}`);
  };

  // Calculer le nombre d'éléments à afficher
  const startIndex = (currentPage - 1) * internalItemsPerPage;
  const endIndex = Math.min(startIndex + internalItemsPerPage, filteredAndSortedOrders.length);

  const uniqueStatuses = Array.from(new Set(orders.map(order => order.status)));

  if (isLoading) {
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
                  <span>Commande</span>
                  {sortConfig.key === "id" && (
                    <ArrowUpDown className="ml-1 h-4 w-4" />
                  )}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer"
                onClick={() => handleSort("date_created")}
              >
                <div className="flex items-center">
                  <span>Date</span>
                  {sortConfig.key === "date_created" && (
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
            {paginatedOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            ) : (
              paginatedOrders.map(order => (
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
        {paginatedOrders.length === 0 ? (
          <p className="text-center py-10 text-gray-500">Aucune commande trouvée</p>
        ) : (
          paginatedOrders.map(order => (
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
            Affichage de {startIndex + 1} à {endIndex} sur {filteredAndSortedOrders.length} commandes
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
