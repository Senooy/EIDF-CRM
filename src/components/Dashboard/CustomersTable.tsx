import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Customer } from "@/lib/woocommerce";
import { formatDate, formatPrice } from "@/utils/formatters";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, User, ShoppingCart, DollarSign } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Order, getAllOrders } from "@/lib/woocommerce";
import { getInitials } from "@/utils/getInitials";

// Define the enriched customer type expected by the table
interface EnrichedCustomer extends Customer {
  calculatedTotalOrders?: number;
  calculatedTotalSpent?: number;
  isOrdersLoading: boolean;
  ordersError?: Error | null;
}

interface CustomersTableProps {
  customers: EnrichedCustomer[]; // Use the enriched type
}

// New component for rendering each customer row with its own data fetching logic
const CustomerDataRow: React.FC<{ customer: EnrichedCustomer }> = ({ customer }) => {
  const navigate = useNavigate();

  const {
    data: customerOrders,
    isLoading: ordersLoading,
    // error: ordersError, // Optionally handle specific order loading errors
  } = useQuery<Order[], Error>({ // Explicitly type the query
    queryKey: ['woocommerce_customer_orders', customer.id], 
    queryFn: () => getAllOrders(customer.id), // Pass customer ID directly
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!customer.id, // Only run query if customer.id is available
  });

  const totalOrders = ordersLoading ? undefined : customerOrders?.length ?? 0;
  const totalSpent = ordersLoading
    ? undefined
    : customerOrders?.reduce((sum, order) => sum + parseFloat(order.total || "0"), 0) ?? 0;

  const handleRowClick = () => {
    navigate(`/customer/${customer.id}`);
  };

  return (
    <TableRow 
      key={customer.id} 
      onClick={handleRowClick} 
      className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer even:bg-slate-50 dark:even:bg-slate-800"
    >
      <TableCell className="font-medium">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={customer.avatar_url} alt={`${customer.first_name} ${customer.last_name}`} />
            <AvatarFallback>{getInitials(customer.first_name, customer.last_name)}</AvatarFallback>
          </Avatar>
          <div>
            {customer.first_name} {customer.last_name}
            {customer.username && <p className="text-xs text-gray-500">{customer.username}</p>}
          </div>
        </div>
      </TableCell>
      <TableCell>{customer.email}</TableCell>
      <TableCell className="hidden md:table-cell">{customer.billing?.phone || "N/A"}</TableCell>
      <TableCell className="text-center">
        {ordersLoading ? (
          <Skeleton className="h-5 w-10 inline-block" />
        ) : (
          totalOrders
        )}
      </TableCell>
      <TableCell className="text-right">
        {ordersLoading ? (
          <Skeleton className="h-5 w-20 inline-block" />
        ) : (
          `${totalSpent?.toFixed(2)} €`
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell text-center">{customer.date_created ? new Date(customer.date_created).toLocaleDateString() : "N/A"}</TableCell>
    </TableRow>
  );
};

const CustomersTable: React.FC<CustomersTableProps> = ({ customers }) => {
  if (!customers || customers.length === 0) {
    return <p className="text-center text-gray-500 py-8">Aucun client à afficher.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="pl-4">Client</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Nb. Commandes</TableHead>
            <TableHead className="text-right">Total Dépensé</TableHead>
            <TableHead>Date d'inscription</TableHead>
            <TableHead className="text-right pr-4">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <CustomerDataRow key={customer.id} customer={customer} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CustomersTable; 