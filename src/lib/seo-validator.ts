// Validateur pour s'assurer que le contenu SEO est en français

const ENGLISH_PATTERNS = [
  /shop\s+for/i,
  /buy\s+now/i,
  /purchase\s+our/i,
  /in\s+our\s+\w+\s+category/i,
  /free\s+shipping/i,
  /add\s+to\s+cart/i,
  /best\s+seller/i,
  /on\s+sale/i,
  /limited\s+time/i,
  /customer\s+reviews/i
];

const FRENCH_INDICATORS = [
  'découvrez',
  'notre',
  'votre',
  'livraison',
  'gratuit',
  'gratuite',
  'garantie',
  'qualité',
  'commandez',
  'profitez',
  'achetez',
  'meilleur',
  'nouveau',
  'exclusive',
  'satisfait',
  'remboursé',
  'prix',
  'promotion',
  'offre'
];

export function isContentInFrench(content: string): boolean {
  const lowerContent = content.toLowerCase();
  
  // Vérifier la présence de patterns anglais
  for (const pattern of ENGLISH_PATTERNS) {
    if (pattern.test(content)) {
      return false;
    }
  }
  
  // Vérifier la présence d'indicateurs français
  let frenchWordCount = 0;
  for (const word of FRENCH_INDICATORS) {
    if (lowerContent.includes(word)) {
      frenchWordCount++;
    }
  }
  
  // Au moins 2 mots français devraient être présents
  return frenchWordCount >= 2;
}

export function validateSEOContent(seoContent: {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  focusKeyphrase: string;
}): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Vérifier les longueurs
  if (seoContent.metaTitle.length > 60) {
    errors.push('Meta title trop long (max 60 caractères)');
  }
  
  if (seoContent.metaDescription.length > 160) {
    errors.push('Meta description trop longue (max 160 caractères)');
  }
  
  if (seoContent.metaDescription.length < 120) {
    errors.push('Meta description trop courte (min 120 caractères)');
  }
  
  // Vérifier que c'est en français
  if (!isContentInFrench(seoContent.metaTitle)) {
    errors.push('Meta title contient du contenu en anglais');
  }
  
  if (!isContentInFrench(seoContent.metaDescription)) {
    errors.push('Meta description contient du contenu en anglais');
  }
  
  // Vérifier les mots-clés
  if (seoContent.keywords.length < 3) {
    errors.push('Pas assez de mots-clés (min 3)');
  }
  
  if (seoContent.keywords.length > 8) {
    errors.push('Trop de mots-clés (max 8)');
  }
  
  // Vérifier la phrase clé
  if (seoContent.focusKeyphrase.split(' ').length < 2) {
    errors.push('Phrase clé trop courte (min 2 mots)');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}