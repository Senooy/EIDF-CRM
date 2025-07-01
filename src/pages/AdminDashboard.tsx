import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  CreditCard, 
  TrendingUp,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AdminStats {
  totalOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  monthlyRevenue: number;
  organizationsByPlan: Record<string, number>;
  recentSignups: number;
}

interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  users: number;
  createdAt: string;
  mrr: number;
  lastActive?: string;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      
      // This would require admin-specific endpoints
      // For demo, we'll mock the data
      const mockStats: AdminStats = {
        totalOrganizations: 42,
        totalUsers: 156,
        activeSubscriptions: 38,
        monthlyRevenue: 3750,
        organizationsByPlan: {
          FREE: 4,
          STARTER: 15,
          PROFESSIONAL: 18,
          ENTERPRISE: 5,
        },
        recentSignups: 12,
      };

      const mockOrgs: OrganizationRow[] = [
        {
          id: '1',
          name: 'Demo Store Free',
          slug: 'demo-store-free',
          plan: 'FREE',
          status: 'ACTIVE',
          users: 1,
          createdAt: '2024-01-15',
          mrr: 0,
          lastActive: '2024-01-20',
        },
        {
          id: '2',
          name: 'Demo Store Pro',
          slug: 'demo-store-pro',
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
          users: 5,
          createdAt: '2024-01-10',
          mrr: 99,
          lastActive: '2024-01-19',
        },
        {
          id: '3',
          name: 'Tech Boutique',
          slug: 'tech-boutique',
          plan: 'STARTER',
          status: 'ACTIVE',
          users: 3,
          createdAt: '2024-01-08',
          mrr: 29,
          lastActive: '2024-01-20',
        },
        {
          id: '4',
          name: 'Fashion Store',
          slug: 'fashion-store',
          plan: 'ENTERPRISE',
          status: 'ACTIVE',
          users: 12,
          createdAt: '2023-12-01',
          mrr: 299,
          lastActive: '2024-01-20',
        },
        {
          id: '5',
          name: 'Old Shop',
          slug: 'old-shop',
          plan: 'STARTER',
          status: 'CANCELLED',
          users: 2,
          createdAt: '2023-11-15',
          mrr: 0,
          lastActive: '2023-12-31',
        },
      ];

      setStats(mockStats);
      setOrganizations(mockOrgs);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      toast.error('Erreur lors du chargement des données admin');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         org.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || org.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || org.status === statusFilter;
    
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'CANCELLED':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'PAST_DUE':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, any> = {
      FREE: 'secondary',
      STARTER: 'default',
      PROFESSIONAL: 'default',
      ENTERPRISE: 'default',
    };
    
    return (
      <Badge variant={variants[plan] || 'default'}>
        {plan}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container py-8 space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard Administrateur</h1>
        <p className="text-muted-foreground">
          Vue d'ensemble de toutes les organisations
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Organisations
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrganizations}</div>
            <p className="text-xs text-muted-foreground">
              +{stats?.recentSignups} ce mois
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Utilisateurs totaux
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Moyenne: {stats && Math.round(stats.totalUsers / stats.totalOrganizations)} par org
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Abonnements actifs
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">
              {stats && Math.round((stats.activeSubscriptions / stats.totalOrganizations) * 100)}% payants
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              MRR
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.monthlyRevenue}€</div>
            <p className="text-xs text-muted-foreground">
              Revenue mensuel récurrent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Organizations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organisations</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les plans</SelectItem>
                  <SelectItem value="FREE">Free</SelectItem>
                  <SelectItem value="STARTER">Starter</SelectItem>
                  <SelectItem value="PROFESSIONAL">Pro</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="ACTIVE">Actif</SelectItem>
                  <SelectItem value="CANCELLED">Annulé</SelectItem>
                  <SelectItem value="PAST_DUE">En retard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Utilisateurs</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Créée le</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrganizations.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{org.name}</p>
                      <p className="text-sm text-muted-foreground">{org.slug}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getPlanBadge(org.plan)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(org.status)}
                      <span className="text-sm">{org.status}</span>
                    </div>
                  </TableCell>
                  <TableCell>{org.users}</TableCell>
                  <TableCell>{org.mrr}€</TableCell>
                  <TableCell>{org.createdAt}</TableCell>
                  <TableCell>{org.lastActive || '-'}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">
                      Détails
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Distribution */}
      <div className="grid gap-8 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Répartition par plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats && Object.entries(stats.organizationsByPlan).map(([plan, count]) => (
                <div key={plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getPlanBadge(plan)}
                    <span className="text-sm text-muted-foreground">
                      {Math.round((count / stats.totalOrganizations) * 100)}%
                    </span>
                  </div>
                  <span className="font-medium">{count} orgs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Gérer les utilisateurs globaux
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <CreditCard className="w-4 h-4 mr-2" />
              Configurer les plans tarifaires
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <Activity className="w-4 h-4 mr-2" />
              Voir les logs système
            </Button>
            <Button className="w-full justify-start" variant="outline">
              <AlertCircle className="w-4 h-4 mr-2" />
              Gérer les alertes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}