import React from 'react';
import { AlertCircle, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useNavigate } from 'react-router-dom';

export function SiteNotConfigured() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Configuration requise
          </CardTitle>
          <CardDescription>
            Aucun site WordPress/WooCommerce n'est configuré
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Première utilisation</AlertTitle>
            <AlertDescription>
              Pour utiliser le dashboard, vous devez d'abord configurer au moins un site WordPress avec WooCommerce.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            <h3 className="font-medium">Pour commencer :</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Accédez aux paramètres de configuration</li>
              <li>Ajoutez votre site WordPress (URL)</li>
              <li>Configurez les accès API WooCommerce (Consumer Key/Secret)</li>
              <li>Optionnel : Ajoutez un mot de passe d'application WordPress</li>
              <li>Testez la connexion et sauvegardez</li>
            </ol>
          </div>
          
          <div className="pt-4">
            <Button onClick={() => navigate('/settings/sites')} className="w-full">
              <Settings className="h-4 w-4 mr-2" />
              Configurer un site
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>Note : Assurez-vous que votre site WordPress a :</p>
            <ul className="list-disc list-inside mt-1">
              <li>WooCommerce installé et activé</li>
              <li>L'API REST activée</li>
              <li>Les permissions CORS configurées (pour les connexions cross-origin)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}