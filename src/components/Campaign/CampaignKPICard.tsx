import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CampaignKPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: number;
  className?: string;
}

export default function CampaignKPICard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className
}: CampaignKPICardProps) {
  const isPositiveTrend = trend && trend > 0;
  const isNegativeTrend = trend && trend < 0;

  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend !== undefined && (
              <div className={cn(
                "text-xs font-medium flex items-center gap-1",
                isPositiveTrend && "text-green-600",
                isNegativeTrend && "text-red-600",
                !isPositiveTrend && !isNegativeTrend && "text-muted-foreground"
              )}>
                <span>{isPositiveTrend ? '↑' : isNegativeTrend ? '↓' : '→'}</span>
                <span>{Math.abs(trend).toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}