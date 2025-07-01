import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  FileText,
  Sparkles,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ActivityItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  user: string;
  timestamp: Date;
  metadata?: any;
}

interface ActivityFeedProps {
  activities: ActivityItem[];
  className?: string;
}

export function ActivityFeed({ activities, className }: ActivityFeedProps) {
  const getActivityIcon = (action: string, entityType: string) => {
    if (entityType === 'product') return <Package className="w-4 h-4" />;
    if (entityType === 'order') return <ShoppingCart className="w-4 h-4" />;
    if (entityType === 'customer') return <Users className="w-4 h-4" />;
    if (action.includes('ai')) return <Sparkles className="w-4 h-4" />;
    if (entityType === 'report') return <FileText className="w-4 h-4" />;
    return <Activity className="w-4 h-4" />;
  };

  const getActivityMessage = (activity: ActivityItem) => {
    const { action, entityType, metadata } = activity;
    
    const messages: Record<string, string> = {
      'product.created': 'a créé un nouveau produit',
      'product.updated': 'a mis à jour un produit',
      'product.deleted': 'a supprimé un produit',
      'order.created': 'nouvelle commande créée',
      'order.updated': 'a mis à jour une commande',
      'order.completed': 'commande complétée',
      'customer.created': 'nouveau client ajouté',
      'customer.updated': 'a mis à jour un client',
      'ai.generation': 'a généré du contenu avec l\'IA',
      'report.generated': 'a généré un rapport',
      'user.login': 's\'est connecté',
      'user.logout': 's\'est déconnecté',
    };

    const message = messages[action] || action;
    
    if (metadata?.entityName) {
      return `${message} "${metadata.entityName}"`;
    }
    
    return message;
  };

  const getUserInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Aucune activité récente
              </p>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start space-x-3 pb-4 last:pb-0 border-b last:border-0"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs">
                      {getUserInitials(activity.user)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {activity.user}
                      </span>
                      <div className="text-muted-foreground">
                        {getActivityIcon(activity.action, activity.entityType)}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {getActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.timestamp), {
                        addSuffix: true,
                        locale: fr,
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}