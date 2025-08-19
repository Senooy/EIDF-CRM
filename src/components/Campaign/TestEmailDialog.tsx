import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { campaignApiService } from '@/services/campaign-api.service';
import { toast } from 'sonner';

interface TestEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  campaignSubject: string;
}

export default function TestEmailDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  campaignSubject
}: TestEmailDialogProps) {
  const [emails, setEmails] = useState('');
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<Array<{
    email: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>>([]);

  const handleSendTest = async () => {
    if (!emails.trim()) {
      toast.error('Veuillez entrer au moins une adresse email');
      return;
    }

    const emailList = emails
      .split(',')
      .map(e => e.trim())
      .filter(e => e && e.includes('@'))
      .slice(0, 5);

    if (emailList.length === 0) {
      toast.error('Aucune adresse email valide trouvée');
      return;
    }

    setSending(true);
    setResults([]);

    try {
      const response = await campaignApiService.sendTestEmails(campaignId, emailList);
      
      if (response && response.results) {
        setResults(response.results);
        
        const successCount = response.results.filter(r => r.success).length;
        const failCount = response.results.length - successCount;
        
        if (failCount === 0) {
          toast.success(`✅ ${successCount} email(s) de test envoyé(s) avec succès!`);
        } else if (successCount === 0) {
          toast.error(`❌ Échec de l'envoi des ${failCount} email(s)`);
        } else {
          toast.warning(`⚠️ ${successCount} envoyé(s), ${failCount} échec(s)`);
        }
      }
    } catch (error: any) {
      console.error('Error sending test emails:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi des emails de test');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setEmails('');
    setResults([]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Envoyer un email de test</DialogTitle>
          <DialogDescription>
            Testez la campagne "{campaignName}" avant l'envoi officiel.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Objet:</strong> [TEST] {campaignSubject}
            </AlertDescription>
          </Alert>

          <div className="grid gap-2">
            <Label htmlFor="emails">
              Adresses email de test (max 5)
            </Label>
            <Textarea
              id="emails"
              placeholder="email1@example.com, email2@example.com..."
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              disabled={sending}
              className="min-h-[80px]"
            />
            <p className="text-xs text-muted-foreground">
              Séparez les adresses par des virgules
            </p>
          </div>

          {results.length > 0 && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">Résultats de l'envoi :</p>
              {results.map((result, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                  <span className={`flex-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                    {result.email}
                  </span>
                  {result.error && (
                    <span className="text-xs text-muted-foreground">
                      {result.error}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sending}
          >
            Fermer
          </Button>
          <Button
            onClick={handleSendTest}
            disabled={sending || !emails.trim()}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi en cours...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Envoyer le test
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}