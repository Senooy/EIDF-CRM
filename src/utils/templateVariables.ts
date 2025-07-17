// Système de variables pour les templates d'emails

export interface TemplateVariable {
  name: string;
  placeholder: string;
  description: string;
  category: 'contact' | 'entreprise' | 'general';
  defaultValue?: string;
}

export const availableVariables: TemplateVariable[] = [
  // Variables contact
  {
    name: 'prenom_contact',
    placeholder: '{{prenom_contact}}',
    description: 'Prénom du contact',
    category: 'contact',
    defaultValue: 'Jean'
  },
  {
    name: 'nom_contact',
    placeholder: '{{nom_contact}}',
    description: 'Nom du contact',
    category: 'contact',
    defaultValue: 'Dupont'
  },
  {
    name: 'email_contact',
    placeholder: '{{email_contact}}',
    description: 'Email du contact',
    category: 'contact',
    defaultValue: 'jean.dupont@entreprise.com'
  },
  
  // Variables entreprise
  {
    name: 'nom_entreprise',
    placeholder: '{{nom_entreprise}}',
    description: 'Nom de l\'entreprise cliente',
    category: 'entreprise',
    defaultValue: 'Climatech Pro'
  },
  {
    name: 'ville',
    placeholder: '{{ville}}',
    description: 'Ville de l\'entreprise',
    category: 'entreprise',
    defaultValue: 'Lyon'
  },
  {
    name: 'region',
    placeholder: '{{region}}',
    description: 'Région de l\'entreprise',
    category: 'entreprise',
    defaultValue: 'Rhône-Alpes'
  },
  {
    name: 'surface_atelier',
    placeholder: '{{surface_atelier}}',
    description: 'Surface de l\'atelier',
    category: 'entreprise',
    defaultValue: '2000 m²'
  },
  
  // Variables générales
  {
    name: 'date_actuelle',
    placeholder: '{{date_actuelle}}',
    description: 'Date actuelle',
    category: 'general',
    defaultValue: new Date().toLocaleDateString('fr-FR')
  },
  {
    name: 'annee_actuelle',
    placeholder: '{{annee_actuelle}}',
    description: 'Année actuelle',
    category: 'general',
    defaultValue: new Date().getFullYear().toString()
  }
];

export function substituteVariables(content: string, variables: Record<string, string> = {}): string {
  let result = content;
  
  availableVariables.forEach(variable => {
    const value = variables[variable.name] || variable.defaultValue || variable.placeholder;
    const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

export function extractVariablesFromContent(content: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    matches.push(match[1]);
  }
  
  return [...new Set(matches)];
}

export function generateSampleData(): Record<string, string> {
  const sampleData: Record<string, string> = {};
  
  availableVariables.forEach(variable => {
    sampleData[variable.name] = variable.defaultValue || variable.placeholder;
  });
  
  return sampleData;
}

export function getVariablesByCategory(category: 'contact' | 'entreprise' | 'general'): TemplateVariable[] {
  return availableVariables.filter(variable => variable.category === category);
}