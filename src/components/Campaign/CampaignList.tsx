import { useState } from 'react';
import { Campaign } from '@/types/campaign';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { MoreHorizontal, BarChart3, Copy, Trash2, Pause, Play, Edit, Send } from 'lucide-react';
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
import { useCampaigns } from '@/hooks/useCampaignApi';
import CampaignStatusBadge from './CampaignStatusBadge';

interface CampaignListProps {
  campaigns: Campaign[];
  loading?: boolean;
  onSendCampaign?: (id: string) => void;
  onPauseCampaign?: (id: string) => void;
  onResumeCampaign?: (id: string) => void;
  onDeleteCampaign?: (id: string) => void;
}

export default function CampaignList({ 
  campaigns, 
  loading,
  onSendCampaign,
  onPauseCampaign,
  onResumeCampaign,
  onDeleteCampaign
}: CampaignListProps) {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);

  const handleDeleteClick = (e: React.MouseEvent, campaign: Campaign) => {
    e.stopPropagation();
    setCampaignToDelete(campaign);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (campaignToDelete) {
      onDeleteCampaign?.(campaignToDelete.id);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    }
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
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Campagne</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-center">Envoyés</TableHead>
          <TableHead className="text-center">Ouvertures</TableHead>
          <TableHead className="text-center">Clics</TableHead>
          <TableHead className="text-center">Bounces</TableHead>
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
            <TableCell>
              <CampaignStatusBadge status={campaign.status} />
            </TableCell>
            <TableCell className="text-center font-medium">
              <div>
                <p className="font-medium">{campaign.sentCount}</p>
                <p className="text-xs text-muted-foreground">
                  sur {campaign.totalRecipients}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div>
                <p className="font-medium">{campaign.openedCount}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMetric(campaign.openedCount, campaign.sentCount)}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div>
                <p className="font-medium">{campaign.clickedCount}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMetric(campaign.clickedCount, campaign.sentCount)}
                </p>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <div>
                <p className="font-medium text-red-600">{campaign.bouncedCount}</p>
                <p className="text-xs text-muted-foreground">
                  {formatMetric(campaign.bouncedCount, campaign.sentCount)}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <p className="text-sm">
                {campaign.createdAt ? 
                  formatDistance(new Date(campaign.createdAt), new Date(), {
                    addSuffix: true,
                    locale: fr,
                  })
                  : 'N/A'
                }
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
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/campaigns/${campaign.id}/edit`);
                  }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  {(campaign.status === 'DRAFT' || campaign.status === 'SCHEDULED') && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onSendCampaign?.(campaign.id);
                    }}>
                      <Send className="h-4 w-4 mr-2" />
                      Envoyer maintenant
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                    <Copy className="h-4 w-4 mr-2" />
                    Dupliquer
                  </DropdownMenuItem>
                  {campaign.status === 'SENDING' && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onPauseCampaign?.(campaign.id);
                    }}>
                      <Pause className="h-4 w-4 mr-2" />
                      Mettre en pause
                    </DropdownMenuItem>
                  )}
                  {campaign.status === 'PAUSED' && (
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      onResumeCampaign?.(campaign.id);
                    }}>
                      <Play className="h-4 w-4 mr-2" />
                      Reprendre
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={(e) => handleDeleteClick(e, campaign)}
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

    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer cette campagne ?</AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. La campagne "{campaignToDelete?.name}" sera définitivement supprimée.
            {campaignToDelete?.status === 'SENT' && (
              <span className="block mt-2 font-semibold text-yellow-600">
                ⚠️ Attention : Cette campagne a déjà été envoyée. Les statistiques seront perdues.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirmDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}