import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface HealthFactor {
  name: string;
  score: number;
  weight: number;
}

interface HealthScoreProps {
  score: number;
  factors: HealthFactor[];
  recommendations: string[];
  className?: string;
}

export function HealthScore({ score, factors, recommendations, className }: HealthScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Bon';
    if (score >= 40) return 'Moyen';
    return 'À améliorer';
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return '[&>div]:bg-green-600';
    if (score >= 60) return '[&>div]:bg-yellow-600';
    if (score >= 40) return '[&>div]:bg-orange-600';
    return '[&>div]:bg-red-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Santé de l'organisation</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-4 h-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Score basé sur l'activité et l'engagement</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center">
          <div className={cn("text-5xl font-bold mb-2", getScoreColor(score))}>
            {score}%
          </div>
          <Badge variant="outline" className={cn("mb-4", getScoreColor(score))}>
            {getScoreLabel(score)}
          </Badge>
          <Progress value={score} className={cn("h-3", getProgressColor(score))} />
        </div>

        {/* Factors */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Facteurs de santé</h4>
          {factors.map((factor, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{factor.name}</span>
                <span className="font-medium">{factor.score}%</span>
              </div>
              <Progress 
                value={factor.score} 
                className={cn("h-2", getProgressColor(factor.score))}
              />
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Recommandations
            </h4>
            <ul className="space-y-2">
              {recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <span className="text-muted-foreground">{recommendation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}