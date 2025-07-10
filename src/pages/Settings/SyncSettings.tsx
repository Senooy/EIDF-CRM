import React from 'react';
import { RequireSite } from '@/components/RequireSite';
import { SyncStatusCard } from '@/components/SyncStatus';
import Navbar from '@/components/Layout/Navbar';
import Sidebar from '@/components/Layout/Sidebar';

export default function SyncSettings() {
  return (
    <RequireSite>
      <div className="flex h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar />
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-6">
                <h1 className="text-3xl font-bold">Paramètres de synchronisation</h1>
                <p className="text-muted-foreground">
                  Gérez la synchronisation et le cache des données
                </p>
              </div>

              <SyncStatusCard />
            </div>
          </main>
        </div>
      </div>
    </RequireSite>
  );
}