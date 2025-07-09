import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingCart, 
  TrendingDown, 
  Users2, 
  Package2,
  Percent,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Euro
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useActiveSite } from '@/hooks/useActiveSite';
import { wooAnalytics } from '@/lib/api/woocommerce-analytics';
import { RequireSite } from '@/components/RequireSite';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  Treemap
} from 'recharts';
import Navbar from '@/components/Layout/Navbar';
import Sidebar from '@/components/Layout/Sidebar';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export default function WooCommerceDashboard() {
  const { activeSite, hasActiveSite } = useActiveSite();
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  
  // Queries pour les métriques avancées
  const { data: cartMetrics, isLoading: loadingCart } = useQuery({
    queryKey: ['woo-cart-abandonment', activeSite?.id, selectedPeriod],
    queryFn: () => wooAnalytics.getCartAbandonmentMetrics(activeSite?.id, selectedPeriod),
    enabled: hasActiveSite(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: clvMetrics, isLoading: loadingCLV } = useQuery({
    queryKey: ['woo-clv', activeSite?.id],
    queryFn: () => wooAnalytics.getCustomerLifetimeValue(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const { data: cohortData, isLoading: loadingCohort } = useQuery({
    queryKey: ['woo-cohort', activeSite?.id],
    queryFn: () => wooAnalytics.getCohortAnalysis(activeSite?.id, 6),
    enabled: hasActiveSite(),
    staleTime: 60 * 60 * 1000, // 1 heure
  });

  const { data: stockPredictions, isLoading: loadingStock } = useQuery({
    queryKey: ['woo-stock', activeSite?.id],
    queryFn: () => wooAnalytics.getStockPredictions(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 15 * 60 * 1000, // 15 minutes
  });

  const { data: promotionROI, isLoading: loadingPromo } = useQuery({
    queryKey: ['woo-promotions', activeSite?.id],
    queryFn: () => wooAnalytics.getPromotionROI(activeSite?.id),
    enabled: hasActiveSite(),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  const isLoading = loadingCart || loadingCLV || loadingCohort || loadingStock || loadingPromo;

  return (
    <RequireSite>
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold">Analytics WooCommerce Avancées</h1>
            <p className="text-muted-foreground">
              Métriques approfondies pour {activeSite?.name}
            </p>
          </div>

          {/* Alertes importantes */}
          {stockPredictions && stockPredictions.criticalStock.length > 0 && (
            <Alert className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Stock critique</AlertTitle>
              <AlertDescription>
                {stockPredictions.criticalStock.length} produits sont en stock critique et nécessitent un réapprovisionnement urgent.
              </AlertDescription>
            </Alert>
          )}

          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taux d'abandon</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cartMetrics?.abandonmentRate.toFixed(1) || 0}%
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span>{cartMetrics?.totalAbandoned || 0} paniers abandonnés</span>
                </div>
                <Progress 
                  value={100 - (cartMetrics?.abandonmentRate || 0)} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CLV Moyen</CardTitle>
                <Euro className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {clvMetrics?.averageCLV.toFixed(0) || 0}€
                </div>
                <div className="flex items-center text-xs mt-1">
                  <Users2 className="h-3 w-3 mr-1" />
                  <span>{clvMetrics?.topCustomers.length || 0} clients haute valeur</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROI Promotions</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold flex items-center gap-2">
                  {promotionROI?.overallROI.toFixed(0) || 0}%
                  {(promotionROI?.overallROI || 0) > 100 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {promotionROI?.activePromotions || 0} promotions actives
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alertes Stock</CardTitle>
                <Package2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Critique</span>
                    <Badge variant="destructive">
                      {stockPredictions?.criticalStock.length || 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">Surstock</span>
                    <Badge variant="secondary">
                      {stockPredictions?.overstock.length || 0}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs avec analyses détaillées */}
          <Tabs defaultValue="abandonment" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="abandonment">Abandons</TabsTrigger>
              <TabsTrigger value="clv">Valeur Client</TabsTrigger>
              <TabsTrigger value="cohort">Cohortes</TabsTrigger>
              <TabsTrigger value="stock">Stock</TabsTrigger>
              <TabsTrigger value="promotions">Promotions</TabsTrigger>
            </TabsList>

            <TabsContent value="abandonment" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Tendances horaires */}
                <Card>
                  <CardHeader>
                    <CardTitle>Abandons par heure</CardTitle>
                    <CardDescription>
                      Identifiez les heures critiques
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={cartMetrics?.hourlyTrends || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="hour" 
                          tickFormatter={(hour) => `${hour}h`}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => `${value.toFixed(1)}%`}
                          labelFormatter={(hour) => `${hour}h00`}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="abandonmentRate" 
                          stroke="#FF8042" 
                          fill="#FF8042" 
                          fillOpacity={0.6} 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Raisons d'abandon */}
                <Card>
                  <CardHeader>
                    <CardTitle>Raisons d'abandon</CardTitle>
                    <CardDescription>
                      Analyse des causes principales
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {cartMetrics?.abandonmentReasons.map((reason, index) => (
                        <div key={index}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{reason.reason}</span>
                            <span className="text-sm text-muted-foreground">
                              {reason.count} ({reason.percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <Progress value={reason.percentage} />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Produits abandonnés */}
              <Card>
                <CardHeader>
                  <CardTitle>Produits les plus abandonnés</CardTitle>
                  <CardDescription>
                    Focus sur les produits problématiques
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {cartMetrics?.topAbandonedProducts.slice(0, 5).map((product) => (
                      <div key={product.productId} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{product.productName}</p>
                          <p className="text-sm text-muted-foreground">
                            {product.abandonmentCount} abandons
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{product.totalValue.toFixed(2)}€</p>
                          <p className="text-xs text-muted-foreground">Valeur perdue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clv" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Distribution CLV */}
                <Card>
                  <CardHeader>
                    <CardTitle>Distribution de la valeur client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={clvMetrics?.clvDistribution || []}
                          dataKey="customerCount"
                          nameKey="segment"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({segment, percentage}) => `${segment} (${percentage.toFixed(0)}%)`}
                        >
                          {clvMetrics?.clvDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* CLV par segment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Valeur par segment client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={clvMetrics?.clvBySegment || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="segment" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => `${value.toFixed(0)}€`} />
                        <Bar dataKey="averageCLV" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Top clients */}
              <Card>
                <CardHeader>
                  <CardTitle>Clients VIP</CardTitle>
                  <CardDescription>
                    Vos clients les plus précieux
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Client</th>
                          <th className="text-right py-2">Valeur totale</th>
                          <th className="text-right py-2">Commandes</th>
                          <th className="text-right py-2">Panier moyen</th>
                          <th className="text-right py-2">CLV prédit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clvMetrics?.topCustomers.slice(0, 5).map((customer) => (
                          <tr key={customer.customerId} className="border-b">
                            <td className="py-3">
                              <div>
                                <p className="font-medium">{customer.customerName}</p>
                                <p className="text-xs text-muted-foreground">{customer.email}</p>
                              </div>
                            </td>
                            <td className="text-right font-bold">{customer.totalSpent.toFixed(0)}€</td>
                            <td className="text-right">{customer.orderCount}</td>
                            <td className="text-right">{customer.averageOrderValue.toFixed(0)}€</td>
                            <td className="text-right">
                              {customer.predictedCLV ? (
                                <Badge variant="outline">{customer.predictedCLV.toFixed(0)}€</Badge>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="cohort" className="space-y-4">
              {/* Matrice de rétention */}
              <Card>
                <CardHeader>
                  <CardTitle>Analyse de rétention par cohorte</CardTitle>
                  <CardDescription>
                    Suivez la fidélité de vos clients dans le temps
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Cohorte</th>
                          <th className="text-center py-2">Mois 0</th>
                          <th className="text-center py-2">Mois 1</th>
                          <th className="text-center py-2">Mois 2</th>
                          <th className="text-center py-2">Mois 3</th>
                          <th className="text-center py-2">Mois 4</th>
                          <th className="text-center py-2">Mois 5</th>
                          <th className="text-center py-2">Mois 6</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cohortData?.cohorts.slice(0, 6).map((cohort) => (
                          <tr key={cohort.cohortDate} className="border-b">
                            <td className="py-2 font-medium">{cohort.cohortDate}</td>
                            {cohort.retention.slice(0, 7).map((month, index) => (
                              <td key={index} className="text-center py-2">
                                <div 
                                  className="inline-block px-2 py-1 rounded text-xs"
                                  style={{
                                    backgroundColor: `rgba(0, 136, 254, ${month.retentionRate / 100})`,
                                    color: month.retentionRate > 50 ? 'white' : 'black'
                                  }}
                                >
                                  {month.retentionRate.toFixed(0)}%
                                </div>
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Tendance de rétention moyenne */}
              <Card>
                <CardHeader>
                  <CardTitle>Courbe de rétention moyenne</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cohortData?.averageRetention || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="month" 
                        tickFormatter={(month) => `Mois ${month}`}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => `${value.toFixed(1)}%`}
                        labelFormatter={(month) => `Mois ${month}`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="averageRetentionRate" 
                        stroke="#8884d8" 
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stock" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Alertes stock critique */}
                <Card>
                  <CardHeader>
                    <CardTitle>Stock critique</CardTitle>
                    <CardDescription>
                      Produits nécessitant un réapprovisionnement urgent
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stockPredictions?.criticalStock.slice(0, 5).map((item) => (
                        <div key={item.productId} className="p-3 border rounded-lg border-red-200 bg-red-50">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                Stock: {item.currentStock} | Ventes/jour: {item.averageDailySales.toFixed(1)}
                              </p>
                            </div>
                            <Badge variant="destructive">
                              {item.daysUntilStockout} jours
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Surstock */}
                <Card>
                  <CardHeader>
                    <CardTitle>Produits en surstock</CardTitle>
                    <CardDescription>
                      Opportunités de promotion ou déstockage
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {stockPredictions?.overstock.slice(0, 5).map((item) => (
                        <div key={item.productId} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.productName}</p>
                              <p className="text-sm text-muted-foreground">
                                Stock: {item.currentStock} | {item.monthsOfSupply.toFixed(1)} mois
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{item.tiedUpCapital.toFixed(0)}€</p>
                              {item.recommendedDiscount && (
                                <Badge variant="secondary">
                                  -{item.recommendedDiscount}%
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Rotation des stocks */}
              <Card>
                <CardHeader>
                  <CardTitle>Efficacité de rotation des stocks</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                      data={stockPredictions?.stockTurnover.slice(0, 20).map(item => ({
                        name: item.productName,
                        size: item.turnoverRate,
                        efficiency: item.efficiency
                      })) || []}
                      dataKey="size"
                      aspectRatio={4/3}
                      stroke="#fff"
                      fill={(entry: any) => {
                        if (entry.efficiency === 'High') return '#00C49F';
                        if (entry.efficiency === 'Medium') return '#FFBB28';
                        return '#FF8042';
                      }}
                    />
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="promotions" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                {/* Meilleures promotions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top promotions</CardTitle>
                    <CardDescription>
                      Les plus rentables
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {promotionROI?.bestPerformers.map((promo, index) => (
                        <div key={promo.promotionId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{promo.promotionName}</p>
                              <p className="text-xs text-muted-foreground">{promo.insight}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge variant="default">ROI: {promo.roi.toFixed(0)}%</Badge>
                            <p className="text-xs text-muted-foreground mt-1">
                              {promo.revenue.toFixed(0)}€
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Promotions à revoir */}
                <Card>
                  <CardHeader>
                    <CardTitle>Promotions à optimiser</CardTitle>
                    <CardDescription>
                      Performance insuffisante
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {promotionROI?.worstPerformers.map((promo, index) => (
                        <div key={promo.promotionId} className="flex items-center justify-between p-3 border rounded-lg border-red-200 bg-red-50">
                          <div>
                            <p className="font-medium">{promo.promotionName}</p>
                            <p className="text-xs text-muted-foreground">{promo.insight}</p>
                          </div>
                          <Badge variant="destructive">ROI: {promo.roi.toFixed(0)}%</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recommandations */}
              <Card>
                <CardHeader>
                  <CardTitle>Recommandations d'optimisation</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {promotionROI?.recommendedActions.map((action, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={
                                action.priority === 'High' ? 'destructive' : 
                                action.priority === 'Medium' ? 'default' : 'secondary'
                              }>
                                {action.priority}
                              </Badge>
                              <span className="font-medium">{action.type}</span>
                            </div>
                            <p className="text-sm">{action.recommendation}</p>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-sm font-medium text-green-600">{action.expectedImpact}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
    </RequireSite>
  );
}