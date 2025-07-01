import { useState } from 'react';
import { Loader2, Sparkles, Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useGenerateProductContent } from '@/hooks/use-ai-generation';
import { Product } from '@/lib/woocommerce';
import { GeneratedProductContent } from '@/lib/gemini-service';
import { extractYoastSEOData } from '@/lib/yoast-seo-helper';

interface AIContentGeneratorProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onApply: (content: Partial<GeneratedProductContent>) => void;
}

export function AIContentGenerator({
  product,
  isOpen,
  onClose,
  onApply,
}: AIContentGeneratorProps) {
  const [generatedContent, setGeneratedContent] = useState<GeneratedProductContent | null>(null);
  const [editedContent, setEditedContent] = useState<Partial<GeneratedProductContent>>({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set(['title', 'description', 'shortDescription', 'seo']));

  const generateContent = useGenerateProductContent();

  const handleGenerate = async () => {
    try {
      const result = await generateContent.mutateAsync({ product });
      setGeneratedContent(result);
      setEditedContent(result);
    } catch (error) {
      console.error('Failed to generate content:', error);
    }
  };

  const handleFieldToggle = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleApply = () => {
    const contentToApply: Partial<GeneratedProductContent> = {};
    
    if (selectedFields.has('title') && editedContent.title) {
      contentToApply.title = editedContent.title;
    }
    if (selectedFields.has('description') && editedContent.description) {
      contentToApply.description = editedContent.description;
    }
    if (selectedFields.has('shortDescription') && editedContent.shortDescription) {
      contentToApply.shortDescription = editedContent.shortDescription;
    }
    if (selectedFields.has('seo') && editedContent.seo) {
      contentToApply.seo = editedContent.seo;
    }

    onApply(contentToApply);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Générateur de contenu IA
          </DialogTitle>
          <DialogDescription>
            Générer du contenu optimisé pour "{product.name}" avec l'intelligence artificielle
            {extractYoastSEOData(product.meta_data) && (
              <span className="text-xs text-muted-foreground block mt-1">
                (Ce produit a déjà des métadonnées SEO Yoast)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {!generatedContent ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Cliquez sur générer pour créer du contenu optimisé SEO pour ce produit
                </p>
                <p className="text-xs text-muted-foreground">
                  Produit actuel : {product.name}
                </p>
              </div>
              <Button onClick={handleGenerate} disabled={generateContent.isPending}>
                {generateContent.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer le contenu
                  </>
                )}
              </Button>
              {generateContent.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    Échec de la génération du contenu. Veuillez réessayer.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium">Sélectionnez les champs à mettre à jour :</h3>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Régénérer
                </Button>
              </div>

              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">Contenu</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  {/* Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="title" className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.has('title')}
                          onChange={() => handleFieldToggle('title')}
                          className="rounded border-gray-300"
                        />
                        Titre du produit
                      </Label>
                      <Badge variant="outline">
                        {editedContent.title?.length || 0} caractères
                      </Badge>
                    </div>
                    <Input
                      id="title"
                      value={editedContent.title || ''}
                      onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                      disabled={!selectedFields.has('title')}
                      placeholder="Titre du produit"
                    />
                    <p className="text-xs text-muted-foreground">
                      Original : {product.name}
                    </p>
                  </div>

                  {/* Short Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="shortDescription" className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.has('shortDescription')}
                          onChange={() => handleFieldToggle('shortDescription')}
                          className="rounded border-gray-300"
                        />
                        Description courte
                      </Label>
                      <Badge variant="outline">
                        {editedContent.shortDescription?.length || 0} caractères
                      </Badge>
                    </div>
                    <Textarea
                      id="shortDescription"
                      value={editedContent.shortDescription || ''}
                      onChange={(e) => setEditedContent({ ...editedContent, shortDescription: e.target.value })}
                      disabled={!selectedFields.has('shortDescription')}
                      rows={2}
                      placeholder="Résumé du produit"
                    />
                  </div>

                  {/* Full Description */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="description" className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFields.has('description')}
                          onChange={() => handleFieldToggle('description')}
                          className="rounded border-gray-300"
                        />
                        Description complète
                      </Label>
                      <Badge variant="outline">
                        {editedContent.description?.length || 0} caractères
                      </Badge>
                    </div>
                    <Textarea
                      id="description"
                      value={editedContent.description || ''}
                      onChange={(e) => setEditedContent({ ...editedContent, description: e.target.value })}
                      disabled={!selectedFields.has('description')}
                      rows={6}
                      placeholder="Description détaillée du produit"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={selectedFields.has('seo')}
                      onChange={() => handleFieldToggle('seo')}
                      className="rounded border-gray-300"
                    />
                    <Label>Appliquer les modifications SEO</Label>
                  </div>

                  {editedContent.seo && (
                    <>
                      {/* Meta Title */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="metaTitle">Titre Meta</Label>
                          <Badge variant="outline">
                            {editedContent.seo.metaTitle?.length || 0}/60 caractères
                          </Badge>
                        </div>
                        <Input
                          id="metaTitle"
                          value={editedContent.seo.metaTitle || ''}
                          onChange={(e) => setEditedContent({
                            ...editedContent,
                            seo: { ...editedContent.seo!, metaTitle: e.target.value }
                          })}
                          disabled={!selectedFields.has('seo')}
                          placeholder="Titre optimisé pour les moteurs de recherche"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommandé : 50-60 caractères
                        </p>
                      </div>

                      {/* Meta Description */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="metaDescription">Description Meta</Label>
                          <Badge variant="outline">
                            {editedContent.seo.metaDescription?.length || 0}/160 caractères
                          </Badge>
                        </div>
                        <Textarea
                          id="metaDescription"
                          value={editedContent.seo.metaDescription || ''}
                          onChange={(e) => setEditedContent({
                            ...editedContent,
                            seo: { ...editedContent.seo!, metaDescription: e.target.value }
                          })}
                          disabled={!selectedFields.has('seo')}
                          rows={3}
                          placeholder="Description qui apparaîtra dans les résultats de recherche"
                        />
                        <p className="text-xs text-muted-foreground">
                          Recommandé : 150-160 caractères
                        </p>
                      </div>

                      {/* Keywords */}
                      <div className="space-y-2">
                        <Label htmlFor="keywords">Mots-clés</Label>
                        <Input
                          id="keywords"
                          value={editedContent.seo.keywords?.join(', ') || ''}
                          onChange={(e) => {
                            const keywords = e.target.value
                              .split(',')
                              .map(k => k.trim())
                              .filter(k => k.length > 0);
                            setEditedContent({
                              ...editedContent,
                              seo: { ...editedContent.seo!, keywords }
                            });
                          }}
                          disabled={!selectedFields.has('seo')}
                          placeholder="mot-clé1, mot-clé2, mot-clé3..."
                        />
                        <p className="text-xs text-muted-foreground">
                          Séparez les mots-clés par des virgules (5-8 mots-clés recommandés)
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {editedContent.seo.keywords?.map((keyword, index) => (
                            <Badge key={index} variant="secondary">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Focus Keyphrase */}
                      <div className="space-y-2">
                        <Label htmlFor="focusKeyphrase">Phrase clé principale</Label>
                        <Input
                          id="focusKeyphrase"
                          value={editedContent.seo.focusKeyphrase || ''}
                          onChange={(e) => setEditedContent({
                            ...editedContent,
                            seo: { ...editedContent.seo!, focusKeyphrase: e.target.value }
                          })}
                          disabled={!selectedFields.has('seo')}
                          placeholder="Phrase clé principale pour le référencement"
                        />
                        <p className="text-xs text-muted-foreground">
                          La phrase clé principale sur laquelle vous souhaitez vous positionner
                        </p>
                      </div>
                    </>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          {generatedContent && (
            <Button onClick={handleApply} disabled={selectedFields.size === 0}>
              <Check className="mr-2 h-4 w-4" />
              Appliquer la sélection ({selectedFields.size})
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}