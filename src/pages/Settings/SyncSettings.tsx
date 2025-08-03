import React from 'react';
import { RequireSite } from '@/components/RequireSite';
import { SyncStatusCard } from '@/components/SyncStatus';

export default function SyncSettings() {
  return (
    <RequireSite>
      <div className="container mx-auto px-6 py-8">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">Paramètres de synchronisation</h1>
                <p className="text-muted-foreground">
                  Gérez la synchronisation et le cache des données
                </p>
              </div>

              <SyncStatusCard />
      </div>
    </RequireSite>
  );
}