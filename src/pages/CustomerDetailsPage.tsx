import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getCustomerById, Customer, Order, getAllOrders } from "@/lib/woocommerce-multi";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ArrowLeft, User, Mail, Phone, MapPin, ShoppingCart, Calendar, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OrdersTable from "@/components/Dashboard/OrdersTable"; // To display customer's orders
import { formatPrice, formatDate } from "@/utils/formatters";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/utils/getInitials";

// Helper to display address
const AddressDisplay = ({ address, type }: { address: Customer['billing'] | Customer['shipping'], type: string }) => {
  if (!address || !Object.values(address).some(val => val !== "")) {
    return <p className="text-sm text-gray-500">Aucune adresse {type} fournie.</p>;
  }
  // Type guard to safely access phone property only if it exists (on BillingAddress)
  const phone = type === 'de facturation' && 'phone' in address ? address.phone : null;

  return (
    <div className="text-sm">
      <p>{address.first_name} {address.last_name}</p>
      <p>{address.address_1}</p>
      {address.address_2 && <p>{address.address_2}</p>}
      <p>{address.postcode} {address.city}</p>
      <p>{address.country}</p>
      {phone && <p className="mt-1"><Phone className="inline h-4 w-4 mr-1 text-gray-600" /> {phone}</p>}
    </div>
  );
};

const CustomerDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const customerId = parseInt(id || "0");

  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: customerError,
  } = useQuery<Customer>({
    queryKey: ["woocommerce_customer", customerId],
    queryFn: () => getCustomerById(customerId),
    enabled: !!customerId, // Only run if customerId is valid
  });

  // Customer orders fetching - keep using getAllOrders for now since it's customer-specific
  const {
    data: customerOrders = [],
    isLoading: isLoadingOrders,
    error: ordersError
  } = useQuery<Order[]>({
    queryKey: ["woocommerce_customer_orders", customerId],
    queryFn: () => getAllOrders(customerId),
    enabled: !!customerId && !!customer,
    staleTime: 1000 * 60 * 5,
  });

  // Combine loading states
  const isLoading = isLoadingCustomer || (!!customer && isLoadingOrders);
  // Combine error states (prioritize customer error)
  const error = customerError || ordersError;

  // Calculate totals from fetched orders
  const totalOrders = customerOrders.length;
  const totalSpent = customerOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-8">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-64 md:col-span-1" />
              <Skeleton className="h-96 md:col-span-2" />
            </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-red-600 mb-2">
              {customerError ? "Erreur lors du chargement du client" : ordersError ? "Erreur lors du chargement des commandes" : "Client non trouvé"}
            </h2>
            <p className="text-gray-600 mb-6">
              {error ? (error as Error).message : "Impossible de trouver les détails pour ce client ou ses commandes."}
            </p>
            <Button asChild>
              <Link to="/customers"><ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste des clients</Link>
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
          <div className="mb-6">
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link to="/customers"><ArrowLeft className="mr-2 h-4 w-4" /> Clients</Link>
            </Button>
            <h1 className="text-2xl font-semibold text-gray-900">
              {customer.first_name} {customer.last_name} (#{customer.id})
            </h1>
            <p className="text-sm text-gray-600">{customer.email}</p>
          </div>

          {/* Use flex-col by default, switch to grid on md+ */}
          <div className="flex flex-col md:grid md:grid-cols-3 gap-6">
            {/* Customer Details Card - Ensure it takes full width on mobile */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center"><User className="mr-2 h-5 w-5" /> Informations Personnelles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Added Avatar */}
                <div className="flex items-center space-x-3 mb-4">
                   <Avatar className="h-12 w-12">
                     <AvatarImage src={customer.avatar_url} alt={`${customer.first_name} ${customer.last_name}`} />
                     <AvatarFallback className="text-lg">{getInitials(customer.first_name, customer.last_name)}</AvatarFallback>
                   </Avatar>
                   <div>
                     <p className="font-semibold">{customer.first_name} {customer.last_name}</p>
                     <p className="text-xs text-gray-500">ID: {customer.id}</p>
                   </div>
                 </div>
                 {/* Rest of the info */}
                <div className="text-sm border-t pt-3">
                  <p className="font-medium">Nom d'utilisateur:</p>
                  <p>{customer.username}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Date d'inscription:</p>
                  <p>{formatDate(customer.date_created)}</p>
                </div>
                 <div className="text-sm">
                  <p className="font-medium">Dernière modification:</p>
                  <p>{formatDate(customer.date_modified)}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Client payant:</p>
                  <p>{customer.is_paying_customer ? "Oui" : "Non"}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Nombre de commandes:</p>
                  <p>{isLoadingOrders ? <Skeleton className="h-4 w-8 inline-block" /> : totalOrders}</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium">Total dépensé:</p>
                  <p>{isLoadingOrders ? <Skeleton className="h-4 w-16 inline-block" /> : formatPrice(totalSpent)}</p>
                </div>
              </CardContent>
            </Card>

            {/* Addresses Card - Ensure it takes full width on mobile */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center"><MapPin className="mr-2 h-5 w-5" /> Adresses</CardTitle>
              </CardHeader>
              {/* Use flex-col by default for addresses, switch to grid on sm+ inside the card */}
              <CardContent className="flex flex-col sm:grid sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-md mb-2">Adresse de facturation</h3>
                  <AddressDisplay address={customer.billing} type="de facturation" />
                </div>
                <div>
                  <h3 className="font-semibold text-md mb-2">Adresse de livraison</h3>
                  <AddressDisplay address={customer.shipping} type="de livraison" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Customer Orders Section - Placeholder for now */}
          {/* 
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center"><ShoppingCart className="mr-2 h-5 w-5" /> Commandes du client</CardTitle>
              {/* Display count when data is available: ({customerOrders.length}) * /}
            </CardHeader>
            <CardContent>
              {/* 
              {isLoadingOrders && <p>Chargement des commandes...</p>}
              {ordersError && <p className="text-red-500">Erreur de chargement des commandes.</p>}
              {!isLoadingOrders && !ordersError && <OrdersTable orders={customerOrders} />}
              * /}
              <p className="text-sm text-gray-500">L'affichage des commandes spécifiques à ce client sera bientôt disponible.</p> 
            </CardContent>
          </Card>
           */}
    </div>
  );
};

export default CustomerDetailsPage; 