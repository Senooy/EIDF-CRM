
import { getStatusColor, translateOrderStatus } from "@/utils/formatters";

interface OrderStatusBadgeProps {
  status: string;
  className?: string;
}

const OrderStatusBadge = ({ status, className = "" }: OrderStatusBadgeProps) => {
  const { bg, text } = getStatusColor(status);
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bg} ${text} ${className}`}>
      {translateOrderStatus(status)}
    </span>
  );
};

export default OrderStatusBadge;
