import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Monitor, Smartphone, Tablet, Mail, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { substituteVariables, generateSampleData } from '@/utils/templateVariables';
import { toast } from 'sonner';
import { campaignApiService } from '@/services/campaign-api.service';

interface EmailPreviewProps {
  subject: string;
  content: string;
  campaignId?: string;
}

export default function EmailPreview({ subject, content, campaignId = 'test' }: EmailPreviewProps) {
  const [deviceView, setDeviceView] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [useVariables, setUseVariables] = useState(true);
  const [testEmails, setTestEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Array<{email: string; success: boolean; error?: string}>>([]);

  const getPreviewWidth = () => {
    switch (deviceView) {
      case 'mobile':
        return 'max-w-[375px]';
      case 'tablet':
        return 'max-w-[768px]';
      default:
        return 'max-w-full';
    }
  };

  const sendTestEmail = async () => {
    if (!testEmails.trim()) {
      toast.error('Veuillez entrer au moins une adresse email');
      return;
    }

    const emails = testEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e)
      .slice(0, 5); // Max 5 emails

    if (emails.length === 0) {
      toast.error('Aucune adresse email valide');
      return;
    }

    setSending(true);
    setResults([]);

    try {
      const response = await campaignApiService.sendTestEmails(campaignId, emails);
      
      if (response && response.results) {
        setResults(response.results);
        
        const successCount = response.results.filter(r => r.success).length;
        const failCount = response.results.length - successCount;
        
        if (failCount === 0) {
          toast.success(`${successCount} email(s) de test envoyé(s) avec succès!`);
        } else if (successCount === 0) {
          toast.error(`Échec de l'envoi des ${failCount} email(s)`);
        } else {
          toast.warning(`${successCount} envoyé(s), ${failCount} échec(s)`);
        }
      }
    } catch (error: any) {
      console.error('Error sending test emails:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi des emails de test');
    } finally {
      setSending(false);
    }
  };

  const getProcessedContent = () => {
    if (useVariables) {
      const sampleData = generateSampleData();
      return {
        subject: substituteVariables(subject, sampleData),
        content: substituteVariables(content, sampleData)
      };
    }
    return { subject, content };
  };

  const processedEmail = getProcessedContent();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Aperçu de l'Email</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={useVariables ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUseVariables(!useVariables)}
              >
                Variables {useVariables ? 'ON' : 'OFF'}
              </Button>
              <Button
                variant={deviceView === 'desktop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDeviceView('desktop')}
              >
                <Monitor className="h-4 w-4" />
              </Button>
              <Button
                variant={deviceView === 'tablet' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDeviceView('tablet')}
              >
                <Tablet className="h-4 w-4" />
              </Button>
              <Button
                variant={deviceView === 'mobile' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDeviceView('mobile')}
              >
                <Smartphone className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`mx-auto transition-all duration-300 ${getPreviewWidth()}`}>
            <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
              <div className="border-b p-4 bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    E
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">EIDF CRM</p>
                    <p className="text-sm text-muted-foreground">noreply@eidf-crm.com</p>
                  </div>
                </div>
                <p className="font-medium mt-3">{processedEmail.subject || 'Objet de l\'email'}</p>
              </div>
              
              <div className="p-4">
                {processedEmail.content ? (
                  <div dangerouslySetInnerHTML={{ __html: processedEmail.content }} />
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Aucun contenu à afficher</p>
                    <p className="text-sm mt-2">Créez votre email dans l'onglet Contenu</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test d'Envoi</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="preview">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Aperçu Détaillé</TabsTrigger>
              <TabsTrigger value="test">Envoyer un Test</TabsTrigger>
            </TabsList>
            
            <TabsContent value="preview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">Informations de l'expéditeur</p>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm"><strong>De:</strong> EIDF CRM</p>
                    <p className="text-sm"><strong>Email:</strong> noreply@eidf-crm.com</p>
                    <p className="text-sm"><strong>Reply-To:</strong> contact@eidf-crm.com</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Paramètres techniques</p>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-sm"><strong>Encodage:</strong> UTF-8</p>
                    <p className="text-sm"><strong>Format:</strong> HTML + Texte brut</p>
                    <p className="text-sm"><strong>Tracking:</strong> Activé</p>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-2">Aperçu du texte brut</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-mono">
                    {content.replace(/<[^>]*>/g, '').substring(0, 200)}...
                  </p>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="test" className="space-y-4">
              <div>
                <label className="text-sm font-medium">Adresses email de test</label>
                <textarea
                  className="w-full mt-2 p-3 border rounded-lg dark:bg-gray-800 dark:border-gray-600"
                  rows={3}
                  placeholder="email1@example.com, email2@example.com..."
                  value={testEmails}
                  onChange={(e) => setTestEmails(e.target.value)}
                  disabled={sending}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Séparez les adresses par des virgules. Maximum 5 adresses.
                </p>
              </div>
              
              {results.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Résultats de l'envoi :</p>
                  {results.map((result, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                        {result.email}
                      </span>
                      {result.error && (
                        <span className="text-xs text-muted-foreground">({result.error})</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              <Button 
                onClick={sendTestEmail} 
                className="w-full" 
                disabled={sending || !testEmails.trim()}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Envoyer l'email de test
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}