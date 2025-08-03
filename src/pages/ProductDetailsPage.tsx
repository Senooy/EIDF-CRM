import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getProductById, Product, updateProduct, UpdateProductPayload } from '@/lib/woocommerce';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/utils';
import { ChevronLeft, ExternalLink, Package, Tag, Palette, Weight, Ruler, Info, Edit, Save, X, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AIContentGenerator } from '@/components/Products/AIContentGenerator';
import { GeneratedProductContent } from '@/lib/gemini-service';
import { formatSEOForYoast } from '@/lib/yoast-seo-helper';

// Helper to safely render HTML content
const createMarkup = (htmlContent: string | undefined) => {
  return { __html: htmlContent || '' };
};

const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const productId = parseInt(id || '0', 10);
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<UpdateProductPayload>>({});
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const { data: product, isLoading, error, isError } = useQuery<Product, Error>({
    queryKey: ['product', productId],
    queryFn: () => getProductById(productId),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (product && !isEditing) {
      setEditData({
        name: product.name,
        description: product.description,
        short_description: product.short_description,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status,
        sku: product.sku,
      });
    }
  }, [product, isEditing]);

  const mutation = useMutation({
    mutationFn: (payload: UpdateProductPayload) => updateProduct(productId, payload),
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] }); 
      setIsEditing(false);
      toast.success("Produit mis à jour avec succès !");
    },
    onError: (error) => {
      console.error("Failed to update product:", error);
      toast.error(`Erreur lors de la mise à jour: ${error.message}`);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleStockQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     const { name, value } = e.target;
     const quantity = value === '' ? null : parseInt(value, 10);
     setEditData(prev => ({ ...prev, [name]: isNaN(quantity as number) ? prev.stock_quantity : quantity }));
  };

  const handleSelectChange = (name: keyof UpdateProductPayload, value: string) => {
    if (name === 'stock_status') {
      setEditData(prev => ({ 
        ...prev, 
        stock_status: value as 'instock' | 'outofstock' | 'onbackorder' 
      }));
    } else {
      setEditData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveChanges = () => {
    const payload: UpdateProductPayload = {};
    let hasChanges = false;

    if (!product) return; // Guard clause if product data isn't loaded

    // Iterate over the keys in the edited data
    for (const key in editData) {
      const typedKey = key as keyof UpdateProductPayload;
      const originalValue = product[typedKey as keyof Product];
      const editedValue = editData[typedKey];

      // Compare edited value with the original product value
      // Need careful comparison for null/undefined/empty strings
      let valueChanged = false;
      if (typedKey === 'stock_quantity') {
        // Treat null and empty string as the same for comparison if needed, 
        // but send the correct type (null or number)
        const originalStock = originalValue === null ? '' : originalValue;
        const editedStock = editedValue === null ? '' : editedValue;
        valueChanged = String(originalStock) !== String(editedStock);
      } else if (typedKey === 'sale_price' || typedKey === 'regular_price') {
        const originalPrice = originalValue || ""; // Treat null/undefined as empty string
        const editedPrice = editedValue || "";     // Treat null/undefined as empty string
        valueChanged = originalPrice !== editedPrice;
      } else {
        // Standard comparison for other fields like name, description, sku, stock_status
        valueChanged = originalValue !== editedValue;
      }

      if (valueChanged) {
        hasChanges = true;
        // Assign value to payload, handling specific types
        if (typedKey === 'sale_price' || typedKey === 'regular_price') {
          // Send null if the price is empty, otherwise send the string value
          payload[typedKey] = editedValue ? String(editedValue) : null;
        } else if (typedKey === 'stock_quantity'){
           // Already number or null in editData state
           payload[typedKey] = editedValue as number | null;
        } else if (typedKey === 'stock_status'){
           payload[typedKey] = editedValue as 'instock' | 'outofstock' | 'onbackorder';
        } else {
           // For other string types like name, description, sku
           payload[typedKey] = editedValue as string;
        }
      }
    }

    console.log("Payload to send:", payload); // Log the payload

    if (hasChanges) {
      mutation.mutate(payload);
    } else {
      toast.info("Aucune modification détectée.");
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (product) {
      setEditData({
        name: product.name,
        description: product.description,
        short_description: product.short_description,
        regular_price: product.regular_price,
        sale_price: product.sale_price,
        stock_quantity: product.stock_quantity,
        stock_status: product.stock_status,
        sku: product.sku,
      });
    }
  };

  const handleAIContentApply = (content: Partial<GeneratedProductContent>) => {
    // Apply AI-generated content to edit data
    const updatedData = { ...editData };
    
    if (content.title) {
      updatedData.name = content.title;
    }
    if (content.description) {
      updatedData.description = content.description;
    }
    if (content.shortDescription) {
      updatedData.short_description = content.shortDescription;
    }
    
    // Apply SEO metadata to Yoast SEO meta fields
    if (content.seo) {
      const yoastMetaData = formatSEOForYoast(content.seo);
      
      // Merge with existing meta_data or create new
      const existingMetaData = product?.meta_data || [];
      const metaDataMap = new Map<string, { key: string; value: string }>();
      
      // First, add existing non-Yoast meta data
      existingMetaData.forEach(meta => {
        if (!meta.key.startsWith('_yoast_wpseo_')) {
          metaDataMap.set(meta.key, { key: meta.key, value: meta.value });
        }
      });
      
      // Then add/update Yoast SEO meta data
      yoastMetaData.forEach(meta => {
        metaDataMap.set(meta.key, meta);
      });
      
      updatedData.meta_data = Array.from(metaDataMap.values());
      
      console.log('SEO metadata formatted for Yoast:', yoastMetaData);
      toast.success("Métadonnées SEO générées et prêtes à être sauvegardées avec Yoast SEO.");
    }
    
    setEditData(updatedData);
    setIsEditing(true);
    toast.success("Contenu AI appliqué. Vérifiez et sauvegardez les modifications.");
  };

  const renderStockBadge = (status: Product['stock_status'] | undefined, quantity: number | null | undefined) => {
    let variant: 'default' | 'secondary' | 'destructive' = 'secondary';
    let text = 'Inconnu';
    let className = '';

    if (!status) return <Badge variant="secondary">Inconnu</Badge>;

    if (status === 'instock') {
      variant = 'default'; text = 'En Stock'; className = 'bg-green-100 text-green-800';
    } else if (status === 'onbackorder') {
      variant = 'secondary'; text = 'En Réappro.'; className = 'bg-yellow-100 text-yellow-800';
    } else if (status === 'outofstock') {
      variant = 'destructive'; text = 'Rupture'; className = 'bg-red-100 text-red-800';
    }

    return (
      <Badge variant={variant} className={className}>
        {text}
        {quantity !== null && quantity !== undefined && ` (${quantity})`}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-6 py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <Button variant="outline" size="sm" asChild className="mb-2 mr-4">
                <Link to="/products">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Retour aux produits
                </Link>
              </Button>
              {isLoading && <Skeleton className="h-8 w-64 inline-block" />} 
              {product && !isEditing && <h1 className="text-2xl font-bold tracking-tight text-gray-900 inline-block align-middle">{product.name}</h1>}
              {product && isEditing && (
                <Input 
                  name="name"
                  value={editData.name || ''} 
                  onChange={handleInputChange}
                  className="text-2xl font-bold tracking-tight h-auto p-0 border-0 shadow-none focus-visible:ring-0 inline-block w-auto max-w-md align-middle" 
                />
              )}
              {isError && <h1 className="text-2xl font-bold tracking-tight text-red-600 inline-block align-middle">Détails du Produit</h1>}
            </div>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit} disabled={mutation.isPending}>
                    <X className="mr-2 h-4 w-4" /> Annuler
                  </Button>
                  <Button size="sm" onClick={handleSaveChanges} disabled={mutation.isPending}>
                    {mutation.isPending ? 'Sauvegarde...' : <> <Save className="mr-2 h-4 w-4" /> Enregistrer </>}
                  </Button>
                </>
              ) : (
                product && !isError && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setShowAIGenerator(true)}>
                      <Sparkles className="mr-2 h-4 w-4" /> Générer avec IA
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                      <Edit className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                  </>
                )
              )}
            </div>
          </div>

          {isLoading && (
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-lg" />
              <Skeleton className="h-32 w-full rounded-lg" />
            </div>
          )}

          {isError && !isLoading && (
            <Alert variant="destructive">
              <AlertTitle>Erreur</AlertTitle>
              <AlertDescription>
                Impossible de charger les détails du produit. {error?.message}
              </AlertDescription>
            </Alert>
          )}

          {product && !isLoading && !isError && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                {product.images && product.images.length > 0 && (
                  <Card>
                    <CardContent className="p-4">
                      <img src={product.images[0].src} alt={product.images[0].alt || product.name} className="w-full h-auto object-cover rounded-lg shadow-sm max-h-[400px]" />
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader><CardTitle>Description</CardTitle></CardHeader>
                  <CardContent>
                    {isEditing ? (
                      <Textarea 
                        name="description"
                        value={editData.description || ''}
                        onChange={handleInputChange}
                        rows={8}
                        className="prose prose-sm max-w-none"
                      />
                    ) : (
                      product.description ? (
                        <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={createMarkup(product.description)} />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">Aucune description.</p>
                      )
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle>Description Courte</CardTitle></CardHeader>
                  <CardContent>
                     {isEditing ? (
                      <Textarea 
                        name="short_description"
                        value={editData.short_description || ''}
                        onChange={handleInputChange}
                        rows={4}
                         className="prose prose-sm max-w-none"
                      />
                     ) : (
                       product.short_description ? (
                         <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={createMarkup(product.short_description)} />
                       ) : (
                         <p className="text-sm text-muted-foreground italic">Aucune description courte.</p>
                       )
                     )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Informations Générales</span>
                       <a href={product.permalink} target="_blank" rel="noopener noreferrer" title="Voir sur le site">
                         <Button variant="ghost" size="icon">
                           <ExternalLink className="h-4 w-4" />
                         </Button>
                       </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center text-muted-foreground"><Tag className="mr-2 h-4 w-4"/>Prix</label>
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                           <div>
                             <label htmlFor="regular_price" className="text-xs text-muted-foreground">Normal (€)</label>
                             <Input 
                               id="regular_price"
                               name="regular_price" 
                               type="number" 
                               step="0.01"
                               value={editData.regular_price || ''} 
                               onChange={handleInputChange} 
                               placeholder="Ex: 19.99"
                             />
                           </div>
                           <div>
                             <label htmlFor="sale_price" className="text-xs text-muted-foreground">Promo (€)</label>
                              <Input 
                                id="sale_price"
                                name="sale_price" 
                                type="number" 
                                step="0.01"
                                value={editData.sale_price || ''} 
                                onChange={handleInputChange} 
                                placeholder="(Optionnel)"
                              />
                           </div>
                        </div>
                      ) : (
                        <div className="flex justify-between items-baseline">
                           <span className={`font-semibold text-lg ${product.on_sale ? 'text-red-600' : ''}`}>
                             {formatPrice(product.price)}
                           </span>
                           {product.on_sale && (
                             <span className="line-through text-sm text-muted-foreground ml-2">
                               {formatPrice(product.regular_price)}
                             </span>
                           )}
                        </div>
                      )}
                    </div>
                     <div className="space-y-2">
                      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center text-muted-foreground"><Package className="mr-2 h-4 w-4"/>Stock</label>
                      {isEditing ? (
                        <div className="grid grid-cols-2 gap-2">
                           <div>
                             <label htmlFor="stock_status" className="text-xs text-muted-foreground">Statut</label>
                             <Select 
                                name="stock_status"
                                value={editData.stock_status || 'instock'} 
                                onValueChange={(value) => handleSelectChange('stock_status', value)}
                             >
                                <SelectTrigger id="stock_status">
                                  <SelectValue placeholder="Choisir statut..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="instock">En Stock</SelectItem>
                                  <SelectItem value="outofstock">Rupture</SelectItem>
                                  <SelectItem value="onbackorder">En Réappro.</SelectItem>
                                </SelectContent>
                              </Select>
                           </div>
                            <div>
                             <label htmlFor="stock_quantity" className="text-xs text-muted-foreground">Quantité</label>
                              <Input 
                                id="stock_quantity"
                                name="stock_quantity" 
                                type="number" 
                                step="1"
                                value={editData.stock_quantity === null ? '' : editData.stock_quantity} 
                                onChange={handleStockQuantityChange} 
                                placeholder="(Optionnel)"
                              />
                           </div>
                        </div>
                      ) : (
                         renderStockBadge(product.stock_status, product.stock_quantity)
                      )}
                    </div>
                     <div className="space-y-2">
                       <label htmlFor="sku" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center text-muted-foreground"><Info className="mr-2 h-4 w-4"/>SKU</label>
                       {isEditing ? (
                          <Input id="sku" name="sku" value={editData.sku || ''} onChange={handleInputChange} />
                       ) : (
                         <span>{product.sku || 'N/D'}</span>
                       )}
                    </div>
                    {!isEditing && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground flex items-center"><Palette className="mr-2 h-4 w-4"/>Type</span>
                        <span className="capitalize">{product.type}</span>
                      </div>
                    )}
                     {!isEditing && (
                       <div className="flex justify-between items-center">
                         <span className="text-sm text-muted-foreground">Catégories</span>
                         <div className="text-right">
                           {product.categories.map(cat => (
                             <Badge key={cat.id} variant="secondary" className="ml-1">{cat.name}</Badge>
                           ))}
                         </div>
                       </div>
                     )}
                   </CardContent>
                </Card>
              </div>
            </div>
          )}
      
      {/* AI Content Generator Modal */}
      {product && (
        <AIContentGenerator
          product={product}
          isOpen={showAIGenerator}
          onClose={() => setShowAIGenerator(false)}
          onApply={handleAIContentApply}
        />
      )}
    </div>
  );
};

export default ProductDetailsPage; 