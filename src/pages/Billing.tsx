import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PricingCard } from '@/components/Billing/PricingCard';
import { UsageCard } from '@/components/Billing/UsageCard';
import { useOrganization } from '@/contexts/OrganizationContext';
import axios from 'axios';
import { toast } from 'sonner';

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

export default function BillingPage() {
  const navigate = useNavigate();
  const { currentOrganization } = useOrganization();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('');
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    if (currentOrganization) {
      fetchBillingData();
    }
  }, [currentOrganization]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Fetch plans
      const plansResponse = await axios.get('/api/plans');
      setPlans(plansResponse.data);
      
      // Fetch current subscription
      const subResponse = await axios.get('/api/subscription');
      setSubscription(subResponse.data);
      setCurrentPlan(subResponse.data.plan);
      
      // Fetch usage metrics
      const metrics = ['users', 'ai_generations'];
      const usageData = await Promise.all(
        metrics.map(async (metric) => {
          const response = await axios.get(`/api/usage/${metric}`);
          return { metric, ...response.data };
        })
      );
      setUsage(usageData);
    } catch (error) {
      console.error('Error fetching billing data:', error);
      toast.error('Erreur lors du chargement des données de facturation');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!currentOrganization) return;
    
    try {
      setProcessingPlan(planId);
      
      const response = await axios.post('/api/checkout', {
        plan: planId,
        billingPeriod,
      });
      
      if (response.data.checkoutUrl) {
        window.location.href = response.data.checkoutUrl;
      }
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de la création de la session de paiement');
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      const response = await axios.post('/api/portal');
      
      if (response.data.portalUrl) {
        window.open(response.data.portalUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error creating portal session:', error);
      toast.error(error.response?.data?.error || 'Erreur lors de l\'accès au portail');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const hasActiveSubscription = subscription?.status === 'ACTIVE' && subscription?.plan !== 'FREE';

  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Facturation et Abonnement</h1>
        <p className="text-muted-foreground">
          Gérez votre abonnement et suivez votre utilisation
        </p>
      </div>

      {/* Current subscription info */}
      {hasActiveSubscription && (
        <Alert className="mb-8">
          <CreditCard className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Vous êtes actuellement sur le plan <strong>{subscription.planDetails?.name}</strong>.
              {subscription.currentPeriodEnd && (
                <> Prochain renouvellement le {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.</>
              )}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManageSubscription}
              className="ml-4"
            >
              Gérer l'abonnement
              <ExternalLink className="w-4 h-4 ml-2" />
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Usage section */}
        <div className="lg:col-span-1">
          <UsageCard metrics={usage} />
        </div>

        {/* Pricing section */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <Tabs value={billingPeriod} onValueChange={(v) => setBillingPeriod(v as any)}>
              <TabsList className="grid w-full max-w-xs grid-cols-2">
                <TabsTrigger value="monthly">Mensuel</TabsTrigger>
                <TabsTrigger value="yearly">
                  Annuel
                  <span className="ml-1 text-xs text-primary">-20%</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {plans.map((plan) => (
              <PricingCard
                key={plan.id}
                plan={plan}
                currentPlan={currentPlan}
                billingPeriod={billingPeriod}
                onSelect={handleSelectPlan}
                popular={plan.id === 'PROFESSIONAL'}
                loading={processingPlan === plan.id}
              />
            ))}
          </div>
        </div>
      </div>

      {/* FAQ or additional info */}
      <div className="mt-12 border-t pt-8">
        <h2 className="text-xl font-semibold mb-4">Questions fréquentes</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Puis-je changer de plan à tout moment ?</h3>
            <p className="text-sm text-muted-foreground">
              Oui, vous pouvez passer à un plan supérieur immédiatement. Les downgrades prennent effet à la fin de votre période de facturation actuelle.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Comment sont calculées les limites ?</h3>
            <p className="text-sm text-muted-foreground">
              Les limites d'utilisateurs et de produits sont permanentes. Les limites de commandes et de générations IA se réinitialisent chaque mois.
            </p>
          </div>
          <div>
            <h3 className="font-medium mb-1">Que se passe-t-il si j'atteins une limite ?</h3>
            <p className="text-sm text-muted-foreground">
              Vous recevrez une notification et devrez passer à un plan supérieur pour continuer à utiliser la fonctionnalité concernée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}