import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Send, 
  CheckCircle, 
  Pause, 
  XCircle, 
  FileText,
  Calendar 
} from 'lucide-react';

interface CampaignStatusBadgeProps {
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'CANCELLED';
  className?: string;
}

export default function CampaignStatusBadge({ status, className = '' }: CampaignStatusBadgeProps) {
  const getStatusConfig = (status: CampaignStatusBadgeProps['status']) => {
    switch (status) {
      case 'DRAFT':
        return {
          variant: 'secondary' as const,
          icon: FileText,
          text: 'Brouillon',
          className: 'bg-gray-100 text-gray-700 border-gray-200'
        };
      case 'SCHEDULED':
        return {
          variant: 'secondary' as const,
          icon: Calendar,
          text: 'Programmée',
          className: 'bg-blue-100 text-blue-700 border-blue-200'
        };
      case 'SENDING':
        return {
          variant: 'secondary' as const,
          icon: Send,
          text: 'En cours',
          className: 'bg-yellow-100 text-yellow-700 border-yellow-200 animate-pulse'
        };
      case 'SENT':
        return {
          variant: 'secondary' as const,
          icon: CheckCircle,
          text: 'Envoyée',
          className: 'bg-green-100 text-green-700 border-green-200'
        };
      case 'PAUSED':
        return {
          variant: 'secondary' as const,
          icon: Pause,
          text: 'En pause',
          className: 'bg-orange-100 text-orange-700 border-orange-200'
        };
      case 'CANCELLED':
        return {
          variant: 'secondary' as const,
          icon: XCircle,
          text: 'Annulée',
          className: 'bg-red-100 text-red-700 border-red-200'
        };
      default:
        return {
          variant: 'secondary' as const,
          icon: Clock,
          text: status,
          className: 'bg-gray-100 text-gray-700'
        };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge 
      variant={config.variant} 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 ${config.className} ${className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.text}
    </Badge>
  );
}