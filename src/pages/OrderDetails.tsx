import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOrderById,
  updateOrderStatus,
  getOrderNotes,
  createOrderNote,
  createRefund,
  Order as WooCommerceOrder,
  OrderNote,
  RefundPayload,
} from "@/lib/woocommerce";
import { formatDate, formatOrderNumber, formatPrice } from "@/utils/formatters";
import OrderStatusBadge from "@/components/Dashboard/OrderStatusBadge";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ArrowLeft,
  Printer,
  Truck,
  CheckCircle,
  XCircle,
  RefreshCw,
  MessageSquarePlus,
  Send,
  User,
  FileText,
  DollarSign,
  AlertCircle,
  Undo2
} from "lucide-react";

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = parseInt(id || "0");
  const queryClient = useQueryClient();
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [isCustomerNote, setIsCustomerNote] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [restockItems, setRestockItems] = useState<boolean>(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  
  // Fetch order data
  const { data: order, isLoading, error } = useQuery<WooCommerceOrder>({
    queryKey: ["woocommerce_order", orderId],
    queryFn: () => getOrderById(orderId),
    enabled: !!orderId,
  });
  
  // Fetch order notes
  const { data: notes, isLoading: isLoadingNotes } = useQuery<OrderNote[]>({
    queryKey: ["woocommerce_order_notes", orderId],
    queryFn: () => getOrderNotes(orderId),
    enabled: !!orderId,
  });

  useEffect(() => {
    if (!orderId) {
      navigate("/");
    }
  }, [orderId, navigate]);

  // Mutation for updating order status
  const { mutate: updateStatusMutation, isPending: isUpdatingStatus } = useMutation({
    mutationFn: ({ orderId, status }: { orderId: number; status: string }) => 
      updateOrderStatus(orderId, status),
    onMutate: ({ status }) => {
      setUpdatingStatus(status);
    },
    onSuccess: (updatedOrder) => {
      toast.success(`Commande marquée comme ${updatedOrder.status}.`);
      queryClient.invalidateQueries({ queryKey: ["woocommerce_order", orderId] });
    },
    onError: (error) => {
      toast.error(`Échec de la mise à jour du statut: ${error.message}`);
    },
    onSettled: () => {
       setUpdatingStatus(null);
    }
  });

  const handleStatusUpdate = async (newStatus: string) => {
    if (!orderId) return;
    updateStatusMutation({ orderId, status: newStatus });
  };

  // Mutation for adding an order note
  const { mutate: addNoteMutation, isPending: isAddingNote } = useMutation({
    mutationFn: ({ orderId, note, customer_note }: { orderId: number; note: string; customer_note: boolean }) =>
      createOrderNote(orderId, { note, customer_note }),
    onSuccess: (newNoteData) => {
      toast.success("Note ajoutée avec succès.");
      setNewNote("");
      setIsCustomerNote(false);
      queryClient.invalidateQueries({ queryKey: ["woocommerce_order_notes", orderId] });
      // Optionally update the cache directly
      // queryClient.setQueryData(["woocommerce_order_notes", orderId], (oldNotes = []) => [...oldNotes, newNoteData]);
    },
    onError: (error) => {
      toast.error(`Échec de l'ajout de la note: ${error.message}`);
    },
  });

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !newNote.trim()) {
      toast.warning("Veuillez écrire une note.");
      return;
    }
    addNoteMutation({ orderId, note: newNote, customer_note: isCustomerNote });
  };

  const handlePrintInvoice = async () => {
    toast.success("Préparation de la facture pour impression...");
    // In a real app, this would generate and download a PDF
  };

  const handleBackToList = () => {
    navigate("/");
  };

  // Mutation for creating a refund
  const { mutate: refundMutation, isPending: isRefunding } = useMutation({
    mutationFn: (refundData: RefundPayload) => createRefund(orderId, refundData),
    onSuccess: (refundResponse) => {
      toast.success(`Remboursement de ${formatPrice(refundResponse.amount)} créé.`);
      setIsRefundModalOpen(false);
      setRefundAmount("");
      setRefundReason("");
      setRestockItems(false);
      setRefundError(null);
      // Invalidate relevant queries to refetch data
      queryClient.invalidateQueries({ queryKey: ["woocommerce_order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["woocommerce_order_notes", orderId] }); // Refunds often create notes
    },
    onError: (error) => {
      toast.error(`Échec de la création du remboursement: ${error.message}`);
      setRefundError(error.message || "Une erreur inconnue s'est produite.");
    },
  });

  const handleRefundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setRefundError(null);
    const amount = parseFloat(refundAmount);

    if (isNaN(amount) || amount <= 0) {
      setRefundError("Veuillez entrer un montant de remboursement valide.");
      return;
    }
    if (order && amount > parseFloat(order.total)) {
       setRefundError("Le montant du remboursement ne peut pas dépasser le total de la commande.");
       return;
    }

    const payload: RefundPayload = {
      amount: refundAmount,
      reason: refundReason || undefined,
      api_restock: restockItems,
      // api_refund: true, // Optionally try to process via gateway - depends on setup
    };
    refundMutation(payload);
  };

  if (isLoading || !order) {
    return (
      <div className="container mx-auto px-6 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-1/4"></div>
              <div className="h-64 bg-gray-200 rounded-xl"></div>
              <div className="h-96 bg-gray-200 rounded-xl"></div>
            </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
              <Button variant="ghost" onClick={handleBackToList} className="mr-2">
                <ArrowLeft className="h-5 w-5 mr-1" />
                Retour
              </Button>
              <h1 className="text-2xl font-semibold text-gray-900">
                Commande {formatOrderNumber(order.id)}
              </h1>
              <OrderStatusBadge status={order.status} />
            </div>
            
            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-2 sm:space-y-0">
              <Button variant="outline" onClick={handlePrintInvoice} className="w-full sm:w-auto">
                <Printer className="h-5 w-5 mr-2" />
                Facture
              </Button>
              {order.status === "processing" && (
                <Button 
                  onClick={() => handleStatusUpdate("completed")} 
                  disabled={isUpdatingStatus} 
                  className="w-full sm:w-auto"
                >
                  {updatingStatus === 'completed' ? <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                  Marquer comme terminée
                </Button>
              )}
              {order.status === "pending" && (
                <Button 
                  onClick={() => handleStatusUpdate("processing")} 
                  disabled={isUpdatingStatus} 
                  className="w-full sm:w-auto"
                >
                   {updatingStatus === 'processing' ? <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> : <Truck className="h-5 w-5 mr-2" />}
                  Marquer en traitement
                </Button>
              )}
              {order.status !== "cancelled" && order.status !== "refunded" && (
                <Button 
                  variant="destructive" 
                  onClick={() => handleStatusUpdate("cancelled")} 
                  disabled={isUpdatingStatus} 
                  className="w-full sm:w-auto"
                >
                  {updatingStatus === 'cancelled' ? <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> : <XCircle className="h-5 w-5 mr-2" />}
                  Annuler
                </Button>
              )}
              {order.status === "cancelled" && (
                <Button 
                  onClick={() => handleStatusUpdate("pending")} 
                  disabled={isUpdatingStatus} 
                  className="w-full sm:w-auto"
                 >
                  {updatingStatus === 'pending' ? <RefreshCw className="h-5 w-5 mr-2 animate-spin" /> : <RefreshCw className="h-5 w-5 mr-2" />}
                  Rétablir
                </Button>
              )}
              {order.status !== 'cancelled' && order.status !== 'refunded' && order.status !== 'failed' && (
                <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}> 
                  <DialogTrigger asChild>
                    <Button variant="secondary" className="w-full sm:w-auto">
                      <Undo2 className="h-5 w-5 mr-2" />
                      Rembourser
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Rembourser la commande {formatOrderNumber(order.id)}</DialogTitle>
                      <DialogDescription>
                        Entrez les détails du remboursement. Le total de la commande est {formatPrice(order.total)}.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRefundSubmit}>
                      <div className="grid gap-4 py-4">
                        {refundError && (
                          <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>Erreur</AlertTitle>
                            <AlertDescription>{refundError}</AlertDescription>
                          </Alert>
                        )}
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="refundAmount" className="text-right">
                            Montant
                          </Label>
                          <div className="col-span-3 relative">
                            <DollarSign className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <Input
                              id="refundAmount"
                              type="number"
                              step="0.01"
                              min="0.01"
                              max={order.total}
                              placeholder="0.00"
                              value={refundAmount}
                              onChange={(e) => setRefundAmount(e.target.value)}
                              required
                              className="pl-7"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <Label htmlFor="refundReason" className="text-right">
                            Raison
                          </Label>
                          <Input
                            id="refundReason"
                            value={refundReason}
                            onChange={(e) => setRefundReason(e.target.value)}
                            className="col-span-3"
                            placeholder="(Optionnel)"
                          />
                        </div>
                        <div className="col-span-4 flex items-center space-x-2 justify-end">
                          <Checkbox 
                            id="restockItems"
                            checked={restockItems} 
                            onCheckedChange={(checked) => setRestockItems(Boolean(checked))} 
                          />
                          <Label htmlFor="restockItems" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            Restocker les articles ?
                          </Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsRefundModalOpen(false)}>Annuler</Button>
                        <Button type="submit" disabled={isRefunding}>
                          {isRefunding ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Créer le remboursement
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Summary */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Détails de la commande</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Date de commande</p>
                      <p className="mt-1">{formatDate(order.date_created)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Méthode de paiement</p>
                      <p className="mt-1">{order.payment_method_title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total</p>
                      <p className="mt-1 text-lg font-medium">{formatPrice(order.total)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Livraison</p>
                      <p className="mt-1">
                        {order.shipping_lines && order.shipping_lines[0]?.method_title || "N/A"} - 
                        {formatPrice(order.shipping_lines && order.shipping_lines[0]?.total || "0")}
                      </p>
                    </div>
                  </div>

                  <Separator />
                  
                  {/* Products */}
                  <div>
                    <h3 className="font-medium mb-4">Produits</h3>
                    <div className="space-y-4">
                      {order.line_items && order.line_items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center border-b border-gray-100 pb-2">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">Quantité: {item.quantity}</p>
                          </div>
                          <p className="font-medium">{formatPrice(item.total)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informations client</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Client</p>
                    <p className="mt-1 font-medium">
                      {`${order.billing.first_name} ${order.billing.last_name}`}
                    </p>
                    <p className="text-sm">{order.billing.email}</p>
                    {order.billing.phone && (
                      <p className="text-sm">{order.billing.phone}</p>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Adresse de facturation</p>
                    <address className="not-italic text-sm">
                      {order.billing.address_1}<br />
                      {order.billing.address_2 && <>{order.billing.address_2}<br /></>}
                      {order.billing.postcode} {order.billing.city}<br />
                      {order.billing.state && <>{order.billing.state}<br /></>}
                      {order.billing.country}
                    </address>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-2">Adresse de livraison</p>
                    <address className="not-italic text-sm">
                      {order.shipping.first_name} {order.shipping.last_name}<br />
                      {order.shipping.address_1}<br />
                      {order.shipping.address_2 && <>{order.shipping.address_2}<br /></>}
                      {order.shipping.postcode} {order.shipping.city}<br />
                      {order.shipping.state && <>{order.shipping.state}<br /></>}
                      {order.shipping.country}
                    </address>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Notes */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MessageSquarePlus className="h-6 w-6 mr-2" />
                  Notes de commande
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddNote} className="mb-6 space-y-3">
                  <Textarea
                    placeholder="Ajouter une note à la commande..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    rows={3}
                    disabled={isAddingNote}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="customer_note"
                        checked={isCustomerNote} 
                        onCheckedChange={(checked) => setIsCustomerNote(Boolean(checked))}
                        disabled={isAddingNote}
                      />
                      <Label htmlFor="customer_note" className="text-sm font-medium text-gray-700">
                        Note pour le client ?
                      </Label>
                    </div>
                    <Button type="submit" disabled={isAddingNote || !newNote.trim()} size="sm">
                      {isAddingNote ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Ajouter la note
                    </Button>
                  </div>
                </form>
                
                {isLoadingNotes && <p>Chargement des notes...</p>}
                {error && <p className="text-red-500">Erreur de chargement des notes.</p>}
                {notes && notes.length > 0 ? (
                  <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                    {notes.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime()).map((note) => (
                      <div key={note.id} className={`p-3 rounded-lg border ${note.customer_note ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center text-sm font-medium">
                            {note.customer_note ? 
                              <User className="h-4 w-4 mr-1.5 text-blue-600" /> : 
                              <FileText className="h-4 w-4 mr-1.5 text-gray-600" />}
                            {note.author} ( {note.customer_note ? "Note au client" : "Note privée"} )
                          </div>
                          <p className="text-xs text-gray-500">{formatDate(note.date_created)}</p>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  !isLoadingNotes && <p className="text-sm text-gray-500">Aucune note pour cette commande.</p>
                )}
              </CardContent>
            </Card>

          </div>
    </div>
  );
};

export default OrderDetails;
