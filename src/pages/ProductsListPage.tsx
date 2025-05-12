import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Product, getProductsPage, PaginatedProductsResponse } from '@/lib/woocommerce';
import Navbar from "@/components/Layout/Navbar";
import Sidebar from "@/components/Layout/Sidebar";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
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

const ITEMS_PER_PAGE = 10;

const ProductsListPage: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const { 
    data, 
    isLoading, 
    error, 
    isError,
    isPlaceholderData
  } = useQuery<PaginatedProductsResponse>({
    queryKey: ['products', currentPage],
    queryFn: () => getProductsPage(currentPage, ITEMS_PER_PAGE),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
  });

  const products = data?.products ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalProducts = data?.totalProducts ?? 0;

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    if (!isPlaceholderData && currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const renderProductRow = (product: Product) => (
    <TableRow key={product.id}>
      <TableCell>
        {product.images?.[0]?.src ? (
          <img src={product.images[0].src} alt={product.name} className="h-10 w-10 object-cover rounded" />
        ) : (
          <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">No Img</div>
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
          {product.stock_status === 'instock' ? 'En Stock' :
           product.stock_status === 'onbackorder' ? 'En Réappro.' : 'Rupture'}
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
          <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-sm text-gray-500">No Img</div>
        )}
        <div className="flex-1">
          <CardTitle>{product.name}</CardTitle>
          <CardDescription>{product.sku || 'Pas de SKU'}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
         <div className="flex justify-between items-center">
           <span className="text-sm text-muted-foreground">Prix:</span>
           <span className="font-medium">{formatPrice(product.price)}</span>
         </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Statut:</span>
           <Badge
              variant={
                product.stock_status === 'instock' ? 'default' :
                product.stock_status === 'onbackorder' ? 'secondary' : 'destructive'
              }
              className={`text-xs ${product.stock_status === 'instock' ? 'bg-green-100 text-green-800' :
                         product.stock_status === 'onbackorder' ? 'bg-yellow-100 text-yellow-800' :
                         'bg-red-100 text-red-800'}`}
            >
              {product.stock_status === 'instock' ? 'En Stock' :
               product.stock_status === 'onbackorder' ? 'En Réappro.' : 'Rupture'}
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
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
          <div className="mb-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Produits</h1>
          </div>

          {isLoading && !data && (
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
                Échec du chargement des produits. {error instanceof Error ? error.message : 'Erreur inconnue'}
              </AlertDescription>
            </Alert>
          )}
          
          <div className={`transition-opacity duration-300 ${isPlaceholderData ? 'opacity-50' : 'opacity-100'}`}> 
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
                  disabled={isPlaceholderData || currentPage === totalPages}
                  aria-label="Aller à la page suivante"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
};

export default ProductsListPage; 