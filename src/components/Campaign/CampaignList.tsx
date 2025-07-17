import { useState } from 'react';
import { Campaign } from '@/types/campaign';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { MoreHorizontal, BarChart3, Copy, Trash2, Pause, Play, Edit } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDistance } from 'date-fns';
import { fr } from 'date-fns/locale';

interface CampaignListProps {
  campaigns: Campaign[];
  loading?: boolean;
}

export default function CampaignList({ campaigns, loading }: CampaignListProps) {
  const navigate = useNavigate();

  const getStatusBadge = (status: Campaign['status']) => {
    const statusConfig = {
      draft: { label: 'Brouillon', variant: 'secondary' as const },
      scheduled: { label: 'Programmée', variant: 'outline' as const },
      sending: { label: 'En cours', variant: 'default' as const },
      sent: { label: 'Envoyée', variant: 'success' as const },
      paused: { label: 'En pause', variant: 'warning' as const },
    };

    const config = statusConfig[status];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatMetric = (value: number, total: number): string => {
    if (total === 0) return '0%';
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campagne</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-center">Envoyés</TableHead>
          <TableHead className="text-center">Ouvertures</TableHead>
          <TableHead className="text-center">Clics</TableHead>
          <TableHead className="text-center">Conversions</TableHead>
          <TableHead className="text-right">Revenus</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {campaigns.map((campaign) => (
          <TableRow
            key={campaign.id}
            className="cursor-pointer"
            onClick={() => navigate(`/campaigns/${campaign.id}`)}
          >
            <TableCell>
              <div>
                <p className="font-medium">{campaign.name}</p>
                <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                  {campaign.subject}
                </p>
              </div>
            </TableCell>
            <TableCell>{getStatusBadge(campaign.status)}</TableCell>
            <TableCell className="text-center font-medium">
              {campaign.stats.sent}
            </TableCell>
            <TableCell className="text-center">
              <div>
                <p className="font-medium">{campaign.stats.opened}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMetric(campaign.stats.opened, campaign.stats.delivered)}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div>
                <p className="font-medium">{campaign.stats.clicked}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMetric(campaign.stats.clicked, campaign.stats.opened)}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div>
                <p className="font-medium">{campaign.stats.converted}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMetric(campaign.stats.converted, campaign.stats.clicked)}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-right font-medium">
              {campaign.stats.revenue.toFixed(0)}€
            </TableCell>
            <TableCell>
              <p className="text-sm">
                {formatDistance(new Date(campaign.createdAt), new Date(), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/campaigns/${campaign.id}`);
                  }}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Voir les statistiques
                  </DropdownMenuItem>
                  {campaign.status === 'draft' && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/campaigns/${campaign.id}/edit`);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <Copy className="h-4 w-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                  {campaign.status === 'sending' && (
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Pause className="h-4 w-4 mr-2" />
                      Mettre en pause
                    </DropdownMenuItem>
                  )}
                  {campaign.status === 'paused' && (
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Play className="h-4 w-4 mr-2" />
                      Reprendre
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}