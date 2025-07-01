import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles, Play, Pause, X, Download, RefreshCw, AlertCircle, CheckCircle, Clock, Package } from 'lucide-react';
import { SimpleBatchProcessor, BatchProgress } from '@/lib/simple-batch-processor';
import { SEOProgressStorage } from '@/lib/seo-progress-storage';
import { Product } from '@/lib/woocommerce';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SEOGenerationPanelProps {
  products: Product[];
  onBatchComplete?: () => void;
}

export const SEOGenerationPanel: React.FC<SEOGenerationPanelProps> = ({ products, onBatchComplete }) => {
  const [batchProcessor] = useState(() => new SimpleBatchProcessor());
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [waitingNextBatch, setWaitingNextBatch] = useState(false);
  const [sessionStats, setSessionStats] = useState(SEOProgressStorage.getSessionStats());

  // Mettre à jour les stats de session régulièrement
  useEffect(() => {
    const interval = setInterval(() => {
      setSessionStats(SEOProgressStorage.getSessionStats());
    }, 5000); // Toutes les 5 secondes

    return () => clearInterval(interval);
  }, []);

  // Setup batch processor listeners
  useEffect(() => {
    const handleProgressUpdate = (progress: BatchProgress) => {
      setBatchProgress(progress);
      setSessionStats(SEOProgressStorage.getSessionStats());
    };

    const handleBatchStarted = () => {
      setIsGenerating(true);
      setWaitingNextBatch(false);
      toast.success('Génération SEO démarrée');
    };

    const handleBatchCompleted = (stats: any) => {
      setIsGenerating(false);
      setBatchProgress(null);
      setSessionStats(SEOProgressStorage.getSessionStats());
      
      if (stats.allAlreadyProcessed) {
        toast.info(`Tous les produits ont déjà été traités!`);
      } else {
        toast.success(`Génération SEO terminée! ${stats.completed} réussis, ${stats.failed} échecs`);
      }
      
      if (onBatchComplete) {
        onBatchComplete();
      }
    };

    const handleWaitingNextBatch = ({ waitTime, remaining }: any) => {
      setWaitingNextBatch(true);
      const seconds = Math.round(waitTime / 1000);
      toast.info(`Pause API: prochain batch dans ${seconds}s (${remaining} produits restants)`);
      setTimeout(() => setWaitingNextBatch(false), waitTime);
    };

    const handleProductCompleted = ({ product, index, total }: any) => {
      console.log(`SEO généré pour: ${product.name} (${index}/${total})`);
    };

    const handleProductFailed = ({ product, error, index, total }: any) => {
      console.error(`Échec SEO pour ${product.name} (${index}/${total}):`, error);
      toast.error(`Échec pour ${product.name}: ${error}`);
    };

    batchProcessor.on('progress-update', handleProgressUpdate);
    batchProcessor.on('batch-started', handleBatchStarted);
    batchProcessor.on('batch-completed', handleBatchCompleted);
    batchProcessor.on('waiting-next-batch', handleWaitingNextBatch);
    batchProcessor.on('product-completed', handleProductCompleted);
    batchProcessor.on('product-failed', handleProductFailed);

    return () => {
      batchProcessor.removeListener('progress-update', handleProgressUpdate);
      batchProcessor.removeListener('batch-started', handleBatchStarted);
      batchProcessor.removeListener('batch-completed', handleBatchCompleted);
      batchProcessor.removeListener('waiting-next-batch', handleWaitingNextBatch);
      batchProcessor.removeListener('product-completed', handleProductCompleted);
      batchProcessor.removeListener('product-failed', handleProductFailed);
    };
  }, [batchProcessor, onBatchComplete]);

  const handleStartGeneration = () => {
    if (!products || products.length === 0) {
      toast.error("Aucun produit à traiter");
      return;
    }

    batchProcessor.startBatch(products);
  };

  const handlePause = () => {
    batchProcessor.pause();
    toast.info("Génération SEO mise en pause");
  };

  const handleResume = () => {
    batchProcessor.resume();
    toast.info("Génération SEO reprise");
  };

  const handleCancel = () => {
    batchProcessor.cancel();
    setIsGenerating(false);
    setBatchProgress(null);
    toast.warning("Génération SEO annulée");
  };

  const handleClearSession = () => {
    if (isGenerating) {
      toast.error("Impossible d'effacer la session pendant le traitement");
      return;
    }
    
    SEOProgressStorage.clearProgress();
    setSessionStats(SEOProgressStorage.getSessionStats());
    toast.success("Session effacée");
  };

  const handleExportSession = () => {
    const data = SEOProgressStorage.exportSession();
    if (!data) {
      toast.error("Aucune session à exporter");
      return;
    }

    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seo-session-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Session exportée");
  };

  const formatElapsedTime = (ms: number) => {
    if (ms === 0) return "—";
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="space-y-4">
      {/* Stats de session */}
      {sessionStats.hasSession && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Session en cours</CardTitle>
              <Badge variant={
                sessionStats.status === 'completed' ? 'default' :
                sessionStats.status === 'paused' ? 'secondary' :
                'outline'
              }>
                {sessionStats.status === 'completed' ? 'Terminée' :
                 sessionStats.status === 'paused' ? 'En pause' :
                 'Active'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Traités</p>
                <p className="text-2xl font-bold text-green-600">{sessionStats.processedCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Échecs</p>
                <p className="text-2xl font-bold text-red-600">{sessionStats.failedCount}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{sessionStats.totalProducts}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Durée</p>
                <p className="text-2xl font-bold">{formatElapsedTime(sessionStats.elapsedTime)}</p>
              </div>
            </div>

            {sessionStats.percentComplete > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progression globale</span>
                  <span>{sessionStats.percentComplete}%</span>
                </div>
                <Progress value={sessionStats.percentComplete} className="h-2" />
              </div>
            )}

            {sessionStats.startedAt && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>
                  Démarrée {formatDistanceToNow(sessionStats.startedAt, { addSuffix: true, locale: fr })}
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleExportSession}
              >
                <Download className="mr-2 h-4 w-4" />
                Exporter
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleClearSession}
                disabled={isGenerating}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Panneau principal */}
      <Card>
        <CardHeader>
          <CardTitle>Génération SEO par IA</CardTitle>
          <CardDescription>
            {products.length} produits disponibles • 10 produits/minute • Gemini AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barre de progression active */}
          {isGenerating && batchProgress && (
            <div className="space-y-3">
              <Alert>
                <Package className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  {batchProgress.currentProduct && (
                    <div>
                      <strong>En cours:</strong> {batchProgress.currentProduct.name}
                      <br />
                      <span className="text-sm text-muted-foreground">
                        Produit {batchProgress.currentProduct.index} sur {batchProgress.total}
                      </span>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    Batch actuel: {batchProgress.completed}/{batchProgress.total} produits
                    {batchProgress.failed > 0 && ` (${batchProgress.failed} échecs)`}
                  </span>
                  <span>
                    {batchProgress.estimatedTimeRemaining && 
                      `~${Math.ceil(batchProgress.estimatedTimeRemaining / 60000)} min restantes`
                    }
                  </span>
                </div>
                <Progress 
                  value={(batchProgress.completed / batchProgress.total) * 100} 
                  className="h-3"
                />
              </div>

              {waitingNextBatch && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Pause API en cours - Respect de la limite de 10 produits/minute
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Informations */}
          {!isGenerating && !sessionStats.hasSession && (
            <Alert>
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                La génération SEO utilise l'IA Gemini pour créer automatiquement:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Titres optimisés (60 caractères max)</li>
                  <li>Descriptions courtes et complètes</li>
                  <li>Métadonnées Yoast SEO complètes</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!isGenerating ? (
              <Button 
                onClick={handleStartGeneration}
                disabled={!products || products.length === 0}
                className="flex-1"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {sessionStats.hasSession && sessionStats.processedCount > 0 
                  ? 'Continuer la génération' 
                  : 'Démarrer la génération'}
              </Button>
            ) : (
              <>
                {batchProcessor.isPausedStatus() ? (
                  <Button onClick={handleResume} variant="outline" className="flex-1">
                    <Play className="mr-2 h-4 w-4" />
                    Reprendre
                  </Button>
                ) : (
                  <Button onClick={handlePause} variant="outline" className="flex-1">
                    <Pause className="mr-2 h-4 w-4" />
                    Pause
                  </Button>
                )}
                <Button onClick={handleCancel} variant="destructive">
                  <X className="mr-2 h-4 w-4" />
                  Annuler
                </Button>
              </>
            )}
          </div>

          {/* Estimation de temps */}
          {!isGenerating && products.length > 0 && (
            <div className="text-sm text-muted-foreground text-center">
              <Clock className="inline h-4 w-4 mr-1" />
              Temps estimé pour {products.length} produits: 
              ~{Math.ceil(products.length / 10)} minutes 
              ({Math.ceil(products.length / 10 / 60)} heures)
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};