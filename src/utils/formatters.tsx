
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// Format a date string to a human-readable format
export function formatDate(dateString: string): string {
  try {
    return format(parseISO(dateString), "d MMMM yyyy à HH:mm", { locale: fr });
  } catch (error) {
    return "Date invalide";
  }
}

// Format a price with currency symbol
export function formatPrice(price: string | number): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(numPrice);
}

// Get color for order status
export function getStatusColor(status: string): { bg: string; text: string } {
  switch (status) {
    case "completed":
      return { bg: "bg-green-100", text: "text-green-800" };
    case "processing":
      return { bg: "bg-blue-100", text: "text-blue-800" };
    case "pending":
      return { bg: "bg-amber-100", text: "text-amber-800" };
    case "on-hold":
      return { bg: "bg-orange-100", text: "text-orange-800" };
    case "cancelled":
      return { bg: "bg-red-100", text: "text-red-800" };
    case "refunded":
      return { bg: "bg-purple-100", text: "text-purple-800" };
    case "failed":
      return { bg: "bg-red-100", text: "text-red-800" };
    default:
      return { bg: "bg-gray-100", text: "text-gray-800" };
  }
}

// Translate order status to French
export function translateOrderStatus(status: string): string {
  const statusMap: Record<string, string> = {
    "completed": "Terminée",
    "processing": "En traitement",
    "pending": "En attente",
    "on-hold": "En attente de paiement",
    "cancelled": "Annulée",
    "refunded": "Remboursée",
    "failed": "Échouée",
  };
  
  return statusMap[status] || status;
}

// Generate readable order number
export function formatOrderNumber(id: number): string {
  return `#${id}`;
}

// Format customer name
export function formatCustomerName(firstName: string, lastName: string): string {
  return `${firstName} ${lastName}`;
}
