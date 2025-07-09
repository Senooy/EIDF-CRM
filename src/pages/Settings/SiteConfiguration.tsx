import React, { useState, useEffect } from 'react';
import { Plus, Globe, Key, Trash2, CheckCircle2, XCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { configService, WordPressSite } from '@/lib/db/config';
import { useAuth } from '@/contexts/AuthContext';

export default function SiteConfiguration() {
  const { user } = useAuth();
  const [sites, setSites] = useState<WordPressSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSiteOpen, setIsAddSiteOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<WordPressSite | null>(null);
  const [showCredentials, setShowCredentials] = useState<{ [key: string]: boolean }>({});
  
  // Form states
  const [siteName, setSiteName] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [wpUsername, setWpUsername] = useState('');
  const [wpAppPassword, setWpAppPassword] = useState('');
  const [wooConsumerKey, setWooConsumerKey] = useState('');
  const [wooConsumerSecret, setWooConsumerSecret] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    loadSites();
    loadGeminiConfig();
  }, []);

  const loadSites = async () => {
    try {
      const allSites = await configService.getAllSites();
      setSites(allSites);
    } catch (error) {
      console.error('Error loading sites:', error);
      toast.error('Erreur lors du chargement des sites');
    } finally {
      setLoading(false);
    }
  };

  const loadGeminiConfig = async () => {
    try {
      const apiKey = await configService.getGeminiConfig();
      if (apiKey) {
        setGeminiApiKey(apiKey);
      }
    } catch (error) {
      console.error('Error loading Gemini config:', error);
    }
  };

  const handleAddSite = async () => {
    if (!siteName || !siteUrl) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setTestingConnection(true);
    try {
      // Test WordPress connection if credentials provided
      if (wpUsername && wpAppPassword) {
        const wpTest = await configService.testWordPressConnection(siteUrl, wpUsername, wpAppPassword);
        if (!wpTest.success) {
          toast.error(`Connexion WordPress échouée: ${wpTest.message}`);
          setTestingConnection(false);
          return;
        }
      }

      // Test WooCommerce connection if credentials provided
      if (wooConsumerKey && wooConsumerSecret) {
        const wooTest = await configService.testWooCommerceConnection(siteUrl, wooConsumerKey, wooConsumerSecret);
        if (!wooTest.success) {
          toast.error(`Connexion WooCommerce échouée: ${wooTest.message}`);
          setTestingConnection(false);
          return;
        }
      }

      // Add site
      const siteId = await configService.addSite({
        name: siteName,
        url: siteUrl.replace(/\/$/, ''), // Remove trailing slash
        isActive: sites.length === 0 // First site is active by default
      });

      // Save credentials if provided
      if (wpUsername && wpAppPassword) {
        await configService.saveWPCredentials(siteId, wpUsername, wpAppPassword);
      }

      if (wooConsumerKey && wooConsumerSecret) {
        await configService.saveWooCredentials(siteId, wooConsumerKey, wooConsumerSecret);
      }

      toast.success('Site ajouté avec succès');
      setIsAddSiteOpen(false);
      resetForm();
      loadSites();
    } catch (error) {
      console.error('Error adding site:', error);
      toast.error('Erreur lors de l\'ajout du site');
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDeleteSite = async (site: WordPressSite) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${site.name} ?`)) {
      return;
    }

    try {
      await configService.deleteSite(site.id!);
      toast.success('Site supprimé');
      loadSites();
    } catch (error) {
      console.error('Error deleting site:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSetActive = async (site: WordPressSite) => {
    try {
      await configService.setActiveSite(site.id!);
      
      // Save user preference
      if (user) {
        await configService.saveUserPreferences(user.uid, {
          currentSiteId: site.id,
          userId: user.uid
        });
      }
      
      toast.success(`${site.name} est maintenant le site actif`);
      loadSites();
    } catch (error) {
      console.error('Error setting active site:', error);
      toast.error('Erreur lors de la modification');
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiApiKey) {
      toast.error('Veuillez entrer une clé API');
      return;
    }

    try {
      await configService.saveGeminiConfig(geminiApiKey);
      toast.success('Clé API Gemini sauvegardée');
    } catch (error) {
      console.error('Error saving Gemini key:', error);
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const resetForm = () => {
    setSiteName('');
    setSiteUrl('');
    setWpUsername('');
    setWpAppPassword('');
    setWooConsumerKey('');
    setWooConsumerSecret('');
  };

  const toggleCredentialVisibility = (key: string) => {
    setShowCredentials(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Configuration des Sites</h1>
          <p className="text-muted-foreground">
            Gérez vos sites WordPress et WooCommerce
          </p>
        </div>
        <Button onClick={() => setIsAddSiteOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un site
        </Button>
      </div>

      {/* Sites List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sites.map((site) => (
          <Card key={site.id} className={site.isActive ? 'ring-2 ring-primary' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    {site.name}
                  </CardTitle>
                  <CardDescription className="text-xs break-all">
                    {site.url}
                  </CardDescription>
                </div>
                {site.isActive && (
                  <Badge variant="default">Actif</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Ajouté le {new Date(site.createdAt).toLocaleDateString()}
                </span>
              </div>
              
              <div className="flex gap-2">
                {!site.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSetActive(site)}
                    className="flex-1"
                  >
                    Activer
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedSite(site)}
                  className="flex-1"
                >
                  Configurer
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteSite(site)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gemini Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Gemini AI</CardTitle>
          <CardDescription>
            Configurez votre clé API Google Gemini pour activer les fonctionnalités IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-key">Clé API Gemini</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="gemini-key"
                  type={showCredentials['gemini'] ? 'text' : 'password'}
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIza..."
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => toggleCredentialVisibility('gemini')}
                >
                  {showCredentials['gemini'] ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button onClick={handleSaveGeminiKey}>
                Sauvegarder
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Obtenez votre clé sur <a href="https://makersuite.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline">Google AI Studio</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Site Dialog */}
      <Dialog open={isAddSiteOpen} onOpenChange={setIsAddSiteOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un nouveau site</DialogTitle>
            <DialogDescription>
              Configurez les accès à votre site WordPress et WooCommerce
            </DialogDescription>
          </DialogHeader>
          
          <Tabs defaultValue="general" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">Général</TabsTrigger>
              <TabsTrigger value="wordpress">WordPress</TabsTrigger>
              <TabsTrigger value="woocommerce">WooCommerce</TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="site-name">Nom du site *</Label>
                <Input
                  id="site-name"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="Mon Site WordPress"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="site-url">URL du site *</Label>
                <Input
                  id="site-url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://monsite.com"
                />
                <p className="text-xs text-muted-foreground">
                  L'URL complète de votre site WordPress (sans slash final)
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="wordpress" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wp-username">Nom d'utilisateur</Label>
                <Input
                  id="wp-username"
                  value={wpUsername}
                  onChange={(e) => setWpUsername(e.target.value)}
                  placeholder="admin"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="wp-password">Mot de passe d'application</Label>
                <Input
                  id="wp-password"
                  type="password"
                  value={wpAppPassword}
                  onChange={(e) => setWpAppPassword(e.target.value)}
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                />
                <p className="text-xs text-muted-foreground">
                  Générez un mot de passe d'application dans WordPress : 
                  Utilisateurs → Profil → Mots de passe d'application
                </p>
              </div>
            </TabsContent>
            
            <TabsContent value="woocommerce" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="woo-key">Consumer Key</Label>
                <Input
                  id="woo-key"
                  value={wooConsumerKey}
                  onChange={(e) => setWooConsumerKey(e.target.value)}
                  placeholder="ck_..."
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="woo-secret">Consumer Secret</Label>
                <Input
                  id="woo-secret"
                  type="password"
                  value={wooConsumerSecret}
                  onChange={(e) => setWooConsumerSecret(e.target.value)}
                  placeholder="cs_..."
                />
                <p className="text-xs text-muted-foreground">
                  Créez des clés API dans WooCommerce : 
                  Réglages → Avancé → API REST
                </p>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => setIsAddSiteOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleAddSite} disabled={testingConnection}>
              {testingConnection ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Test de connexion...
                </>
              ) : (
                'Ajouter le site'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Site Dialog */}
      {selectedSite && (
        <Dialog open={!!selectedSite} onOpenChange={() => setSelectedSite(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Configurer {selectedSite.name}</DialogTitle>
              <DialogDescription>
                Mettez à jour les credentials pour ce site
              </DialogDescription>
            </DialogHeader>
            
            {/* Similar tabs structure for editing credentials */}
            <p className="text-center text-muted-foreground py-8">
              Configuration détaillée à venir...
            </p>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedSite(null)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}