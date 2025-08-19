import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Send, Calendar, Loader2 } from 'lucide-react';
import EmailTemplateEditor from '@/components/Campaign/EmailTemplateEditor';
import RecipientSelector from '@/components/Campaign/RecipientSelector';
import EmailPreview from '@/components/Campaign/EmailPreview';
import { toast } from 'sonner';
import { Campaign } from '@/types/campaign';

export default function CampaignEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateCampaign, sendCampaign } = useCampaigns();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    body: '',
    recipientSegment: 'all',
    scheduledDate: '',
    scheduledTime: ''
  });

  useEffect(() => {
    if (id) {
      loadCampaign();
    }
  }, [id]);

  const loadCampaign = async () => {
    try {
      setLoading(true);
      // Fetch campaign from API
      const response = await fetch(`/api/campaigns/${id}`);
      if (!response.ok) {
        throw new Error('Failed to load campaign');
      }
      const campaignData = await response.json();
      
      if (campaignData) {
        setCampaign(campaignData);
        setCampaignData({
          name: campaignData.name,
          subject: campaignData.subject,
          body: campaignData.body,
          recipientSegment: campaignData.recipientSegment || 'all',
          scheduledDate: campaignData.scheduledDate ? campaignData.scheduledDate.split('T')[0] : '',
          scheduledTime: campaignData.scheduledDate ? campaignData.scheduledDate.split('T')[1]?.slice(0, 5) : ''
        });
      } else {
        toast.error('Campagne non trouvée');
        navigate('/campaigns');
      }
    } catch (error) {
      console.error('Error loading campaign:', error);
      toast.error('Erreur lors du chargement de la campagne');
      navigate('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!campaignData.name || !campaignData.subject) {
      toast.error('Veuillez remplir le nom et l\'objet de la campagne');
      return;
    }

    setSaving(true);
    try {
      const scheduledDate = campaignData.scheduledDate && campaignData.scheduledTime 
        ? new Date(`${campaignData.scheduledDate}T${campaignData.scheduledTime}`).toISOString()
        : undefined;

      await updateCampaign(id!, {
        name: campaignData.name,
        subject: campaignData.subject,
        body: campaignData.body,
        scheduledDate,
        status: scheduledDate ? 'scheduled' : campaign?.status || 'draft'
      });

      navigate('/campaigns');
    } catch (error) {
      console.error('Error saving campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    if (!campaignData.name || !campaignData.subject || !campaignData.body) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    setSaving(true);
    try {
      // Sauvegarder d'abord les modifications
      await updateCampaign(id!, {
        name: campaignData.name,
        subject: campaignData.subject,
        body: campaignData.body,
        status: 'sending'
      });

      // Puis envoyer
      await sendCampaign(id!);
      navigate('/campaigns');
    } catch (error) {
      console.error('Error sending campaign:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Chargement de la campagne...</span>
              </div>
      </div>
    );
  }

  if (!campaign) {
    return null;
  }

  const canEdit = campaign.status === 'draft' || campaign.status === 'scheduled';

  return (
    <div className="container mx-auto px-6 py-8 max-w-6xl">
            <div className="flex items-center gap-4 mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/campaigns')}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Modifier la Campagne</h1>
                <p className="text-muted-foreground">
                  {campaign.name} - {campaign.status === 'draft' ? 'Brouillon' : 
                   campaign.status === 'scheduled' ? 'Programmée' : 
                   campaign.status === 'sent' ? 'Envoyée' : 'En cours'}
                </p>
              </div>
            </div>

            {!canEdit && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-yellow-800 dark:text-yellow-200">
                  Cette campagne ne peut plus être modifiée car elle a déjà été envoyée.
                </p>
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="details">Détails</TabsTrigger>
                <TabsTrigger value="content">Contenu</TabsTrigger>
                <TabsTrigger value="recipients">Destinataires</TabsTrigger>
                <TabsTrigger value="preview">Aperçu</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Informations de la Campagne</CardTitle>
                    <CardDescription>
                      Modifiez les paramètres de base de votre campagne
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="name">Nom de la campagne</Label>
                        <Input
                          id="name"
                          value={campaignData.name}
                          onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                          disabled={!canEdit}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="subject">Objet de l'email</Label>
                        <Input
                          id="subject"
                          value={campaignData.subject}
                          onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="schedule-date">Date d'envoi</Label>
                          <Input
                            id="schedule-date"
                            type="date"
                            value={campaignData.scheduledDate}
                            onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                            disabled={!canEdit}
                          />
                        </div>
                        <div>
                          <Label htmlFor="schedule-time">Heure d'envoi</Label>
                          <Input
                            id="schedule-time"
                            type="time"
                            value={campaignData.scheduledTime}
                            onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
                            disabled={!canEdit}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="content" className="space-y-6">
                <EmailTemplateEditor
                  content={campaignData.body}
                  onChange={(content) => setCampaignData({ ...campaignData, body: content })}
                  onTemplateSelect={(template) => setCampaignData({ 
                    ...campaignData, 
                    subject: template.subject, 
                    body: template.body 
                  })}
                />
              </TabsContent>

              <TabsContent value="recipients" className="space-y-6">
                <RecipientSelector
                  selectedSegment={campaignData.recipientSegment}
                  onSegmentChange={(segment) => setCampaignData({ ...campaignData, recipientSegment: segment })}
                />
              </TabsContent>

              <TabsContent value="preview" className="space-y-6">
                <EmailPreview
                  subject={campaignData.subject}
                  content={campaignData.body}
                />
              </TabsContent>
            </Tabs>

            {canEdit && (
              <div className="flex justify-between items-center mt-6 pt-6 border-t">
                <Button variant="outline" onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                </Button>
                
                <div className="flex gap-3">
                  <Button onClick={handleSendNow} disabled={saving}>
                    <Send className="h-4 w-4 mr-2" />
                    {saving ? 'Envoi...' : 'Envoyer maintenant'}
                  </Button>
                </div>
              </div>
            )}
    </div>
  );
}