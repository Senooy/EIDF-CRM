import { useQuery, useQueries } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

import { getRecentOrders, getOrderNotes, Order, OrderNote } from "@/lib/woocommerce";
import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatOrderNumber } from "@/utils/formatters";
import { ShoppingCart, MessageSquare, AlertCircle } from "lucide-react";

// Define a unified structure for activity items (same as in ActivityFeed)
interface ActivityItemBase {
  id: string | number;
  timestamp: Date;
  orderId: number;
}
interface NewOrderActivity extends ActivityItemBase { type: 'new_order'; order: Order; }
interface NoteAddedActivity extends ActivityItemBase { type: 'note_added'; note: OrderNote; }
type ActivityItem = NewOrderActivity | NoteAddedActivity;

// Number of orders to fetch for the modal view
const ORDERS_FOR_MODAL = 30;

const ActivityModalContent = ({ onClose }: { onClose: () => void }) => { // onClose might not be needed if Dialog handles it

  // 1. Fetch more recent orders for the modal
  const { data: recentOrders, isLoading: isLoadingOrders, error: ordersError } = useQuery<Order[]>({
    queryKey: ["woocommerce_recent_orders_modal", ORDERS_FOR_MODAL],
    queryFn: () => getRecentOrders(ORDERS_FOR_MODAL),
    staleTime: 1000 * 60, // Cache for 1 minute
  });

  // 2. Fetch notes for these orders
  const orderIds = recentOrders?.map(order => order.id) ?? [];
  const noteQueries = useQueries({
    queries: orderIds.map(orderId => ({
      queryKey: ["woocommerce_order_notes_modal", orderId], // Use different query key prefix
      queryFn: () => getOrderNotes(orderId),
      enabled: !!orderId,
      staleTime: 1000 * 60,
    })),
  });

  const isLoadingNotes = noteQueries.some(query => query.isLoading);
  const notesError = noteQueries.find(query => query.error)?.error;

  // 3. Combine and sort data
  let combinedActivities: ActivityItem[] = [];
  if (!isLoadingOrders && !isLoadingNotes && recentOrders) {
    combinedActivities = recentOrders.map(order => ({
      id: `modal-order-${order.id}`,
      type: 'new_order',
      timestamp: new Date(order.date_created),
      orderId: order.id,
      order: order,
    }));

    noteQueries.forEach((queryResult, index) => {
      if (queryResult.data) {
        const orderId = orderIds[index];
        queryResult.data.forEach(note => {
          combinedActivities.push({
            id: `modal-note-${note.id}`,
            type: 'note_added',
            timestamp: new Date(note.date_created),
            orderId: orderId,
            note: note,
          });
        });
      }
    });

    combinedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Render function (same as in ActivityFeed, maybe extract to a shared util later)
  const renderActivityItem = (item: ActivityItem) => {
    const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true, locale: fr });
    const linkPath = `/order/${item.orderId}`;

    switch (item.type) {
      case 'new_order':
        return (
          <div key={item.id} className="flex items-start space-x-3 p-3 border-b last:border-b-0">
             <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 ring-4 ring-white">
               <ShoppingCart className="h-4 w-4 text-green-600" />
             </span>
             <div className="flex-1 text-sm">
               <Link to={linkPath} className="font-medium text-gray-900 hover:underline" onClick={onClose}>
                 Commande {formatOrderNumber(item.orderId)}
               </Link>
               <span className="text-gray-600"> passée</span>
               <p className="mt-0.5 text-xs text-gray-500">{timeAgo}</p>
             </div>
           </div>
        );
      case 'note_added':
        const notePreview = item.note.note.length > 100 ? item.note.note.substring(0, 97) + '...' : item.note.note;
        return (
          <div key={item.id} className="flex items-start space-x-3 p-3 border-b last:border-b-0">
             <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${item.note.customer_note ? 'bg-blue-100' : 'bg-gray-100'} ring-4 ring-white`}>
               <MessageSquare className={`h-4 w-4 ${item.note.customer_note ? 'text-blue-600' : 'text-gray-600'}`} />
             </span>
             <div className="flex-1 text-sm">
               <span className="font-medium text-gray-900">{item.note.author}</span>
               <span className="text-gray-600"> a ajouté une {item.note.customer_note ? 'note client' : 'note privée'} à la </span>
               <Link to={linkPath} className="font-medium text-gray-900 hover:underline" onClick={onClose}>
                 Commande {formatOrderNumber(item.orderId)}
               </Link>
               <blockquote className="mt-1 pl-3 border-l-2 border-gray-200 text-xs text-gray-500 italic whitespace-pre-wrap">"{notePreview}"</blockquote>
               <p className="mt-0.5 text-xs text-gray-500">{timeAgo}</p>
             </div>
           </div>
        );
      default:
        return null;
    }
  };


  return (
     <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0"> 
        <DialogHeader className="p-6 pb-4 border-b"> 
           <DialogTitle>Toute l'activité récente</DialogTitle>
        </DialogHeader>
        {/* Scrollable content area */} 
        <div className="flex-1 overflow-y-auto">
            {(isLoadingOrders || isLoadingNotes) && (
               <div className="p-6 space-y-3"> {/* Add padding */} 
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
               </div>
            )}
            {(!isLoadingOrders && !isLoadingNotes && (ordersError || notesError)) && (
               <div className="p-6 text-red-600 flex items-center"> {/* Add padding */} 
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Erreur lors du chargement de l'activité.
               </div>
            )}
            {!isLoadingOrders && !isLoadingNotes && !ordersError && !notesError && combinedActivities.length === 0 && (
               <p className="p-6 text-sm text-gray-500">Aucune activité récente trouvée.</p> 
            )}
            {!isLoadingOrders && !isLoadingNotes && !ordersError && !notesError && combinedActivities.length > 0 && (
               <div className="divide-y"> {/* Use divide for separators */} 
                  {combinedActivities.map(renderActivityItem)}
               </div>
            )}
        </div>
     </DialogContent>
  );
};

export default ActivityModalContent;