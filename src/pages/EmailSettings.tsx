import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Mail, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailSettings() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    defaultFromName: '',
    defaultFromEmail: '',
    smtpHost: '',
    smtpPort: '',
    trackingBaseUrl: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/email');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleSave = async () => {
    if (!settings.defaultFromEmail || !settings.defaultFromName) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Paramètres enregistrés avec succès');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Erreur lors de l\'enregistrement des paramètres');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/campaigns')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Paramètres Email</h1>
          <p className="text-muted-foreground">Configuration globale pour l'envoi d'emails</p>
        </div>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Expéditeur par défaut
            </CardTitle>
            <CardDescription>
              Ces paramètres seront utilisés par défaut pour toutes les nouvelles campagnes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="default-from-name">Nom de l'expéditeur par défaut</Label>
              <Input
                id="default-from-name"
                placeholder="Ex: EIDF CRM"
                value={settings.defaultFromName}
                onChange={(e) => setSettings({ ...settings, defaultFromName: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="default-from-email">Email de l'expéditeur par défaut</Label>
              <Input
                id="default-from-email"
                type="email"
                placeholder="Ex: noreply@eidf-crm.fr"
                value={settings.defaultFromEmail}
                onChange={(e) => setSettings({ ...settings, defaultFromEmail: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration SMTP
            </CardTitle>
            <CardDescription>
              Paramètres du serveur d'envoi d'emails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="smtp-host">Serveur SMTP</Label>
                <Input
                  id="smtp-host"
                  placeholder="Ex: localhost"
                  value={settings.smtpHost}
                  onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="smtp-port">Port SMTP</Label>
                <Input
                  id="smtp-port"
                  placeholder="Ex: 25"
                  value={settings.smtpPort}
                  onChange={(e) => setSettings({ ...settings, smtpPort: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="tracking-url">URL de tracking</Label>
              <Input
                id="tracking-url"
                placeholder="Ex: https://dashboard.eidf-crm.fr"
                value={settings.trackingBaseUrl}
                onChange={(e) => setSettings({ ...settings, trackingBaseUrl: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </Button>
        </div>
      </div>
    </div>
  );
}