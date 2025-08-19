import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCampaigns } from '@/hooks/useCampaigns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Send, Save, Eye, Calendar, Users } from 'lucide-react';
import EmailTemplateEditor from '@/components/Campaign/EmailTemplateEditor';
import RecipientSelector from '@/components/Campaign/RecipientSelector';
import EmailPreview from '@/components/Campaign/EmailPreview';
import { toast } from 'sonner';

export default function CampaignCreate() {
  const navigate = useNavigate();
  const { createCampaign } = useCampaigns();
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState<string[]>([]);
  const [segmentType, setSegmentType] = useState<'all' | 'segment' | 'custom' | 'manual'>('all');
  const [campaignData, setCampaignData] = useState({
    name: '',
    subject: '',
    body: '',
    recipientSegment: 'all',
    scheduledDate: '',
    scheduledTime: '',
    fromName: 'EIDF CRM',
    fromEmail: 'noreply@eidf-crm.fr'
  });

  const handleSave = async (isDraft: boolean = true) => {
    if (!campaignData.name || !campaignData.subject) {
      toast.error('Veuillez remplir le nom et l\'objet de la campagne');
      return;
    }

    if (segmentType === 'manual' && recipientEmails.length === 0) {
      toast.error('Veuillez ajouter au moins une adresse email valide');
      return;
    }

    setSaving(true);
    try {
      const status = isDraft ? 'draft' : 'scheduled';
      const scheduledDate = campaignData.scheduledDate && campaignData.scheduledTime 
        ? new Date(`${campaignData.scheduledDate}T${campaignData.scheduledTime}`).toISOString()
        : undefined;

      const campaignPayload: any = {
        name: campaignData.name,
        subject: campaignData.subject,
        body: campaignData.body,
        fromName: campaignData.fromName,
        fromEmail: campaignData.fromEmail,
        status,
        scheduledDate,
        recipientCount: getEstimatedRecipientCount(),
        createdBy: 'current-user' // TODO: récupérer l'utilisateur actuel
      };

      // Add recipient emails if manual mode
      if (segmentType === 'manual' && recipientEmails.length > 0) {
        campaignPayload.recipientEmails = recipientEmails;
        console.log(`Adding ${recipientEmails.length} manual recipients to draft campaign`);
      }

      await createCampaign(campaignPayload);

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

    if (segmentType === 'manual' && recipientEmails.length === 0) {
      toast.error('Veuillez ajouter au moins une adresse email valide');
      return;
    }

    setSaving(true);
    const emailCount = segmentType === 'manual' ? recipientEmails.length : getEstimatedRecipientCount();
    toast.info(`Préparation de l'envoi à ${emailCount} destinataires...`);
    
    try {
      // Step 1: Create campaign in DRAFT status first
      const campaignPayload: any = {
        name: campaignData.name,
        subject: campaignData.subject,
        body: campaignData.body,
        fromName: campaignData.fromName,
        fromEmail: campaignData.fromEmail,
        status: 'DRAFT', // Create as draft first
        recipientCount: getEstimatedRecipientCount(),
        createdBy: 'current-user'
      };

      // Add recipient emails if manual mode
      if (segmentType === 'manual' && recipientEmails.length > 0) {
        campaignPayload.recipientEmails = recipientEmails;
        console.log(`Adding ${recipientEmails.length} manual recipients to campaign`);
      }

      console.log('Creating campaign with payload:', campaignPayload);

      // Create the campaign
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(campaignPayload),
      });

      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }

      const newCampaign = await response.json();
      toast.success('Campagne créée, envoi en cours...');

      // Step 2: Send the campaign
      const sendResponse = await fetch(`/api/campaigns/${newCampaign.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!sendResponse.ok) {
        throw new Error('Failed to send campaign');
      }

      const sendResult = await sendResponse.json();
      console.log('Campaign sent:', sendResult);
      
      const finalEmailCount = segmentType === 'manual' ? recipientEmails.length : getEstimatedRecipientCount();
      toast.success(`Campagne envoyée avec succès à ${finalEmailCount} destinataires!`);
      navigate('/campaigns');
    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Erreur lors de l\'envoi de la campagne');
    } finally {
      setSaving(false);
    }
  };

  const getEstimatedRecipientCount = () => {
    if (segmentType === 'manual') {
      return recipientEmails.length;
    }
    // Logique pour calculer le nombre de destinataires selon le segment
    switch (campaignData.recipientSegment) {
      case 'all':
        return 1234;
      case 'new-customers':
        return 45;
      case 'vip-customers':
        return 127;
      default:
        return 290;
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
            <h1 className="text-3xl font-bold">Nouvelle Campagne</h1>
            <p className="text-muted-foreground">Créez et configurez votre campagne d'emailing</p>
          </div>
        </div>

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
                  Définissez les paramètres de base de votre campagne
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="name">Nom de la campagne</Label>
                    <Input
                      id="name"
                      placeholder="Ex: Promotion d'été 2024"
                      value={campaignData.name}
                      onChange={(e) => setCampaignData({ ...campaignData, name: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="subject">Objet de l'email</Label>
                    <Input
                      id="subject"
                      placeholder="Ex: 🌞 Offre exclusive : -50% sur toute la collection été"
                      value={campaignData.subject}
                      onChange={(e) => setCampaignData({ ...campaignData, subject: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="from-name">Nom de l'expéditeur</Label>
                      <Input
                        id="from-name"
                        placeholder="Ex: EIDF CRM"
                        value={campaignData.fromName}
                        onChange={(e) => setCampaignData({ ...campaignData, fromName: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="from-email">Email de l'expéditeur</Label>
                      <Input
                        id="from-email"
                        type="email"
                        placeholder="Ex: noreply@eidf-crm.fr"
                        value={campaignData.fromEmail}
                        onChange={(e) => setCampaignData({ ...campaignData, fromEmail: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="schedule-date">Date d'envoi</Label>
                      <Input
                        id="schedule-date"
                        type="date"
                        value={campaignData.scheduledDate}
                        onChange={(e) => setCampaignData({ ...campaignData, scheduledDate: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="schedule-time">Heure d'envoi</Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={campaignData.scheduledTime}
                        onChange={(e) => setCampaignData({ ...campaignData, scheduledTime: e.target.value })}
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
              onSegmentChange={(segment) => {
                setCampaignData({ ...campaignData, recipientSegment: segment });
              }}
              segmentType={segmentType}
              onSegmentTypeChange={setSegmentType}
              recipientEmails={recipientEmails}
              onEmailsChange={setRecipientEmails}
            />
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <EmailPreview
              subject={campaignData.subject}
              content={campaignData.body}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6 pt-6 border-t">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Sauvegarde...' : 'Enregistrer le brouillon'}
          </Button>
          
          <div className="flex gap-3">
            {campaignData.scheduledDate && (
              <Button variant="outline" onClick={() => handleSave(false)} disabled={saving}>
                <Calendar className="h-4 w-4 mr-2" />
                {saving ? 'Programmation...' : 'Programmer l\'envoi'}
              </Button>
            )}
            <Button onClick={handleSendNow} disabled={saving}>
              <Send className="h-4 w-4 mr-2" />
              {saving ? 'Envoi...' : 'Envoyer maintenant'}
            </Button>
          </div>
        </div>
    </div>
  );
}