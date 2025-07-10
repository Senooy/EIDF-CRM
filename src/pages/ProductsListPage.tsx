import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Product, getProductCategories, ProductCategory, getAllProducts } from '@/lib/woocommerce';
import { useCachedProducts } from '@/hooks/useCachedData';
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, Sparkles, RefreshCw, Database } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { formatPrice } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import { Input } from "@/components/ui/input";
import { useDebounce } from '@/hooks/use-debounce';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { SEOGenerationModal } from '@/components/SEOGenerationModal';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const ITEMS_PER_PAGE = 10;

// Define types for filters to ensure consistency
type StockStatus = 'instock' | 'outofstock' | 'onbackorder' | '';
type SortByOption = '' | 'popularity' | 'price_asc' | 'price_desc' | 'total_sales';

const ProductsListPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTermInput = useDebounce(searchTerm, 500);
  const debouncedSearchTerm = debouncedSearchTermInput.trim();
  
  // New filter states
  const [selectedCategory, setSelectedCategory] = useState<string>(''); // Category ID
  const [stockStatus, setStockStatus] = useState<StockStatus>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortByOption>('');
  
  // Cache toggle
  const [useCache, setUseCache] = useState(true);
  
  // SEO generation states
  const [showSEOModal, setShowSEOModal] = useState(false);
  const [allProductsForSEO, setAllProductsForSEO] = useState<Product[]>([]);

  const isDesktop = useMediaQuery("(min-width: 768px)");
  const queryClient = useQueryClient();

  // Fetch Product Categories
  const { data: categories, isLoading: isLoadingCategories, error: categoriesError } = useQuery<ProductCategory[]>({
    queryKey: ['productCategories'],
    queryFn: getProductCategories,
  });

  // Use cached products
  const {
    data: cachedProducts,
    isLoading: cacheLoading,
    isSyncing,
    error: cacheError,
    totalCount: cachedTotalCount,
    lastSync,
    isStale,
    sync,
    page: cachePage,
    totalPages: cacheTotalPages,
    goToPage: cacheGoToPage
  } = useCachedProducts({
    page: currentPage,
    perPage: ITEMS_PER_PAGE,
    bypassCache: !useCache,
    autoSync: false,
    filter: (product: Product) => {
      // Apply search filter
      if (debouncedSearchTerm) {
        const searchLower = debouncedSearchTerm.toLowerCase();
        const matchesSearch = product.name.toLowerCase().includes(searchLower) ||
                             (product.sku && product.sku.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }
      
      // Apply category filter
      if (selectedCategory) {
        const hasCategory = product.categories?.some(cat => String(cat.id) === selectedCategory);
        if (!hasCategory) return false;
      }
      
      // Apply stock status filter
      if (stockStatus && product.stock_status !== stockStatus) {
        return false;
      }
      
      // Apply price filters
      const price = parseFloat(product.price || '0');
      if (minPrice && price < parseFloat(minPrice)) return false;
      if (maxPrice && price > parseFloat(maxPrice)) return false;
      
      return true;
    },
    sort: (a: Product, b: Product) => {
      switch (sortBy) {
        case 'popularity':
          // Assuming we have a popularity field
          return (b.rating_count || 0) - (a.rating_count || 0);
        case 'total_sales':
          return (b.total_sales || 0) - (a.total_sales || 0);
        case 'price_asc':
          return parseFloat(a.price || '0') - parseFloat(b.price || '0');
        case 'price_desc':
          return parseFloat(b.price || '0') - parseFloat(a.price || '0');
        default:
          // Default sort by date modified
          return new Date(b.date_modified).getTime() - new Date(a.date_modified).getTime();
      }
    }
  });

  const products = cachedProducts;
  const totalPages = cacheTotalPages;
  const totalProducts = cachedTotalCount;
  const isLoading = cacheLoading;
  const isError = !!cacheError;
  const error = cacheError;

  // Callback when SEO generation is complete
  const handleSEOBatchComplete = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    setShowSEOModal(false);
  };

  // Effect to reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
    if (useCache && cacheGoToPage) {
      cacheGoToPage(1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearchTerm, selectedCategory, stockStatus, minPrice, maxPrice, sortBy]);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
      if (useCache && cacheGoToPage) {
        cacheGoToPage(currentPage + 1);
      }
    }
  };

  const handleOpenSEOModal = async () => {
    try {
      toast.info("Chargement de tous les produits...");
      const allProducts = await getAllProducts();
      
      if (!allProducts || allProducts.length === 0) {
        toast.error("Aucun produit trouvé dans la base");
        return;
      }
      
      setAllProductsForSEO(allProducts);
      toast.success(`${allProducts.length} produits trouvés`);
      setShowSEOModal(true);
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error);
      toast.error("Erreur lors du chargement des produits: " + (error as any).message);
    }
  };

  const renderProductRow = (product: Product) => (
    <TableRow key={product.id}>
      <TableCell>
        {product.images?.[0]?.src ? (
          <img src={product.images[0].src} alt={product.name} className="h-10 w-10 object-cover rounded" />
        ) : (
          <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">Aucune image</div>
        )}
      </TableCell>
      <TableCell className="font-medium">{product.name}</TableCell>
      <TableCell>{product.sku || 'N/D'}</TableCell>
      <TableCell>
        <Badge
          variant={
            product.stock_status === 'instock' ? 'default' :
            product.stock_status === 'onbackorder' ? 'secondary' : 'destructive'
          }
          className={product.stock_status === 'instock' ? 'bg-green-100 text-green-800' :
                     product.stock_status === 'onbackorder' ? 'bg-yellow-100 text-yellow-800' :
                     'bg-red-100 text-red-800'}
        >
          {product.stock_status === 'instock' ? 'En stock' :
           product.stock_status === 'onbackorder' ? 'En réappro.' : 'Rupture'}
          {product.stock_quantity !== null && ` (${product.stock_quantity})`}
        </Badge>
      </TableCell>
      <TableCell className="text-right">{formatPrice(product.price)}</TableCell>
      <TableCell className="text-right">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/products/${product.id}`} title="Voir les détails">
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );

  const renderProductCard = (product: Product) => (
    <Card key={product.id}>
      <CardHeader className="flex flex-row items-center gap-4 pb-2">
         {product.images?.[0]?.src ? (
          <img src={product.images[0].src} alt={product.name} className="h-12 w-12 object-cover rounded" />
        ) : (
          <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-sm text-gray-500">Aucune image</div>
        )}
        <div className="flex-1">
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>{product.sku || 'Pas de SKU'}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
         <div className="flex justify-between items-center">
           <span className="text-sm text-muted-foreground">Prix :</span>
           <span className="font-medium">{formatPrice(product.price)}</span>
         </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Statut :</span>
           <Badge
              variant={
                product.stock_status === 'instock' ? 'default' :
                product.stock_status === 'onbackorder' ? 'secondary' : 'destructive'
              }
              className={`text-xs ${product.stock_status === 'instock' ? 'bg-green-100 text-green-800' :
                         product.stock_status === 'onbackorder' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800'}`}
            >
              {product.stock_status === 'instock' ? 'En stock' :
               product.stock_status === 'onbackorder' ? 'En réappro.' : 'Rupture'}
              {product.stock_quantity !== null && ` (${product.stock_quantity})`}
            </Badge>
        </div>
      </CardContent>
      <CardFooter className="p-3 pt-0">
        <Button variant="outline" size="sm" className="w-full" asChild>
            <Link to={`/products/${product.id}`}>Voir les détails</Link>
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="flex min-h-screen w-full bg-muted/40">
      <Sidebar />
      <div className="flex flex-1 flex-col">
        <Navbar />
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Produits</CardTitle>
                  <CardDescription>Gérez vos produits et consultez leurs performances de vente.</CardDescription>
                </div>
                <div className="flex items-center gap-4">
                  {/* Cache Toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="use-cache"
                      checked={useCache}
                      onCheckedChange={setUseCache}
                    />
                    <Label htmlFor="use-cache" className="flex items-center gap-2 cursor-pointer">
                      <Database className="h-4 w-4" />
                      Cache local
                      {useCache && lastSync && (
                        <Badge variant={isStale ? "secondary" : "default"} className="text-xs">
                          {isStale ? "Obsolète" : "À jour"}
                        </Badge>
                      )}
                    </Label>
                  </div>
                  
                  {/* Sync Button */}
                  {useCache && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={sync}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Synchronisation...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Synchroniser
                        </>
                      )}
                    </Button>
                  )}
                  
                  <Button 
                    onClick={handleOpenSEOModal}
                    variant="outline" 
                    size="sm"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Générer SEO
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent>
              <div className="mb-4 space-y-4 md:flex md:items-end md:space-x-4 md:space-y-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-4 items-end">
                  <div className="min-w-[180px]">
                    <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="category-filter">
                        <SelectValue placeholder="Toutes les catégories" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingCategories && <SelectItem value="loading-categories" disabled>Chargement...</SelectItem>}
                        {categoriesError && <SelectItem value="error-categories" disabled>Erreur chargement</SelectItem>}
                        {categories?.map(category => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-[150px]">
                    <label htmlFor="stock-status-filter" className="block text-sm font-medium text-gray-700 mb-1">Statut du stock</label>
                    <Select value={stockStatus} onValueChange={(value) => setStockStatus(value as StockStatus)}>
                      <SelectTrigger id="stock-status-filter">
                        <SelectValue placeholder="Tous les statuts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="instock">En stock</SelectItem>
                        <SelectItem value="outofstock">En rupture</SelectItem>
                        <SelectItem value="onbackorder">En réapprovisionnement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="min-w-[120px]">
                    <label htmlFor="min-price" className="block text-sm font-medium text-gray-700 mb-1">Prix Min</label>
                    <Input 
                      id="min-price"
                      type="number" 
                      placeholder="Prix Min" 
                      value={minPrice} 
                      onChange={(e) => setMinPrice(e.target.value)} 
                      className="w-full"
                    />
                  </div>
                  <div className="min-w-[120px]">
                    <label htmlFor="max-price" className="block text-sm font-medium text-gray-700 mb-1">Prix Max</label>
                    <Input 
                      id="max-price"
                      type="number" 
                      placeholder="Prix Max" 
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(e.target.value)} 
                      className="w-full"
                    />
                  </div>

                  <div className="min-w-[180px]">
                    <label htmlFor="sort-by-filter" className="block text-sm font-medium text-gray-700 mb-1">Trier par</label>
                    <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortByOption)}>
                      <SelectTrigger id="sort-by-filter">
                        <SelectValue placeholder="Tri par défaut" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="popularity">Plus populaires</SelectItem>
                        <SelectItem value="total_sales">Meilleures ventes</SelectItem>
                        <SelectItem value="price_asc">Prix : Croissant</SelectItem>
                        <SelectItem value="price_desc">Prix : Décroissant</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <Input 
                  type="search" 
                  placeholder="Rechercher par nom ou SKU..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full md:max-w-sm"
                />
              </div>

              {isLoading && (
                <div className="space-y-4">
                  {Array.from({ length: isDesktop ? ITEMS_PER_PAGE : 3 }).map((_, i) => (
                    isDesktop
                      ? <Skeleton key={i} className="h-16 w-full rounded-lg" />
                      : <Skeleton key={i} className="h-[220px] w-full rounded-lg" />
                  ))}
                </div>
              )}

              {isError && (
                <Alert variant="destructive">
                  <AlertTitle>Erreur</AlertTitle>
                  <AlertDescription>
                    Échec du chargement des produits. {error instanceof Error ? error.message : 'Erreur inconnue.'}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="transition-opacity duration-300"> 
                {!isLoading && !isError && products.length === 0 && (
                    <p className="text-center text-muted-foreground py-10">Aucun produit trouvé.</p>
                )}

                {products.length > 0 && (
                  <>
                    {isDesktop && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[80px]">Image</TableHead>
                            <TableHead>Nom</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Stock</TableHead>
                            <TableHead className="text-right">Prix</TableHead>
                            <TableHead className="text-right w-[100px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {products.map(renderProductRow)}
                        </TableBody>
                      </Table>
                    )}

                    {!isDesktop && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {products.map(renderProductCard)}
                      </div>
                    )}
                  </>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} sur {totalPages} (Total : {totalProducts} produits)
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      aria-label="Aller à la page précédente"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      aria-label="Aller à la page suivante"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </main>
        
        {/* Modale SEO */}
        <SEOGenerationModal 
          isOpen={showSEOModal}
          onClose={() => setShowSEOModal(false)}
          products={allProductsForSEO}
          onComplete={handleSEOBatchComplete}
        />
      </div>
    </div>
  );
};

export default ProductsListPage; 