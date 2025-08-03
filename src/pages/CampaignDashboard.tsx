import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/Layout/PageHeader';
import { PageSkeleton } from '@/components/ui/loading-skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Mail, MousePointerClick, TrendingUp, Users, BarChart3, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Campaign, CampaignKPI } from '@/types/campaign';
import { useCampaigns } from '@/hooks/useCampaigns';
import CampaignList from '@/components/Campaign/CampaignList';
import CampaignKPICard from '@/components/Campaign/CampaignKPICard';
import CampaignConversionFunnel from '@/components/Campaign/CampaignConversionFunnel';
import CampaignPerformanceChart from '@/components/Campaign/CampaignPerformanceChart';

export default function CampaignDashboard() {
  const navigate = useNavigate();
  const { campaigns, loading } = useCampaigns();
  const [selectedPeriod, setSelectedPeriod] = useState('all');

  const calculateOverallKPIs = (): CampaignKPI => {
    const sentCampaigns = campaigns.filter(c => c.status === 'sent');
    
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
      const stats = campaign.stats;
      return {
        sent: acc.sent + stats.sent,
        delivered: acc.delivered + stats.delivered,
        opened: acc.opened + stats.opened,
        clicked: acc.clicked + stats.clicked,
        converted: acc.converted + stats.converted,
        bounced: acc.bounced + stats.bounced,
        unsubscribed: acc.unsubscribed + stats.unsubscribed,
        spamReported: acc.spamReported + stats.spamReported,
        revenue: acc.revenue + stats.revenue
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

    const campaignCost = sentCampaigns.length * 50;

    return {
      deliveryRate: totals.sent > 0 ? (totals.delivered / totals.sent) * 100 : 0,
      openRate: totals.delivered > 0 ? (totals.opened / totals.delivered) * 100 : 0,
      clickRate: totals.opened > 0 ? (totals.clicked / totals.opened) * 100 : 0,
      conversionRate: totals.clicked > 0 ? (totals.converted / totals.clicked) * 100 : 0,
      bounceRate: totals.sent > 0 ? (totals.bounced / totals.sent) * 100 : 0,
      unsubscribeRate: totals.delivered > 0 ? (totals.unsubscribed / totals.delivered) * 100 : 0,
      spamRate: totals.delivered > 0 ? (totals.spamReported / totals.delivered) * 100 : 0,
      averageOrderValue: totals.converted > 0 ? totals.revenue / totals.converted : 0,
      roi: campaignCost > 0 ? ((totals.revenue - campaignCost) / campaignCost) * 100 : 0
    };
  };

  const overallKPIs = calculateOverallKPIs();
  const sentCampaigns = campaigns.filter(c => c.status === 'sent');

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Campagnes Email"
        description="Gérez et analysez vos campagnes marketing"
        actions={
          <Button onClick={() => navigate('/campaigns/create')} className="gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle campagne
          </Button>
        }
      />
      <div className="container mx-auto px-6 space-y-6">
        {/* Stats section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CampaignKPICard
            title="Emails Envoyés"
            value={sentCampaigns.reduce((sum, c) => sum + c.stats.sent, 0)}
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
            description="CTR moyen (proche de 0)"
            trend={0.01}
          />
          <CampaignKPICard
            title="Revenus Générés"
            value={`${sentCampaigns.reduce((sum, c) => sum + c.stats.revenue, 0).toFixed(0)}€`}
            icon={TrendingUp}
            description="Total des conversions"
            trend={18.7}
          />
        </div>

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
            <CampaignList campaigns={campaigns} loading={loading} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}