import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { PageSkeleton } from '@/components/ui/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, MousePointerClick, TrendingUp, Users, BarChart3, Filter, Activity, AlertCircle, Sparkles, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Campaign, CampaignKPI } from '@/types/campaign';
import { useCampaigns } from '@/hooks/useCampaignApi';
import { useQueueStats } from '@/hooks/useCampaignApi';
import CampaignList from '@/components/Campaign/CampaignList';
import CampaignKPICard from '@/components/Campaign/CampaignKPICard';
import CampaignConversionFunnel from '@/components/Campaign/CampaignConversionFunnel';
import CampaignPerformanceChart from '@/components/Campaign/CampaignPerformanceChart';

export default function CampaignDashboard() {
  const navigate = useNavigate();
  
  // Memoize options to prevent re-renders
  const campaignsOptions = useMemo(() => ({ 
    autoRefresh: true, 
    refreshInterval: 30000 
  }), []);
  
  const queueStatsOptions = useMemo(() => ({ 
    autoRefresh: true, 
    refreshInterval: 5000 
  }), []);
  
  const { 
    campaigns, 
    loading, 
    error, 
    sendCampaign, 
    pauseCampaign, 
    resumeCampaign, 
    deleteCampaign 
  } = useCampaigns(campaignsOptions);
  const { stats: queueStats } = useQueueStats(queueStatsOptions);
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [creatingDemo, setCreatingDemo] = useState(false);

  const handleCreateDemoCampaign = async () => {
    try {
      setCreatingDemo(true);
      const response = await fetch('/api/campaigns/seed-demo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to create demo campaign');
      }
      
      const data = await response.json();
      toast.success(data.message);
      
      // Reload campaigns list
      window.location.reload();
    } catch (error) {
      console.error('Error creating demo campaign:', error);
      toast.error('Erreur lors de la création de la campagne de démo');
    } finally {
      setCreatingDemo(false);
    }
  };

  const calculateOverallKPIs = (): CampaignKPI => {
    const sentCampaigns = campaigns.filter(c => c.status === 'SENT' || c.status === 'SENDING');
    
    if (sentCampaigns.length === 0) {
      return {
        deliveryRate: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        spamRate: 0,
        averageOrderValue: 0,
        roi: 0
      };
    }

    const totals = sentCampaigns.reduce((acc, campaign) => {
      return {
        sent: acc.sent + campaign.sentCount,
        delivered: acc.delivered + campaign.deliveredCount,
        opened: acc.opened + campaign.openedCount,
        clicked: acc.clicked + campaign.clickedCount,
        bounced: acc.bounced + campaign.bouncedCount,
        unsubscribed: acc.unsubscribed + campaign.unsubscribedCount,
        // Mock conversion data since we don't track this yet
        converted: acc.converted + 0,
        spamReported: acc.spamReported + 0,
        revenue: acc.revenue + 0
      };
    }, {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      bounced: 0,
      unsubscribed: 0,
      spamReported: 0,
      revenue: 0
    });

    return {
      deliveryRate: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
      openRate: totals.sent > 0 ? (totals.opened / totals.sent) * 100 : 0,
      clickRate: totals.sent > 0 ? (totals.clicked / totals.sent) * 100 : 0,
      conversionRate: totals.clicked > 0 ? (totals.converted / totals.clicked) * 100 : 0,
      bounceRate: totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0,
      unsubscribeRate: totals.delivered > 0 ? (totals.unsubscribed / totals.delivered) * 100 : 0,
      spamRate: totals.delivered > 0 ? (totals.spamReported / totals.delivered) * 100 : 0,
      averageOrderValue: totals.converted > 0 ? totals.revenue / totals.converted : 0,
      roi: 0 // Not implemented yet
    };
  };

  const overallKPIs = calculateOverallKPIs();
  const sentCampaigns = campaigns.filter(c => c.status === 'SENT');

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-4">
      <PageHeader 
        title="Campagnes Email"
        description="Gérez et analysez vos campagnes marketing"
        actions={
          <div className="flex gap-2">
            <Button 
              onClick={() => navigate('/email-settings')} 
              variant="outline"
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Paramètres
            </Button>
            <Button 
              onClick={handleCreateDemoCampaign} 
              variant="outline"
              className="gap-2"
              disabled={creatingDemo}
            >
              <Sparkles className="h-4 w-4" />
              {creatingDemo ? 'Création...' : 'Campagne démo'}
            </Button>
            <Button onClick={() => navigate('/campaigns/create')} className="gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle campagne
            </Button>
           
          </div>
        }
      />
      <div className="container mx-auto px-6 space-y-4">
        {/* Stats section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CampaignKPICard
            title="Emails Envoyés"
            value={sentCampaigns.reduce((sum, c) => sum + c.sentCount, 0)}
            icon={Mail}
            description="Total des emails envoyés"
            trend={12.5}
          />
          <CampaignKPICard
            title="Taux d'Ouverture"
            value={`${overallKPIs.openRate.toFixed(1)}%`}
            icon={Users}
            description="Moyenne des ouvertures"
            trend={-2.3}
          />
          <CampaignKPICard
            title="Taux de Clic"
            value={`${overallKPIs.clickRate.toFixed(2)}%`}
            icon={MousePointerClick}
            description="CTR moyen"
            trend={0.01}
          />
          {queueStats && (
            <CampaignKPICard
              title="Queue Status"
              value={`${queueStats.active + queueStats.waiting}`}
              icon={Activity}
              description={`${queueStats.active} actifs, ${queueStats.waiting} en attente`}
              trend={0}
            />
          )}
        </div>

        {/* Queue Stats Card */}
        {queueStats && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Statut de la Queue d'Envoi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{queueStats.active}</div>
                  <div className="text-sm text-gray-500">Actifs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{queueStats.waiting}</div>
                  <div className="text-sm text-gray-500">En attente</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{queueStats.delayed}</div>
                  <div className="text-sm text-gray-500">Programmés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{queueStats.completed}</div>
                  <div className="text-sm text-gray-500">Terminés</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
                  <div className="text-sm text-gray-500">Échecs</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                Erreur de Connexion
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600">{error}</p>
              <p className="text-sm text-red-500 mt-2">
                Vérifiez que le serveur backend est démarré et accessible.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Performance des Campagnes</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignPerformanceChart campaigns={sentCampaigns} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Entonnoir de Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <CampaignConversionFunnel campaigns={sentCampaigns} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Toutes les Campagnes</CardTitle>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtrer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <CampaignList 
              campaigns={campaigns} 
              loading={loading}
              onSendCampaign={sendCampaign}
              onPauseCampaign={pauseCampaign}
              onResumeCampaign={resumeCampaign}
              onDeleteCampaign={deleteCampaign}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}