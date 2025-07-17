import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Code, Eye, FileText, Image, Link, Type, List, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Plus } from 'lucide-react';
import { generateMockEmailTemplates } from '@/lib/mockCampaignData';
import { EmailTemplate } from '@/types/campaign';
import { availableVariables, substituteVariables, extractVariablesFromContent, getVariablesByCategory } from '@/utils/templateVariables';

interface EmailTemplateEditorProps {
  content: string;
  onChange: (content: string) => void;
  onTemplateSelect?: (template: { subject: string; body: string }) => void;
}

export default function EmailTemplateEditor({ content, onChange, onTemplateSelect }: EmailTemplateEditorProps) {
  const [editMode, setEditMode] = useState<'visual' | 'html'>('visual');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [visualContent, setVisualContent] = useState({
    title: '',
    subtitle: '',
    body: '',
    ctaText: 'En savoir plus',
    ctaLink: '#',
    footer: 'Se désabonner | Mettre à jour les préférences',
  });

  useEffect(() => {
    setTemplates(generateMockEmailTemplates());
  }, []);

  useEffect(() => {
    if (editMode === 'visual') {
      const htmlContent = generateHTMLFromVisual(visualContent);
      onChange(htmlContent);
    }
  }, [visualContent, editMode, onChange]);

  const generateHTMLFromVisual = (visual: typeof visualContent) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #4f46e5; color: white; padding: 40px 20px; text-align: center; }
    .content { padding: 40px 20px; }
    .cta { display: inline-block; background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #6c757d; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${visual.title}</h1>
      ${visual.subtitle ? `<p>${visual.subtitle}</p>` : ''}
    </div>
    <div class="content">
      <div>${visual.body.replace(/\n/g, '<br>')}</div>
      ${visual.ctaText ? `<div style="text-align: center;"><a href="${visual.ctaLink}" class="cta">${visual.ctaText}</a></div>` : ''}
    </div>
    <div class="footer">
      ${visual.footer}
    </div>
  </div>
</body>
</html>`;
  };

  const handleTemplateSelect = (templateId: string) => {
    if (templateId === 'none') {
      setSelectedTemplate('');
      onChange('');
      return;
    }
    
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      onChange(template.body);
      
      // Notifier la page parent du changement de template (pour remplir l'objet aussi)
      if (onTemplateSelect) {
        onTemplateSelect({
          subject: template.subject,
          body: template.body
        });
      }
      
      // Traitement spécial pour le template EIDF (contenu texte brut)
      if (templateId === 'template-eidf') {
        // Pour le template EIDF, utiliser le contenu brut directement
        setVisualContent({
          ...visualContent,
          title: 'Solutions sur-mesure en ventilation professionnelle',
          subtitle: template.subject,
          body: template.body,
        });
      } else {
        // Pour les autres templates HTML, parser le contenu
        const titleMatch = template.body.match(/<h1[^>]*>(.*?)<\/h1>/);
        const subtitleMatch = template.body.match(/<h2[^>]*>(.*?)<\/h2>/);
        const bodyMatch = template.body.match(/<p[^>]*>(.*?)<\/p>/);
        
        setVisualContent({
          ...visualContent,
          title: titleMatch ? titleMatch[1] : '',
          subtitle: subtitleMatch ? subtitleMatch[1] : '',
          body: bodyMatch ? bodyMatch[1] : template.body,
        });
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Modèles d'Email</CardTitle>
          <CardDescription>Choisissez un modèle ou créez votre propre design</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedTemplate || 'none'} onValueChange={handleTemplateSelect}>
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner un modèle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun modèle</SelectItem>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {templates.map(template => (
              <div
                key={template.id}
                className={`border rounded-lg p-2 cursor-pointer hover:border-primary transition-colors ${
                  selectedTemplate === template.id ? 'border-primary' : ''
                }`}
                onClick={() => handleTemplateSelect(template.id)}
              >
                <img
                  src={template.thumbnailUrl}
                  alt={template.name}
                  className="w-full h-32 object-cover rounded"
                />
                <p className="text-sm font-medium mt-2">{template.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Éditeur de Contenu</CardTitle>
          <div className="flex gap-2">
            <Tabs value={editMode} onValueChange={(v) => setEditMode(v as 'visual' | 'html')}>
              <TabsList>
                <TabsTrigger value="visual">
                  <Eye className="h-4 w-4 mr-2" />
                  Visuel
                </TabsTrigger>
                <TabsTrigger value="html">
                  <Code className="h-4 w-4 mr-2" />
                  HTML
                </TabsTrigger>
              </TabsList>
            </Tabs>
            
            {/* Variables disponibles */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium mb-3">Variables disponibles</h4>
              <div className="space-y-3">
                {['contact', 'entreprise', 'general'].map(category => (
                  <div key={category}>
                    <p className="text-xs font-medium text-gray-600 mb-2 capitalize">{category}</p>
                    <div className="flex flex-wrap gap-2">
                      {getVariablesByCategory(category as any).map(variable => (
                        <Badge 
                          key={variable.name}
                          variant="outline" 
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground text-xs"
                          onClick={() => {
                            if (editMode === 'visual') {
                              // Ajouter à la section appropriée
                              const newContent = visualContent.body + ' ' + variable.placeholder;
                              setVisualContent({...visualContent, body: newContent});
                            } else {
                              // Ajouter au HTML
                              onChange(content + ' ' + variable.placeholder);
                            }
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {variable.placeholder}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editMode === 'visual' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="email-title">Titre principal</Label>
                <Input
                  id="email-title"
                  value={visualContent.title}
                  onChange={(e) => setVisualContent({ ...visualContent, title: e.target.value })}
                  placeholder="Ex: Offre Spéciale pour Vous!"
                />
              </div>
              
              <div>
                <Label htmlFor="email-subtitle">Sous-titre (optionnel)</Label>
                <Input
                  id="email-subtitle"
                  value={visualContent.subtitle}
                  onChange={(e) => setVisualContent({ ...visualContent, subtitle: e.target.value })}
                  placeholder="Ex: Profitez de -50% sur toute la boutique"
                />
              </div>
              
              <div>
                <Label htmlFor="email-body">Corps du message</Label>
                <Textarea
                  id="email-body"
                  value={visualContent.body}
                  onChange={(e) => setVisualContent({ ...visualContent, body: e.target.value })}
                  placeholder="Écrivez votre message ici..."
                  rows={6}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cta-text">Texte du bouton CTA</Label>
                  <Input
                    id="cta-text"
                    value={visualContent.ctaText}
                    onChange={(e) => setVisualContent({ ...visualContent, ctaText: e.target.value })}
                    placeholder="Ex: Acheter maintenant"
                  />
                </div>
                <div>
                  <Label htmlFor="cta-link">Lien du bouton</Label>
                  <Input
                    id="cta-link"
                    value={visualContent.ctaLink}
                    onChange={(e) => setVisualContent({ ...visualContent, ctaLink: e.target.value })}
                    placeholder="https://example.com"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="email-footer">Pied de page</Label>
                <Input
                  id="email-footer"
                  value={visualContent.footer}
                  onChange={(e) => setVisualContent({ ...visualContent, footer: e.target.value })}
                  placeholder="Liens de désinscription, etc."
                />
              </div>
            </div>
          ) : (
            <div>
              <Textarea
                value={content}
                onChange={(e) => onChange(e.target.value)}
                className="font-mono text-sm"
                rows={20}
                placeholder="Entrez votre code HTML ici..."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}