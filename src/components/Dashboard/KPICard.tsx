
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  previousValue?: number | string;
  format?: 'number' | 'currency' | 'percentage';
  className?: string;
  color?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

const KPICard = ({ 
  title, 
  value, 
  icon, 
  trend, 
  previousValue,
  format = 'number',
  className, 
  color = 'default' 
}: KPICardProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    setIsAnimating(true);
    setDisplayValue(value);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    return () => clearTimeout(timer);
  }, [value]);

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.value === 0) return <Minus className="h-4 w-4" />;
    return trend.isPositive ? 
      <TrendingUp className="h-4 w-4" /> : 
      <TrendingDown className="h-4 w-4" />;
  };

  const getColorClasses = () => {
    const colors = {
      default: "border-border hover:border-primary/50",
      primary: "border-primary/20 hover:border-primary/40 bg-primary/5",
      success: "border-green-200 hover:border-green-300 bg-green-50 dark:bg-green-950/20",
      warning: "border-amber-200 hover:border-amber-300 bg-amber-50 dark:bg-amber-950/20",
      danger: "border-red-200 hover:border-red-300 bg-red-50 dark:bg-red-950/20"
    };
    return colors[color];
  };

  const getIconColorClasses = () => {
    const colors = {
      default: "text-muted-foreground",
      primary: "text-primary",
      success: "text-green-600 dark:text-green-500",
      warning: "text-amber-600 dark:text-amber-500",
      danger: "text-red-600 dark:text-red-500"
    };
    return colors[color];
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      getColorClasses(),
      isAnimating && "animate-scale-in",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon && (
          <div className={cn(
            "p-2 rounded-lg bg-background/50",
            getIconColorClasses()
          )}>
            {icon}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className={cn(
            "text-2xl font-bold tracking-tight transition-all duration-300",
            isAnimating && "animate-fade-up"
          )}>
            {displayValue}
          </div>
          
          {trend && (
            <div className={cn(
              "flex items-center gap-1 text-xs",
              trend.isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
            )}>
              {getTrendIcon()}
              <span className="font-medium">{Math.abs(trend.value)}%</span>
              {previousValue && (
                <span className="text-muted-foreground ml-1">
                  vs {previousValue}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      {/* Decorative gradient */}
      <div className={cn(
        "absolute inset-x-0 bottom-0 h-0.5",
        color === 'primary' && "gradient-primary",
        color === 'success' && "gradient-success",
        color === 'warning' && "gradient-warning",
        color === 'danger' && "gradient-danger",
        color === 'default' && "bg-gradient-to-r from-transparent via-primary/20 to-transparent"
      )} />
    </Card>
  );
};

export default KPICard;
