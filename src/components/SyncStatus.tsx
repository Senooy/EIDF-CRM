import React, { useState } from 'react';
import { 
  RefreshCw, 
  Database, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Loader2,
  HardDrive,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSyncStatus } from '@/hooks/useCachedData';
import { syncService, SyncProgress } from '@/lib/services/sync-service';
import { cacheDB } from '@/lib/db/cache-db';
import { useActiveSite } from '@/hooks/useActiveSite';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export function SyncStatusButton() {
  const { syncStatus, cacheSize, isSyncing } = useSyncStatus();
  const { activeSite } = useActiveSite();
  const [open, setOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const handleSync = async () => {
    if (!activeSite?.id || isSyncing) return;

    try {
      // Réinitialiser les métadonnées pour forcer la synchronisation
      await cacheDB.syncMetadata.where('siteId').equals(activeSite.id).delete();
      
      await syncService.syncAll(activeSite.id, {
        dataTypes: ['orders', 'products', 'customers'], // Focus sur WooCommerce
        forceFullSync: true, // Forcer la synchronisation complète
        onProgress: setSyncProgress,
        silent: false
      });
      setSyncProgress(null);
      toast.success('Synchronisation terminée avec succès');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation');
      setSyncProgress(null);
    }
  };

  const getStatusIcon = () => {
    if (isSyncing) return <Loader2 className="h-4 w-4 animate-spin" />;
    
    const hasErrors = Object.values(syncStatus).some(s => s.status === 'error');
    if (hasErrors) return <AlertCircle className="h-4 w-4 text-destructive" />;
    
    const allSynced = Object.values(syncStatus).every(s => s.status === 'completed');
    if (allSynced) return <CheckCircle className="h-4 w-4 text-green-500" />;
    
    return <Database className="h-4 w-4" />;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {getStatusIcon()}
          <span className="hidden sm:inline">Sync</span>
          <Badge variant="secondary" className="ml-1">
            {cacheSize.totalItems.toLocaleString()}
          </Badge>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">État de la synchronisation</h3>
            <Button
              size="sm"
              onClick={handleSync}
              disabled={!activeSite || isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Synchronisation...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Synchroniser
                </>
              )}
            </Button>
          </div>

          {/* Progress */}
          {syncProgress && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{syncProgress.message}</span>
                <span>{syncProgress.percentage}%</span>
              </div>
              <Progress value={syncProgress.percentage} />
            </div>
          )}

          {/* Cache info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Cache local</span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{cacheSize.totalItems.toLocaleString()} éléments</p>
              <p className="text-xs text-muted-foreground">~{cacheSize.sizeEstimate}</p>
            </div>
          </div>

          {/* Sync status by type */}
          <div className="space-y-2">
            {Object.entries(syncStatus).map(([type, status]) => (
              <SyncStatusItem key={type} type={type} status={status} />
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SyncStatusItem({ type, status }: { type: string; status: any }) {
  const typeLabels: Record<string, string> = {
    orders: 'Commandes',
    products: 'Produits',
    customers: 'Clients',
    posts: 'Articles',
    pages: 'Pages',
    media: 'Médias',
    comments: 'Commentaires',
    users: 'Utilisateurs'
  };

  const getStatusBadge = () => {
    switch (status.status) {
      case 'completed':
        return <Badge variant="default" className="text-xs">Synchronisé</Badge>;
      case 'syncing':
        return <Badge variant="secondary" className="text-xs">En cours...</Badge>;
      case 'error':
        return <Badge variant="destructive" className="text-xs">Erreur</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">En attente</Badge>;
    }
  };

  const getTimeAgo = () => {
    if (!status.lastSync) return 'Jamais';
    return formatDistanceToNow(new Date(status.lastSync), { 
      addSuffix: true,
      locale: fr 
    });
  };

  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">{typeLabels[type] || type}</p>
          <p className="text-xs text-muted-foreground">
            {status.syncedCount || 0} / {status.totalCount || 0} • {getTimeAgo()}
          </p>
        </div>
      </div>
      {getStatusBadge()}
    </div>
  );
}

export function SyncStatusCard() {
  const { syncStatus, cacheSize, isSyncing, refresh } = useSyncStatus();
  const { activeSite } = useActiveSite();
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);

  const handleFullSync = async () => {
    if (!activeSite?.id || isSyncing) return;

    try {
      // Réinitialiser les métadonnées pour forcer la synchronisation
      await cacheDB.syncMetadata.where('siteId').equals(activeSite.id).delete();
      
      await syncService.syncAll(activeSite.id, {
        forceFullSync: true,
        onProgress: setSyncProgress
      });
      setSyncProgress(null);
      refresh();
      toast.success('Synchronisation complète terminée');
    } catch (error) {
      toast.error('Erreur lors de la synchronisation complète');
      setSyncProgress(null);
    }
  };

  const handleClearCache = async () => {
    if (!activeSite?.id) return;

    if (confirm('Êtes-vous sûr de vouloir vider le cache ? Toutes les données locales seront supprimées.')) {
      try {
        await cacheDB.clearSiteCache(activeSite.id);
        toast.success('Cache vidé avec succès');
        refresh();
      } catch (error) {
        toast.error('Erreur lors du vidage du cache');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Synchronisation des données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={handleFullSync}
            disabled={!activeSite || isSyncing}
            variant="default"
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Synchronisation en cours...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Synchronisation complète
              </>
            )}
          </Button>
          <Button
            onClick={handleClearCache}
            variant="outline"
            disabled={isSyncing}
          >
            Vider le cache
          </Button>
        </div>

        {/* Progress */}
        {syncProgress && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{syncProgress.message}</span>
              <span className="text-sm">{syncProgress.percentage}%</span>
            </div>
            <Progress value={syncProgress.percentage} />
            <p className="text-xs text-muted-foreground">
              {syncProgress.current} / {syncProgress.total} éléments
            </p>
          </div>
        )}

        {/* Cache stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Cache local</h4>
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Éléments en cache</span>
                <span className="font-medium">{cacheSize.totalItems.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taille estimée</span>
                <span className="font-medium">{cacheSize.sizeEstimate}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Dernière synchronisation</h4>
            <div className="space-y-1">
              {Object.entries(syncStatus).slice(0, 3).map(([type, status]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-muted-foreground capitalize">{type}</span>
                  <span className="font-medium">
                    {status.lastSync 
                      ? formatDistanceToNow(new Date(status.lastSync), { addSuffix: true, locale: fr })
                      : 'Jamais'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detailed status */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">État détaillé</h4>
          <div className="space-y-2">
            {Object.entries(syncStatus).map(([type, status]) => (
              <SyncStatusItem key={type} type={type} status={status} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}