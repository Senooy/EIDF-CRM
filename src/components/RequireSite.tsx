import React from 'react';
import { useActiveSite } from '@/hooks/useActiveSite';
import { SiteNotConfigured } from './SiteNotConfigured';
import { Loader2 } from 'lucide-react';

interface RequireSiteProps {
  children: React.ReactNode;
}

export function RequireSite({ children }: RequireSiteProps) {
  const { activeSite, loading, error } = useActiveSite();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !activeSite) {
    return <SiteNotConfigured />;
  }

  return <>{children}</>;
}