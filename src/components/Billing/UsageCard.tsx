import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Package, 
  ShoppingCart, 
  Sparkles,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UsageMetric {
  metric: string;
  current: number;
  limit: number;
  icon: React.ReactNode;
  label: string;
}

interface UsageCardProps {
  metrics: UsageMetric[];
}

export function UsageCard({ metrics }: UsageCardProps) {
  const getIcon = (metric: string) => {
    switch (metric) {
      case 'users':
        return <Users className="w-5 h-5" />;
      case 'products':
        return <Package className="w-5 h-5" />;
      case 'orders':
        return <ShoppingCart className="w-5 h-5" />;
      case 'ai_generations':
        return <Sparkles className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const getLabel = (metric: string) => {
    switch (metric) {
      case 'users':
        return 'Utilisateurs';
      case 'products':
        return 'Produits';
      case 'orders':
        return 'Commandes ce mois';
      case 'ai_generations':
        return 'Générations IA ce mois';
      default:
        return metric;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Utilisation actuelle</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.map((metric) => {
          const percentage = metric.limit > 0 
            ? Math.round((metric.current / metric.limit) * 100) 
            : 0;
          const isNearLimit = percentage >= 80;
          const isAtLimit = percentage >= 100;

          return (
            <div key={metric.metric} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    isAtLimit ? "bg-destructive/10 text-destructive" :
                    isNearLimit ? "bg-yellow-100 text-yellow-700" :
                    "bg-muted"
                  )}>
                    {getIcon(metric.metric)}
                  </div>
                  <span className="font-medium">{getLabel(metric.metric)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    isAtLimit && "text-destructive"
                  )}>
                    {metric.current.toLocaleString()} / {
                      metric.limit === 9999 || metric.limit === 999999 || metric.limit === 99999
                        ? '∞'
                        : metric.limit.toLocaleString()
                    }
                  </span>
                  {isNearLimit && !isAtLimit && (
                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                  )}
                  {isAtLimit && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              <Progress 
                value={Math.min(percentage, 100)} 
                className={cn(
                  "h-2",
                  isAtLimit && "[&>div]:bg-destructive",
                  isNearLimit && !isAtLimit && "[&>div]:bg-yellow-500"
                )}
              />
              {isAtLimit && (
                <p className="text-sm text-destructive">
                  Limite atteinte. Passez à un plan supérieur pour continuer.
                </p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}