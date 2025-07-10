import React, { useState, useEffect } from 'react';
import { Globe, ChevronDown, Check, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { configService, WordPressSite } from '@/lib/db/config';
import { useActiveSite } from '@/hooks/useActiveSite';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export function SiteSwitcher() {
  const navigate = useNavigate();
  const { activeSite, switchSite } = useActiveSite();
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSites();
  }, [activeSite]);

  const loadSites = async () => {
    try {
      const allSites = await configService.getAllSites();
      setSites(allSites);
    } catch (error) {
      logger.error('Error loading sites', error, 'SiteSwitcher');
    }
  };

  const handleSwitchSite = async (site: WordPressSite) => {
    if (site.id === activeSite?.id) return;
    
    setLoading(true);
    try {
      await switchSite(site.id!);
      toast.success(`Basculé vers ${site.name}`);
    } catch (error) {
      toast.error('Erreur lors du changement de site');
    } finally {
      setLoading(false);
    }
  };

  if (sites.length === 0) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => navigate('/settings/sites')}
        className="ml-4"
      >
        <Settings className="h-4 w-4 mr-2" />
        Configurer un site
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-4" disabled={loading}>
          <Globe className="h-4 w-4 mr-2" />
          {activeSite ? (
            <>
              {activeSite.name}
              <ChevronDown className="h-3 w-3 ml-2" />
            </>
          ) : (
            'Sélectionner un site'
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Sites WordPress</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sites.map((site) => (
          <DropdownMenuItem
            key={site.id}
            onClick={() => handleSwitchSite(site)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <div>
                  <div className="font-medium">{site.name}</div>
                  <div className="text-xs text-muted-foreground truncate max-w-[180px]">
                    {site.url}
                  </div>
                </div>
              </div>
              {site.id === activeSite?.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/settings/sites')}
          className="cursor-pointer"
        >
          <Settings className="h-4 w-4 mr-2" />
          Gérer les sites
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}