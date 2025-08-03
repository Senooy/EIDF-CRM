import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href?: string;
  }>;
  className?: string;
}

const routeLabels: Record<string, string> = {
  '/': 'Dashboard',
  '/wordpress': 'WordPress',
  '/woocommerce': 'WooCommerce',
  '/campaigns': 'Campagnes',
  '/orders': 'Commandes',
  '/customers': 'Clients',
  '/products': 'Produits',
  '/settings/sites': 'Configuration des sites',
  '/settings/sync': 'Synchronisation',
};

export function PageHeader({ 
  title, 
  description, 
  actions, 
  breadcrumbs,
  className 
}: PageHeaderProps) {
  const location = useLocation();
  
  // Auto-generate breadcrumbs from current path if not provided
  const generateBreadcrumbs = () => {
    if (breadcrumbs) return breadcrumbs;
    
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const generated = [{ label: 'Dashboard', href: '/' }];
    
    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      if (index === pathSegments.length - 1) {
        generated.push({ label });
      } else {
        generated.push({ label, href: currentPath });
      }
    });
    
    return generated;
  };

  const crumbs = generateBreadcrumbs();

  return (
    <div className={cn(
      "border-b bg-background",
      className
    )}>
      <div className="px-6 py-3">
        <Breadcrumb className="mb-1.5">
          <BreadcrumbList>
            {crumbs.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.href} className="flex items-center gap-1 text-sm">
                        {index === 0 && <Home className="h-3 w-3" />}
                        {crumb.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="text-sm">{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight animate-fade-in">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground animate-fade-up">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2 animate-fade-in">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}