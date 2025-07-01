import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Sparkles, Play, Pause, X, CheckCircle, XCircle, 
  Clock, Package, Loader2, Eye, AlertCircle, RotateCcw 
} from 'lucide-react';
import { SimpleBatchProcessor, BatchProgress, GeneratedContent } from '@/lib/simple-batch-processor';
import { SEOProgressStorage } from '@/lib/seo-progress-storage';
import { Product } from '@/lib/woocommerce';
import { SEOStyle, predefinedStyles } from '@/lib/gemini-single-call';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SEOGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  onComplete?: () => void;
}

export const SEOGenerationModal: React.FC<SEOGenerationModalProps> = ({ 
  isOpen, 
  onClose, 
  products,
  onComplete 
}) => {
  const [batchProcessor] = useState(() => new SimpleBatchProcessor());
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentBatchResults, setCurrentBatchResults] = useState<GeneratedContent[]>([]);
  const [isAutoMode, setIsAutoMode] = useState(false);
  const [waitingNextBatch, setWaitingNextBatch] = useState(false);
  const [waitingValidation, setWaitingValidation] = useState(false);
  const [timeUntilNextBatch, setTimeUntilNextBatch] = useState(0);
  const [expandedResult, setExpandedResult] = useState<number | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<SEOStyle>(predefinedStyles[0]);
  const [customGuidelines, setCustomGuidelines] = useState('');
  const [useCustomStyle, setUseCustomStyle] = useState(false);
  const [customTitleSuffix, setCustomTitleSuffix] = useState('');
  
  // Vérifier s'il y a une session en cours au chargement
  const sessionStats = SEOProgressStorage.getSessionStats();

  // Timer pour le compte à rebours
  useEffect(() => {
    if (waitingNextBatch && timeUntilNextBatch > 0) {
      const interval = setInterval(() => {
        setTimeUntilNextBatch(prev => Math.max(0, prev - 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [waitingNextBatch, timeUntilNextBatch]);

  // Setup batch processor listeners
  useEffect(() => {
    const handleProgressUpdate = (progress: BatchProgress) => {
      setBatchProgress(progress);
    };

    const handleBatchStarted = (data: any) => {
      setIsGenerating(true);
      setWaitingNextBatch(false);
      setWaitingValidation(false);
      setCurrentBatchResults([]);
      
      if (data && data.batchSize !== undefined) {
        const { batchSize, currentBatch, totalBatches } = data;
        toast.info(`Batch ${currentBatch}/${totalBatches} démarré (${batchSize} produits)`);
      } else {
        toast.info('Nouveau batch démarré');
      }
    };

    const handleBatchResults = ({ results, hasMore }: any) => {
      setCurrentBatchResults(results);
      if (!isAutoMode && hasMore) {
        setWaitingValidation(true);
      }
    };

    const handleAllBatchesCompleted = (stats: any) => {
      setIsGenerating(false);
      setBatchProgress(null);
      toast.success(`Génération terminée! ${stats.completed} réussis, ${stats.failed} échecs`);
      
      if (onComplete) {
        onComplete();
      }
    };

    const handleWaitingNextBatch = ({ waitTime, remaining }: any) => {
      setWaitingNextBatch(true);
      setTimeUntilNextBatch(waitTime);
      const seconds = Math.round(waitTime / 1000);
      toast.info(`Prochain batch dans ${seconds}s (${remaining} produits restants)`);
    };

    const handleWaitingValidation = () => {
      setWaitingValidation(true);
      toast.info("En attente de validation pour continuer");
    };

    const handleProductCompleted = ({ product, content }: any) => {
      console.log(`SEO généré pour: ${product.name}`);
      // Mettre à jour l'affichage en temps réel
      setCurrentBatchResults(prev => {
        const index = prev.findIndex(r => r.productId === product.id);
        if (index >= 0) {
          const newResults = [...prev];
          newResults[index] = content;
          return newResults;
        }
        return [...prev, content];
      });
    };

    const handleProductFailed = ({ product, error }: any) => {
      console.error(`Échec SEO pour ${product.name}:`, error);
    };

    batchProcessor.on('progress-update', handleProgressUpdate);
    batchProcessor.on('batch-started', handleBatchStarted);
    batchProcessor.on('batch-results', handleBatchResults);
    batchProcessor.on('all-batches-completed', handleAllBatchesCompleted);
    batchProcessor.on('waiting-next-batch', handleWaitingNextBatch);
    batchProcessor.on('waiting-validation', handleWaitingValidation);
    batchProcessor.on('product-completed', handleProductCompleted);
    batchProcessor.on('product-failed', handleProductFailed);

    return () => {
      batchProcessor.removeListener('progress-update', handleProgressUpdate);
      batchProcessor.removeListener('batch-started', handleBatchStarted);
      batchProcessor.removeListener('batch-results', handleBatchResults);
      batchProcessor.removeListener('all-batches-completed', handleAllBatchesCompleted);
      batchProcessor.removeListener('waiting-next-batch', handleWaitingNextBatch);
      batchProcessor.removeListener('waiting-validation', handleWaitingValidation);
      batchProcessor.removeListener('product-completed', handleProductCompleted);
      batchProcessor.removeListener('product-failed', handleProductFailed);
    };
  }, [batchProcessor, onComplete, isAutoMode]);

  const handleStart = () => {
    if (!products || products.length === 0) {
      toast.error("Aucun produit à traiter");
      return;
    }

    // Créer le style final
    let finalStyle = {...selectedStyle};
    
    // Ajouter le suffixe personnalisé s'il existe
    if (customTitleSuffix.trim()) {
      finalStyle.titleSuffix = customTitleSuffix.trim();
    }
    
    // Ajouter les directives personnalisées
    if (useCustomStyle && customGuidelines.trim()) {
      finalStyle = {
        ...finalStyle,
        name: "custom",
        description: "Style personnalisé",
        guidelines: customGuidelines
      };
    }

    console.log('[SEOGenerationModal] Style sélectionné:', finalStyle);
    console.log('[SEOGenerationModal] Use custom style:', useCustomStyle);
    console.log('[SEOGenerationModal] Custom guidelines:', customGuidelines);

    batchProcessor.setAutoMode(isAutoMode);
    batchProcessor.setStyle(finalStyle);
    batchProcessor.startBatch(products, finalStyle);
  };

  const handlePause = () => {
    batchProcessor.pause();
    toast.info("Génération mise en pause");
  };

  const handleResume = () => {
    batchProcessor.resume();
    toast.info("Génération reprise");
  };

  const handleCancel = () => {
    batchProcessor.cancel();
    setIsGenerating(false);
    setBatchProgress(null);
    setCurrentBatchResults([]);
    toast.warning("Génération annulée");
  };

  const handleValidateAndContinue = () => {
    setWaitingValidation(false);
    batchProcessor.validateAndContinue();
  };

  const handleAutoModeChange = (checked: boolean) => {
    setIsAutoMode(checked);
    batchProcessor.setAutoMode(checked);
  };

  const handleResetProgress = () => {
    if (isGenerating) {
      toast.error("Impossible de réinitialiser pendant le traitement");
      return;
    }
    
    // Effacer la progression dans localStorage
    SEOProgressStorage.clearProgress();
    
    // Réinitialiser l'état local
    setBatchProgress(null);
    setCurrentBatchResults([]);
    setWaitingValidation(false);
    setWaitingNextBatch(false);
    setTimeUntilNextBatch(0);
    
    toast.success("Progression réinitialisée. Tous les produits seront retraités.");
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Génération SEO par IA
            {batchProgress && (
              <Badge variant="outline">
                Batch {batchProgress.currentBatch}/{batchProgress.totalBatches}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {products.length} produits à traiter • 10 produits max par batch • Gemini AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Alerte session existante */}
          {!isGenerating && sessionStats.hasSession && sessionStats.processedCount > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>{sessionStats.processedCount} produits</strong> ont déjà été traités lors d'une session précédente.
                Ils seront automatiquement ignorés. 
                Utilisez le bouton <RotateCcw className="inline h-3 w-3" /> pour recommencer à zéro.
              </AlertDescription>
            </Alert>
          )}
          
          {/* Sélection du style SEO */}
          {!isGenerating && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="seo-style" className="text-sm font-medium mb-2 block">
                  Style de contenu SEO
                </Label>
                <Select 
                  value={selectedStyle.name} 
                  onValueChange={(value) => {
                    const style = predefinedStyles.find(s => s.name === value);
                    if (style) setSelectedStyle(style);
                  }}
                >
                  <SelectTrigger id="seo-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {predefinedStyles.map(style => (
                      <SelectItem key={style.name} value={style.name}>
                        <div>
                          <div className="font-medium">{style.description}</div>
                          <div className="text-xs text-muted-foreground">{style.tone}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedStyle && (
                  <div className="mt-2 p-3 bg-muted rounded-md text-sm">
                    <p className="font-medium mb-1">Directives :</p>
                    <p className="text-muted-foreground mb-2">{selectedStyle.guidelines}</p>
                    <p className="font-medium mb-1">Points d'attention :</p>
                    <p className="text-muted-foreground">{selectedStyle.focusPoints.join(', ')}</p>
                  </div>
                )}
              </div>
              
              {/* Suffixe personnalisé pour les titres */}
              <div className="space-y-2">
                <Label htmlFor="title-suffix" className="text-sm font-medium">
                  Suffixe des titres SEO (optionnel)
                </Label>
                <Input
                  id="title-suffix"
                  placeholder="Ex: | Eco Industrie France"
                  value={customTitleSuffix}
                  onChange={(e) => setCustomTitleSuffix(e.target.value)}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Ce texte sera ajouté à la fin de tous les titres SEO générés
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="custom-style"
                    checked={useCustomStyle}
                    onCheckedChange={setUseCustomStyle}
                  />
                  <Label htmlFor="custom-style" className="cursor-pointer">
                    Ajouter des directives personnalisées
                  </Label>
                </div>
                {useCustomStyle && (
                  <Textarea
                    placeholder="Ex: Mettez en avant l'utilité du produit pour les professionnels, expliquez comment il facilite leur travail quotidien..."
                    value={customGuidelines}
                    onChange={(e) => setCustomGuidelines(e.target.value)}
                    className="min-h-[100px]"
                  />
                )}
              </div>
            </div>
          )}
          
          {/* Progression globale */}
          {batchProgress && isGenerating && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression totale: {batchProgress.completed}/{batchProgress.total} produits</span>
                <span>
                  {batchProgress.estimatedTimeRemaining && 
                    `~${Math.ceil(batchProgress.estimatedTimeRemaining / 60000)} min restantes`
                  }
                </span>
              </div>
              <Progress 
                value={(batchProgress.completed / batchProgress.total) * 100} 
                className="h-2"
              />
            </div>
          )}

          {/* Produit en cours */}
          {batchProgress?.currentProduct && isGenerating && !waitingValidation && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                <strong>En cours:</strong> {batchProgress.currentProduct.name}
                <br />
                <span className="text-sm text-muted-foreground">
                  Produit {batchProgress.currentProduct.index + 1} sur {batchProgress.total}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Timer prochain batch */}
          {waitingNextBatch && timeUntilNextBatch > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Prochain batch dans: <strong>{formatTime(timeUntilNextBatch)}</strong>
                <br />
                <span className="text-sm">Respect de la limite API (10 produits/minute)</span>
              </AlertDescription>
            </Alert>
          )}

          {/* Mode automatique */}
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-mode"
              checked={isAutoMode}
              onCheckedChange={handleAutoModeChange}
              disabled={isGenerating}
            />
            <Label htmlFor="auto-mode" className="cursor-pointer">
              Mode automatique (continue sans validation)
            </Label>
          </div>

          {/* Résultats du batch actuel */}
          {currentBatchResults.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3">Résultats du batch actuel:</h3>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {currentBatchResults.map((result, index) => (
                      <div key={result.productId} className="space-y-2">
                        <div className="flex items-start gap-2">
                          {result.success ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{result.productName}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedResult(
                                  expandedResult === result.productId ? null : result.productId
                                )}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            {result.success ? (
                              <div className="text-sm text-muted-foreground">
                                <p><strong>Titre:</strong> {result.title}</p>
                                {expandedResult === result.productId && (
                                  <div className="mt-2 space-y-1">
                                    <p><strong>Description courte:</strong> {result.shortDescription}</p>
                                    <p><strong>Meta titre:</strong> {result.seo.metaTitle}</p>
                                    <p><strong>Meta description:</strong> {result.seo.metaDescription}</p>
                                    <p><strong>Mot-clé principal:</strong> {result.seo.focusKeyphrase}</p>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-red-600">Erreur: {result.error}</p>
                            )}
                          </div>
                        </div>
                        {index < currentBatchResults.length - 1 && <Separator />}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Attente de validation */}
          {waitingValidation && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Batch terminé! Vérifiez les résultats ci-dessus et cliquez sur "Valider et continuer" pour le prochain batch.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="sm:flex-col sm:space-y-2">
          {!isGenerating ? (
            <div className="flex gap-2 w-full">
              <Button onClick={handleStart} className="flex-1">
                <Sparkles className="mr-2 h-4 w-4" />
                Démarrer la génération
              </Button>
              <Button 
                onClick={handleResetProgress} 
                variant="outline" 
                title="Réinitialiser la progression (tous les produits seront retraités)"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex gap-2 w-full">
              {waitingValidation ? (
                <Button 
                  onClick={handleValidateAndContinue} 
                  className="flex-1"
                  variant="default"
                >
                  Valider et continuer
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
                </>
              )}
              <Button onClick={handleCancel} variant="destructive">
                <X className="mr-2 h-4 w-4" />
                Annuler
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};