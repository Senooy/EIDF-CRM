import React from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: string[];
  limits: {
    maxUsers: number;
    maxProducts: number;
    maxOrders: number;
    aiGenerationsPerMonth: number;
  };
}

interface PricingCardProps {
  plan: PricingPlan;
  currentPlan?: string;
  billingPeriod: 'monthly' | 'yearly';
  onSelect: (planId: string) => void;
  popular?: boolean;
  loading?: boolean;
}

export function PricingCard({
  plan,
  currentPlan,
  billingPeriod,
  onSelect,
  popular = false,
  loading = false,
}: PricingCardProps) {
  const price = billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice;
  const isCurrentPlan = currentPlan === plan.id;
  const isFree = plan.id === 'FREE';

  return (
    <Card className={cn(
      "relative flex flex-col",
      popular && "border-primary shadow-lg scale-105"
    )}>
      {popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Plus populaire
        </Badge>
      )}
      
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {plan.name}
          {isCurrentPlan && (
            <Badge variant="secondary">Plan actuel</Badge>
          )}
        </CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="mb-6">
          <span className="text-4xl font-bold">
            {price === 0 ? 'Gratuit' : `${price}€`}
          </span>
          {price > 0 && (
            <span className="text-muted-foreground ml-1">
              /{billingPeriod === 'monthly' ? 'mois' : 'an'}
            </span>
          )}
          {billingPeriod === 'yearly' && plan.monthlyPrice > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Économisez {Math.round((1 - plan.yearlyPrice / (plan.monthlyPrice * 12)) * 100)}%
            </p>
          )}
        </div>
        
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="w-5 h-5 text-primary mr-2 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
        
        <div className="mt-6 pt-6 border-t space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Utilisateurs</span>
            <span className="font-medium text-foreground">
              {plan.limits.maxUsers === 9999 ? 'Illimité' : plan.limits.maxUsers}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Produits</span>
            <span className="font-medium text-foreground">
              {plan.limits.maxProducts === 999999 ? 'Illimité' : plan.limits.maxProducts.toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Générations IA/mois</span>
            <span className="font-medium text-foreground">
              {plan.limits.aiGenerationsPerMonth === 99999 ? 'Illimité' : plan.limits.aiGenerationsPerMonth.toLocaleString()}
            </span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : popular ? 'default' : 'outline'}
          disabled={isCurrentPlan || loading || isFree}
          onClick={() => onSelect(plan.id)}
        >
          {isCurrentPlan ? 'Plan actuel' : isFree ? 'Inclus' : 'Choisir ce plan'}
        </Button>
      </CardFooter>
    </Card>
  );
}