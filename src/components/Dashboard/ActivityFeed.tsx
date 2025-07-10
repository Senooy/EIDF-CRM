import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale'; // Import French locale for formatting
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // Import Dialog components
import { Button } from "@/components/ui/button"; // Import Button
import { useState } from "react";
import ActivityModalContent from "@/components/Dashboard/ActivityModalContent"; // Added import

import { getRecentOrdersWithNotes, Order, OrderNote } from "@/lib/woocommerce-multi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton"; // For loading state
import { formatOrderNumber } from "@/utils/formatters";
import { ShoppingCart, MessageSquare, AlertCircle } from "lucide-react";

// Define a unified structure for activity items
interface ActivityItemBase {
  id: string | number; // Unique key for mapping (order id or note id)
  timestamp: Date;
  orderId: number;
}

interface NewOrderActivity extends ActivityItemBase {
  type: 'new_order';
  order: Order;
}

interface NoteAddedActivity extends ActivityItemBase {
  type: 'note_added';
  note: OrderNote;
}

type ActivityItem = NewOrderActivity | NoteAddedActivity;

const ActivityFeed = ({ numberOfOrders = 5 }: { numberOfOrders?: number }) => {

  // State for modal visibility
  const [isModalOpen, setIsModalOpen] = useState(false); 

  // Fetch recent orders with notes in a single query
  const { data: ordersWithNotes, isLoading: isLoadingOrders, error: ordersError } = useQuery({
    queryKey: ["woocommerce_recent_orders_with_notes", numberOfOrders],
    queryFn: () => getRecentOrdersWithNotes(numberOfOrders),
    staleTime: 1000 * 60 * 2, // Cache for 2 minutes
  });

  const isLoadingNotes = false; // No separate notes loading anymore
  const notesError = null; // No separate notes errors

  // 3. Combine and sort data once everything is loaded
  let combinedActivities: ActivityItem[] = [];
  if (!isLoadingOrders && ordersWithNotes) {
    // Process orders with their notes
    ordersWithNotes.forEach((orderWithNotes) => {
      // OrderWithNotes has the structure where order has notes property
      const order = orderWithNotes;
      const notes = order.notes || [];
      
      // Add order as 'new_order' activity
      combinedActivities.push({
        id: `order-${order.id}`,
        type: 'new_order',
        timestamp: new Date(order.date_created),
        orderId: order.id,
        order: order,
      });

      // Add notes as 'note_added' activities
      notes.forEach(note => {
        combinedActivities.push({
          id: `note-${note.id}`,
          type: 'note_added',
          timestamp: new Date(note.date_created),
          orderId: order.id,
          note: note,
        });
      });
    });

    // Sort combined activities by timestamp, most recent first
    combinedActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  const renderActivityItem = (item: ActivityItem) => {
    const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true, locale: fr });
    const linkPath = `/order/${item.orderId}`;

    switch (item.type) {
      case 'new_order':
        return (
          <div key={item.id} className="flex items-start space-x-3">
            <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-green-100 ring-4 ring-white">
              <ShoppingCart className="h-4 w-4 text-green-600" />
            </span>
            <div className="flex-1 text-sm">
              <Link to={linkPath} className="font-medium text-gray-900 hover:underline">
                Commande {formatOrderNumber(item.orderId)}
              </Link>
              <span className="text-gray-600"> passée</span>
              <p className="mt-0.5 text-xs text-gray-500">{timeAgo}</p>
            </div>
          </div>
        );
      case 'note_added':
        // Simple check to avoid showing overly long notes
        const notePreview = item.note.note.length > 70 ? item.note.note.substring(0, 67) + '...' : item.note.note;
        return (
          <div key={item.id} className="flex items-start space-x-3">
            <span className={`mt-1 flex h-8 w-8 items-center justify-center rounded-full ${item.note.customer_note ? 'bg-blue-100' : 'bg-gray-100'} ring-4 ring-white`}>
              <MessageSquare className={`h-4 w-4 ${item.note.customer_note ? 'text-blue-600' : 'text-gray-600'}`} />
            </span>
            <div className="flex-1 text-sm">
              <span className="font-medium text-gray-900">{item.note.author}</span>
              <span className="text-gray-600"> a ajouté une {item.note.customer_note ? 'note client' : 'note privée'} à la </span>
              <Link to={linkPath} className="font-medium text-gray-900 hover:underline">
                Commande {formatOrderNumber(item.orderId)}
              </Link>
              <blockquote className="mt-1 pl-3 border-l-2 border-gray-200 text-xs text-gray-500 italic">"{notePreview}"</blockquote>
              <p className="mt-0.5 text-xs text-gray-500">{timeAgo}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="h-full flex flex-col"> {/* Added h-full and flex */} 
      <CardHeader className="flex flex-row items-center justify-between pb-2"> {/* Flex layout for header */} 
        <CardTitle>Activité récente</CardTitle>
        {/* Add a button to trigger the modal */} 
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
             <Button variant="outline" size="sm">Tout voir</Button>
          </DialogTrigger>
          {/* Render modal content when open (implementation comes next) */} 
          {isModalOpen && <ActivityModalContent onClose={() => setIsModalOpen(false)} />} 
        </Dialog>
      </CardHeader>
      {/* Make content area scrollable and take remaining space */}
      <CardContent className="flex-1 overflow-y-auto"> 
        <div className="space-y-4 pt-4"> {/* Add padding top back */} 
          {(isLoadingOrders || isLoadingNotes) && (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          )}

          {(!isLoadingOrders && !isLoadingNotes && (ordersError || notesError)) && (
            <div className="text-red-600 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Erreur lors du chargement de l'activité.
            </div>
          )}

          {!isLoadingOrders && !isLoadingNotes && !ordersError && !notesError && combinedActivities.length === 0 && (
            <p className="text-sm text-gray-500">Aucune activité récente trouvée.</p>
          )}

          {!isLoadingOrders && !isLoadingNotes && !ordersError && !notesError && combinedActivities.length > 0 && (
             combinedActivities.slice(0, 4).map(renderActivityItem)
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed; 