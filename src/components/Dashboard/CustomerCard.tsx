import { Link } from "react-router-dom";
import { Customer, Order, getAllOrders } from "@/lib/woocommerce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate } from "@/utils/formatters";
import { User, Mail, Calendar, DollarSign, Eye, ShoppingCart, Phone } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { getInitials } from "@/utils/getInitials";
import { useQuery } from "@tanstack/react-query";

// Define the enriched customer type expected by the card
interface EnrichedCustomer extends Customer {
  calculatedTotalOrders?: number;
  calculatedTotalSpent?: number;
  isOrdersLoading: boolean;
  ordersError?: Error | null;
}

interface CustomerCardProps {
  customer: EnrichedCustomer; // Use the enriched type
}

const CustomerCard = ({ customer }: CustomerCardProps) => {
  const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();

  // Fetch order data for this specific customer
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

  return (
    <Card className="mb-4 shadow-sm dark:bg-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar>
            <AvatarImage src={customer.avatar_url} alt={customerName} />
            <AvatarFallback>{getInitials(customer.first_name, customer.last_name)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{customerName || `Client #${customer.id}`}</CardTitle>
            {customer.email && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center pt-1">
                <Mail className="h-3 w-3 mr-1" /> {customer.email}
              </p>
            )}
            {customer.billing?.phone && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center pt-1">
                <Phone className="h-3 w-3 mr-1" /> {customer.billing?.phone || "N/A"}
              </p>
            )}
            {customer.date_created && (
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center pt-1">
                <Calendar className="h-3 w-3 mr-1" /> Client depuis le {formatDate(customer.date_created)}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4 border-t pt-4 dark:border-gray-700">
          {/* Order Count */}
          <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
            <ShoppingCart className="h-4 w-4" />
            <span>Commandes:</span>
          </div>
          <div className="text-right font-medium">
            {ordersLoading ? (
              <Skeleton className="h-5 w-8 ml-auto" />
            ) : (
              totalOrders
            )}
          </div>

          {/* Total Spent */}
          <div className="flex items-center space-x-1 text-gray-600 dark:text-gray-300">
            <DollarSign className="h-4 w-4" />
            <span>Total Dépensé:</span>
          </div>
          <div className="text-right font-medium">
            {ordersLoading ? (
              <Skeleton className="h-5 w-16 ml-auto" /> 
            ) : (
              formatPrice(totalSpent ?? 0)
            )}
          </div>
        </div>

        <Button asChild variant="outline" size="sm" className="w-full">
          <Link to={`/customer/${customer.id}`} className="flex items-center justify-center">
            <Eye className="h-4 w-4 mr-1" />
            Voir le Profil
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default CustomerCard; 