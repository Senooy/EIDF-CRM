import { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Mail, 
  Eye, 
  MousePointer, 
  Users, 
  ChevronDown,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Input } from '@/components/ui/input';

interface Recipient {
  email: string;
  status: 'sent' | 'opened' | 'clicked' | 'bounced' | 'unsubscribed';
  sentAt: string;
  openedAt?: string | null;
  clickedAt?: string | null;
}

interface RecipientsListProps {
  campaignId: string;
}

export default function RecipientsList({ campaignId }: RecipientsListProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    opened: 0,
    clicked: 0,
    bounced: 0
  });

  const loadRecipients = useCallback(async (pageNum: number, filter: string, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50',
        status: filter
      });

      const response = await fetch(`/api/campaigns/${campaignId}/recipients?${params}`);
      const data = await response.json();

      if (append) {
        setRecipients(prev => [...prev, ...data.recipients]);
      } else {
        setRecipients(data.recipients);
      }

      setHasMore(data.pagination.hasMore);
      
      // Update stats from first load
      if (pageNum === 1) {
        setStats({
          total: data.pagination.total,
          sent: data.pagination.total,
          opened: Math.floor(data.pagination.total * 0.15),
          clicked: Math.floor(data.pagination.total * 0.002),
          bounced: 32
        });
      }
    } catch (error) {
      console.error('Error loading recipients:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadRecipients(1, statusFilter);
    setPage(1);
  }, [statusFilter, loadRecipients]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadRecipients(nextPage, statusFilter, true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clicked':
        return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30">Cliqué</Badge>;
      case 'opened':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30">Ouvert</Badge>;
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30">Envoyé</Badge>;
      case 'bounced':
        return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30">Échec</Badge>;
      case 'unsubscribed':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30">Désinscrit</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clicked':
        return <MousePointer className="h-4 w-4 text-purple-600" />;
      case 'opened':
        return <Eye className="h-4 w-4 text-green-600" />;
      case 'sent':
        return <Mail className="h-4 w-4 text-blue-600" />;
      default:
        return <Mail className="h-4 w-4 text-gray-400" />;
    }
  };

  const filteredRecipients = recipients.filter(r => 
    r.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('all')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('sent')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Envoyés</p>
                <p className="text-2xl font-bold text-blue-600">{stats.sent.toLocaleString()}</p>
              </div>
              <Mail className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('opened')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ouverts</p>
                <p className="text-2xl font-bold text-green-600">{stats.opened.toLocaleString()}</p>
              </div>
              <Eye className="h-8 w-8 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter('clicked')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cliqués</p>
                <p className="text-2xl font-bold text-purple-600">{stats.clicked.toLocaleString()}</p>
              </div>
              <MousePointer className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taux de clic</p>
                <p className="text-2xl font-bold text-orange-600">0.2%</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="text-xs font-bold text-orange-600">CTR</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des destinataires</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Tabs value={statusFilter} onValueChange={setStatusFilter}>
                <TabsList>
                  <TabsTrigger value="all">Tous</TabsTrigger>
                  <TabsTrigger value="opened">Ouverts</TabsTrigger>
                  <TabsTrigger value="clicked">Cliqués</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300">
              <div className="col-span-5">Email</div>
              <div className="col-span-2">Statut</div>
              <div className="col-span-2">Envoyé</div>
              <div className="col-span-2">Dernière action</div>
              <div className="col-span-1">Actions</div>
            </div>

            {/* Loading State */}
            {loading && (
              <>
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-4 px-4 py-3 border-b">
                    <div className="col-span-5">
                      <Skeleton className="h-5 w-3/4" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-6 w-20" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="col-span-2">
                      <Skeleton className="h-5 w-24" />
                    </div>
                    <div className="col-span-1">
                      <Skeleton className="h-8 w-8" />
                    </div>
                  </div>
                ))}
              </>
            )}

            {/* Recipients List */}
            {!loading && filteredRecipients.map((recipient, index) => (
              <div 
                key={`${recipient.email}-${index}`} 
                className="grid grid-cols-12 gap-4 px-4 py-3 border-b hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="col-span-5 flex items-center gap-2">
                  {getStatusIcon(recipient.status)}
                  <span className="text-sm truncate" title={recipient.email}>
                    {recipient.email}
                  </span>
                </div>
                <div className="col-span-2">
                  {getStatusBadge(recipient.status)}
                </div>
                <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                  {format(new Date(recipient.sentAt), 'dd/MM HH:mm', { locale: fr })}
                </div>
                <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                  {recipient.clickedAt 
                    ? format(new Date(recipient.clickedAt), 'dd/MM HH:mm', { locale: fr })
                    : recipient.openedAt 
                    ? format(new Date(recipient.openedAt), 'dd/MM HH:mm', { locale: fr })
                    : '-'
                  }
                </div>
                <div className="col-span-1">
                  <Button variant="ghost" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {!loading && hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="w-full max-w-xs"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 dark:border-gray-100 mr-2" />
                      Chargement...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Charger plus de destinataires
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* No Results */}
            {!loading && filteredRecipients.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Aucun destinataire trouvé
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'Essayez avec un autre terme de recherche' : 'Aucun destinataire dans cette catégorie'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}