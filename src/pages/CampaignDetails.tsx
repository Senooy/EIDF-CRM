import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Layout/Navbar';
import Sidebar from '@/components/Layout/Sidebar';
import { campaignService } from '@/services/campaignService';
import { generateCampaignTimelineData } from '@/lib/mockCampaignData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Edit, Send, Eye, Calendar, Users, TrendingUp, Mail, MousePointer, ShoppingCart, Euro, Activity, Clock } from 'lucide-react';
import { Campaign, CampaignStats, CampaignTimelineData } from '@/types/campaign';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function CampaignDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [timelineData, setTimelineData] = useState<CampaignTimelineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (id) {
      loadCampaignDetails();
      setupRealTimeUpdates();
    }
  }, [id]);

  const loadCampaignDetails = async () => {
    try {
      setLoading(true);
      const campaignData = await campaignService.getCampaign(id!);
      if (campaignData) {
        setCampaign(campaignData);
        setStats(campaignData.stats);
        setTimelineData(generateCampaignTimelineData(campaignData));
      } else {
        toast.error('Campagne non trouvée');
        navigate('/campaigns');
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Erreur lors du chargement de la campagne');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeUpdates = () => {
    const unsubscribe = campaignService.subscribeToCampaignStats(id!, (newStats) => {
      setStats(newStats);
      if (campaign) {
        const updatedCampaign = { ...campaign, stats: newStats };
        setTimelineData(generateCampaignTimelineData(updatedCampaign));
      }
    });

    return () => unsubscribe();
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return 'bg-gray-500';
      case 'scheduled': return 'bg-blue-500';
      case 'sending': return 'bg-yellow-500';
      case 'sent': return 'bg-green-500';
      case 'paused': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return 'Brouillon';
      case 'scheduled': return 'Programmée';
      case 'sending': return 'En cours d\'envoi';
      case 'sent': return 'Envoyée';
      case 'paused': return 'En pause';
      default: return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number, total: number) => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (loading || !campaign || !stats) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
            <div className="container mx-auto max-w-6xl">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement des détails...</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const kpiCards = [
    {
      title: 'Emails envoyés',
      value: stats.sent.toLocaleString(),
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Taux d\'ouverture',
      value: formatPercentage(stats.opened, stats.delivered),
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      title: 'Taux de clic',
      value: formatPercentage(stats.clicked, stats.opened),
      icon: MousePointer,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Conversions',
      value: stats.converted.toString(),
      icon: ShoppingCart,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.revenue),
      icon: Euro,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    }
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
          <div className="container mx-auto max-w-6xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/campaigns')}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold">{campaign.name}</h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={`${getStatusColor(campaign.status)} text-white`}>
                      {getStatusText(campaign.status)}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Créée le {format(new Date(campaign.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/campaigns/${id}/edit`)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </Button>
                {campaign.status === 'draft' && (
                  <Button>
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </Button>
                )}
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              {kpiCards.map((kpi, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">{kpi.title}</p>
                        <p className="text-2xl font-bold">{kpi.value}</p>
                      </div>
                      <div className={`p-3 rounded-full ${kpi.bgColor}`}>
                        <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="content">Contenu</TabsTrigger>
                <TabsTrigger value="recipients">Destinataires</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Statistiques détaillées */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Statistiques détaillées
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{stats.delivered}</div>
                          <div className="text-sm text-gray-600">Délivrés</div>
                          <div className="text-xs text-gray-500">
                            {formatPercentage(stats.delivered, stats.sent)}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <div className="text-2xl font-bold text-red-600">{stats.bounced}</div>
                          <div className="text-sm text-gray-600">Bounces</div>
                          <div className="text-xs text-gray-500">
                            {formatPercentage(stats.bounced, stats.sent)}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                          <div className="text-2xl font-bold text-yellow-600">{stats.unsubscribed}</div>
                          <div className="text-sm text-gray-600">Désabonnés</div>
                          <div className="text-xs text-gray-500">
                            {formatPercentage(stats.unsubscribed, stats.delivered)}
                          </div>
                        </div>
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-2xl font-bold text-gray-600">{stats.spamReported}</div>
                          <div className="text-sm text-gray-600">Spam signalé</div>
                          <div className="text-xs text-gray-500">
                            {formatPercentage(stats.spamReported, stats.delivered)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Informations campagne */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Informations de la campagne
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Objet</label>
                        <p className="text-sm">{campaign.subject}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Destinataires</label>
                        <p className="text-sm">{campaign.recipientCount?.toLocaleString()} contacts</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Créé par</label>
                        <p className="text-sm">{campaign.createdBy}</p>
                      </div>
                      {campaign.sentDate && (
                        <div>
                          <label className="text-sm font-medium text-gray-500">Date d'envoi</label>
                          <p className="text-sm">
                            {format(new Date(campaign.sentDate), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                          </p>
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-medium text-gray-500">Dernière mise à jour</label>
                        <p className="text-sm">
                          {format(new Date(stats.lastUpdated), 'dd MMMM yyyy à HH:mm', { locale: fr })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                {timelineData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Performance dans le temps</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={(value) => format(new Date(value), 'HH:mm')}
                          />
                          <YAxis />
                          <Tooltip
                            labelFormatter={(value) => format(new Date(value), 'dd/MM HH:mm')}
                          />
                          <Area
                            type="monotone"
                            dataKey="sent"
                            stackId="1"
                            stroke="#3B82F6"
                            fill="#3B82F6"
                            fillOpacity={0.6}
                            name="Envoyés"
                          />
                          <Area
                            type="monotone"
                            dataKey="opened"
                            stackId="2"
                            stroke="#10B981"
                            fill="#10B981"
                            fillOpacity={0.6}
                            name="Ouverts"
                          />
                          <Area
                            type="monotone"
                            dataKey="clicked"
                            stackId="3"
                            stroke="#8B5CF6"
                            fill="#8B5CF6"
                            fillOpacity={0.6}
                            name="Cliqués"
                          />
                          <Area
                            type="monotone"
                            dataKey="converted"
                            stackId="4"
                            stroke="#F59E0B"
                            fill="#F59E0B"
                            fillOpacity={0.6}
                            name="Convertis"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="content" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Contenu de l'email</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Objet</label>
                        <p className="text-sm p-3 bg-gray-50 rounded-lg">{campaign.subject}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Corps du message</label>
                        <div className="p-3 bg-gray-50 rounded-lg max-h-96 overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap">{campaign.body}</pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recipients" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Destinataires
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900">
                        {campaign.recipientCount?.toLocaleString()} destinataires
                      </p>
                      <p className="text-sm text-gray-500">
                        Segment : {campaign.recipientSegment?.name || 'Tous les contacts'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}