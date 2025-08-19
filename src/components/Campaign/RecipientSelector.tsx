import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Users, Filter, Plus, X } from 'lucide-react';

interface RecipientSelectorProps {
  selectedSegment: string;
  onSegmentChange: (segment: string) => void;
  segmentType?: 'all' | 'segment' | 'custom' | 'manual';
  onSegmentTypeChange?: (type: 'all' | 'segment' | 'custom' | 'manual') => void;
  recipientEmails?: string[];
  onEmailsChange?: (emails: string[]) => void;
}

interface FilterCriteria {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export default function RecipientSelector({ 
  selectedSegment, 
  onSegmentChange,
  segmentType: propSegmentType,
  onSegmentTypeChange,
  recipientEmails = [],
  onEmailsChange 
}: RecipientSelectorProps) {
  const [filters, setFilters] = useState<FilterCriteria[]>([]);
  const [segmentType, setSegmentType] = useState<'all' | 'segment' | 'custom' | 'manual'>(propSegmentType || 'all');
  const [emailList, setEmailList] = useState<string>(recipientEmails.join('\n'));
  const [emailErrors, setEmailErrors] = useState<string[]>([]);

  const predefinedSegments = [
    { id: 'new-customers', name: 'Nouveaux clients', count: 45 },
    { id: 'vip-customers', name: 'Clients VIP', count: 127 },
    { id: 'inactive-30', name: 'Inactifs +30 jours', count: 89 },
    { id: 'high-value', name: 'Gros acheteurs', count: 234 },
    { id: 'newsletter', name: 'Abonnés newsletter', count: 567 },
  ];

  const addFilter = () => {
    const newFilter: FilterCriteria = {
      id: Date.now().toString(),
      field: 'total_spent',
      operator: 'greater_than',
      value: '',
    };
    setFilters([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterCriteria>) => {
    setFilters(filters.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailListChange = (value: string) => {
    setEmailList(value);
    
    // Parse and validate emails
    const emails = value
      .split(/[,;\n]/)
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    const errors: string[] = [];
    const validEmails: string[] = [];
    
    emails.forEach((email, index) => {
      if (validateEmail(email)) {
        validEmails.push(email);
      } else if (email) {
        errors.push(`Ligne ${index + 1}: "${email}" n'est pas une adresse email valide`);
      }
    });
    
    setEmailErrors(errors);
    if (onEmailsChange) {
      onEmailsChange(validEmails);
    }
  };

  const getEstimatedCount = () => {
    if (segmentType === 'all') return 1234;
    if (segmentType === 'segment') {
      const segment = predefinedSegments.find(s => s.id === selectedSegment);
      return segment?.count || 0;
    }
    if (segmentType === 'manual') {
      const emails = emailList
        .split(/[,;\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0 && validateEmail(e));
      return emails.length;
    }
    return Math.floor(Math.random() * 500) + 100;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sélection des Destinataires</CardTitle>
          <CardDescription>
            Choisissez qui recevra cette campagne
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <RadioGroup value={segmentType} onValueChange={(v) => {
            const newType = v as 'all' | 'segment' | 'custom' | 'manual';
            setSegmentType(newType);
            if (onSegmentTypeChange) {
              onSegmentTypeChange(newType);
            }
          }}>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="all" id="all" />
                <div className="flex-1">
                  <Label htmlFor="all" className="text-base font-medium cursor-pointer">
                    Tous les contacts
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Envoyer à tous les contacts de votre base
                  </p>
                </div>
                <Badge variant="secondary">1234 contacts</Badge>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="segment" id="segment" />
                <div className="flex-1">
                  <Label htmlFor="segment" className="text-base font-medium cursor-pointer">
                    Segment prédéfini
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Utiliser un segment existant
                  </p>
                  {segmentType === 'segment' && (
                    <Select value={selectedSegment} onValueChange={onSegmentChange}>
                      <SelectTrigger className="mt-2">
                        <SelectValue placeholder="Choisir un segment" />
                      </SelectTrigger>
                      <SelectContent>
                        {predefinedSegments.map(segment => (
                          <SelectItem key={segment.id} value={segment.id}>
                            <div className="flex justify-between items-center w-full">
                              <span>{segment.name}</span>
                              <Badge variant="outline" className="ml-2">{segment.count}</Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="custom" id="custom" />
                <div className="flex-1">
                  <Label htmlFor="custom" className="text-base font-medium cursor-pointer">
                    Critères personnalisés
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Créer un segment avec des filtres
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <RadioGroupItem value="manual" id="manual" />
                <div className="flex-1">
                  <Label htmlFor="manual" className="text-base font-medium cursor-pointer">
                    Liste manuelle d'emails
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Saisir ou coller une liste d'adresses email
                  </p>
                  {segmentType === 'manual' && (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="Entrez les adresses email (une par ligne ou séparées par des virgules)&#10;&#10;Exemple:&#10;jean.dupont@example.com&#10;marie.martin@example.com&#10;pierre.bernard@example.com"
                        value={emailList}
                        onChange={(e) => handleEmailListChange(e.target.value)}
                        className="min-h-[150px] font-mono text-sm"
                      />
                      {emailErrors.length > 0 && (
                        <div className="rounded-md bg-destructive/10 p-3">
                          <p className="text-sm font-medium text-destructive mb-1">Erreurs détectées:</p>
                          <ul className="text-xs text-destructive space-y-1">
                            {emailErrors.slice(0, 3).map((error, i) => (
                              <li key={i}>• {error}</li>
                            ))}
                            {emailErrors.length > 3 && (
                              <li>• ...et {emailErrors.length - 3} autres erreurs</li>
                            )}
                          </ul>
                        </div>
                      )}
                      {emailList && emailErrors.length === 0 && (
                        <p className="text-sm text-green-600">
                          ✓ {getEstimatedCount()} adresses email valides
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </RadioGroup>

          {segmentType === 'custom' && (
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium">Filtres</h4>
                <Button onClick={addFilter} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un filtre
                </Button>
              </div>

              {filters.map(filter => (
                <div key={filter.id} className="flex gap-2 items-center">
                  <Select
                    value={filter.field}
                    onValueChange={(value) => updateFilter(filter.id, { field: value })}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="total_spent">Montant total dépensé</SelectItem>
                      <SelectItem value="order_count">Nombre de commandes</SelectItem>
                      <SelectItem value="last_order_date">Date dernière commande</SelectItem>
                      <SelectItem value="city">Ville</SelectItem>
                      <SelectItem value="country">Pays</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={filter.operator}
                    onValueChange={(value) => updateFilter(filter.id, { operator: value })}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">Égal à</SelectItem>
                      <SelectItem value="not_equals">Différent de</SelectItem>
                      <SelectItem value="greater_than">Supérieur à</SelectItem>
                      <SelectItem value="less_than">Inférieur à</SelectItem>
                      <SelectItem value="contains">Contient</SelectItem>
                    </SelectContent>
                  </Select>

                  <Input
                    value={filter.value}
                    onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                    placeholder="Valeur"
                    className="flex-1"
                  />

                  <Button
                    onClick={() => removeFilter(filter.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {filters.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun filtre ajouté. Cliquez sur "Ajouter un filtre" pour commencer.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Destinataires estimés</p>
                <p className="text-2xl font-bold">{getEstimatedCount().toLocaleString()}</p>
              </div>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              ~{Math.floor(getEstimatedCount() / 10)} € estimés
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}