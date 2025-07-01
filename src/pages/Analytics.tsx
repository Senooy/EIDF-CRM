import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  Package, 
  Users, 
  TrendingUp,
  Euro,
  Sparkles,
  Calendar,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnalyticsCard } from '@/components/Analytics/AnalyticsCard';
import { ActivityFeed } from '@/components/Analytics/ActivityFeed';
import { HealthScore } from '@/components/Analytics/HealthScore';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useOrganization } from '@/contexts/OrganizationContext';
import axios from 'axios';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function AnalyticsPage() {
  const { currentOrganization } = useOrganization();
  const [period, setPeriod] = useState('30');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [activities, setActivities] = useState<any>({ recentActivities: [], userActivity: [] });
  const [health, setHealth] = useState<any>(null);
  const [aiUsageTrend, setAiUsageTrend] = useState<any[]>([]);

  useEffect(() => {
    if (currentOrganization) {
      fetchAnalytics();
    }
  }, [currentOrganization, period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch all analytics data in parallel
      const [
        summaryRes,
        salesRes,
        productsRes,
        activitiesRes,
        healthRes,
        aiTrendRes,
      ] = await Promise.all([
        axios.get(`/api/analytics/summary?days=${period}`),
        axios.get(`/api/analytics/metrics/order?days=${period}`),
        axios.get('/api/analytics/top-products'),
        axios.get('/api/analytics/activity?limit=20'),
        axios.get('/api/analytics/health'),
        axios.get(`/api/analytics/usage-trends/ai_generation?days=${period}`),
      ]);

      setSummary(summaryRes.data);
      setSalesData(salesRes.data);
      setTopProducts(productsRes.data);
      setActivities(activitiesRes.data);
      setHealth(healthRes.data);
      setAiUsageTrend(aiTrendRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Erreur lors du chargement des analytics');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      // In a real app, this would generate a PDF or CSV report
      toast.success('Export du rapport en cours...');
      
      // Mock report data
      const reportData = {
        organization: currentOrganization?.name,
        period: `${period} derniers jours`,
        summary,
        topProducts,
        generatedAt: new Date().toISOString(),
      };
      
      // Create a downloadable JSON file
      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Rapport exporté avec succès');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Erreur lors de l\'export du rapport');
    }
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Calculate trends (mock data for demo)
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, isPositive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.round(Math.abs(change)),
      isPositive: change >= 0,
    };
  };

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            Suivez les performances de votre organisation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 derniers jours</SelectItem>
              <SelectItem value="30">30 derniers jours</SelectItem>
              <SelectItem value="90">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exporter
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          title="Chiffre d'affaires"
          value={`${summary?.totalRevenue || 0}€`}
          subtitle="Total sur la période"
          icon={<Euro className="w-4 h-4" />}
          trend={calculateTrend(summary?.totalRevenue || 0, 1000)}
        />
        <AnalyticsCard
          title="Commandes"
          value={summary?.totalOrders || 0}
          subtitle={`Panier moyen: ${summary?.averageOrderValue || 0}€`}
          icon={<ShoppingCart className="w-4 h-4" />}
          trend={calculateTrend(summary?.totalOrders || 0, 20)}
        />
        <AnalyticsCard
          title="Produits"
          value={summary?.totalProducts || 0}
          subtitle="Produits actifs"
          icon={<Package className="w-4 h-4" />}
        />
        <AnalyticsCard
          title="Générations IA"
          value={summary?.aiGenerations || 0}
          subtitle="Ce mois-ci"
          icon={<Sparkles className="w-4 h-4" />}
          trend={calculateTrend(summary?.aiGenerations || 0, 40)}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content - 2 columns */}
        <div className="lg:col-span-2 space-y-8">
          {/* Charts */}
          <Tabs defaultValue="sales" className="space-y-4">
            <TabsList>
              <TabsTrigger value="sales">Ventes</TabsTrigger>
              <TabsTrigger value="ai">Utilisation IA</TabsTrigger>
              <TabsTrigger value="products">Produits</TabsTrigger>
            </TabsList>
            
            <TabsContent value="sales" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Évolution des ventes</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={salesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#8884d8"
                        fill="#8884d8"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="ai" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Utilisation de l'IA</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={aiUsageTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="products" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Top produits</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topProducts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucune donnée disponible
                      </p>
                    ) : (
                      topProducts.map((product, index) => (
                        <div key={product.productId} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl font-bold text-muted-foreground">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.sales} ventes
                              </p>
                            </div>
                          </div>
                          <span className="font-bold">{product.revenue}€</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* User Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Activité des utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.userActivity.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    Aucune activité récente
                  </p>
                ) : (
                  activities.userActivity.slice(0, 5).map((user: any) => (
                    <div key={user.userId} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{user.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.actionCount} actions
                        </p>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Dernière activité : {new Date(user.lastActive).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-8">
          {/* Health Score */}
          {health && (
            <HealthScore
              score={health.score}
              factors={health.factors}
              recommendations={health.recommendations}
            />
          )}

          {/* Activity Feed */}
          <ActivityFeed activities={activities.recentActivities} />
        </div>
      </div>
    </div>
  );
}