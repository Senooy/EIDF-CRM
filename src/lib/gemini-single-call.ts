import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeneratedProductContent } from './gemini-service';
import { isContentInFrench, validateSEOContent } from './seo-validator';

export interface SEOStyle {
  name: string;
  description: string;
  guidelines: string;
  tone: string;
  focusPoints: string[];
  titleSuffix?: string; // Suffixe personnalisé pour les titres
}

// Styles prédéfinis
export const predefinedStyles: SEOStyle[] = [
  {
    name: "commercial",
    description: "Style commercial classique",
    guidelines: "Mettre en avant les caractéristiques, le prix, la livraison et la garantie.",
    tone: "Professionnel et persuasif, orienté conversion",
    focusPoints: ["caractéristiques produit", "rapport qualité-prix", "garanties", "livraison rapide"]
  },
  {
    name: "utility",
    description: "Axé sur l'utilité et les bénéfices",
    guidelines: "Expliquer comment le produit résout des problèmes et améliore la vie du client.",
    tone: "Informatif et pratique, centré sur les avantages client",
    focusPoints: ["utilité du produit", "résolution de problèmes", "bénéfices concrets", "cas d'usage"]
  },
  {
    name: "storytelling",
    description: "Narration et émotion",
    guidelines: "Raconter une histoire autour du produit, créer une connexion émotionnelle.",
    tone: "Narratif et émotionnel, création d'une expérience",
    focusPoints: ["histoire du produit", "artisanat", "valeurs", "expérience utilisateur"]
  },
  {
    name: "technical",
    description: "Technique et détaillé",
    guidelines: "Fournir des spécifications détaillées et des informations techniques approfondies.",
    tone: "Précis et informatif, pour un public averti",
    focusPoints: ["spécifications techniques", "matériaux", "processus de fabrication", "performance"]
  },
  {
    name: "ecological",
    description: "Écologique et durable",
    guidelines: "Mettre en avant l'aspect écologique, durable et responsable du produit.",
    tone: "Engagé et responsable, sensibilisation environnementale",
    focusPoints: ["durabilité", "impact environnemental", "matériaux écologiques", "commerce équitable"]
  }
];

// Obtenir des exemples spécifiques selon le style
function getStyleExamples(style: SEOStyle): string {
  const examples: Record<string, string> = {
    commercial: `EXEMPLES POUR LE STYLE COMMERCIAL :
- Titre : "Produit X Premium - Livraison 24h Offerte"
- Description : Commence par "Profitez de..." ou "Découvrez notre..."
- Mets en avant : prix compétitif, garantie, livraison rapide
- Mots-clés : inclure "pas cher", "meilleur prix", "livraison gratuite"`,
    
    utility: `EXEMPLES POUR LE STYLE UTILITÉ :
- Titre : "Produit X - Solution Efficace pour [Problème]"
- Description : Commence par "Résolvez..." ou "Simplifiez votre quotidien..."
- Mets en avant : comment le produit facilite la vie, gain de temps, efficacité
- Mots-clés : inclure "pratique", "efficace", "gain de temps", "solution"`,
    
    storytelling: `EXEMPLES POUR LE STYLE STORYTELLING :
- Titre : "Produit X - L'Histoire d'un Savoir-Faire"
- Description : Commence par "Depuis [année]..." ou "Né de la passion..."
- Mets en avant : histoire, artisanat, tradition, valeurs humaines
- Mots-clés : inclure "artisanal", "fait main", "tradition", "authentique"`,
    
    technical: `EXEMPLES POUR LE STYLE TECHNIQUE :
- Titre : "Té Galvanisé 45° Ø400/125mm - Raccordement Pro"
- Description : "Le té galvanisé de 45°, avec des diamètres de 400 mm et 125 mm, permet le raccordement de deux branches de réseaux avec un angle de 45 degrés."
- Mets en avant : dimensions précises, angles, matériaux (galvanisé), applications techniques
- Utilise : termes techniques précis, mesures exactes, description fonctionnelle
- Mots-clés : inclure dimensions, matériau, type de raccordement, application`,
    
    ecological: `EXEMPLES POUR LE STYLE ÉCOLOGIQUE :
- Titre : "Produit X Éco-Responsable - [Matériau] Durable"
- Description : Commence par "Respectueux de l'environnement..." ou "Fabriqué durablement..."
- Mets en avant : matériaux écologiques, impact carbone réduit, recyclable, commerce équitable
- Mots-clés : inclure "écologique", "durable", "recyclable", "bio", "responsable"`
  };
  
  return examples[style.name] || '';
}

// Générer un fallback adapté au style sélectionné
function getFallbackByStyle(style: SEOStyle, productName: string, shortName: string, product: any): GeneratedProductContent {
  // Nettoyer le nom du produit des anciens suffixes et textes parasites
  const cleanProductName = (name: string) => {
    // Supprimer les anciens suffixes et textes parasites
    let cleaned = name
      .replace(/\s*\|\s*Eco Industrie de France/gi, '')
      // Supprimer tous les textes marketing après un tiret
      .replace(/\s*-\s*Qualité Premium/gi, '')
      .replace(/\s*-\s*Solution Pratique/gi, '')
      .replace(/\s*-\s*Livraison Offerte/gi, '')
      .replace(/\s*-\s*Spécifications Techniques/gi, '')
      .replace(/\s*-\s*Éco-Responsable/gi, '')
      .replace(/\s*-\s*Histoire & Tradition/gi, '')
      .replace(/\s*-\s*Prix Imbattable/gi, '')
      .replace(/\s*-\s*Solution Efficace et Pratique/gi, '')
      .replace(/\s*-\s*Raccordement Professionnel/gi, '')
      .replace(/\s*-\s*Produit Durable/gi, '')
      .replace(/\s*-\s*Artisanat & Tradition/gi, '')
      .replace(/\s*-\s*Design Premium/gi, '')
      .replace(/\s*-\s*Haute Qualité/gi, '')
      .replace(/\s*-\s*Professionnel/gi, '')
      .replace(/\s*-\s*Premium/gi, '')
      .replace(/\s*-\s*Pro/gi, '')
      .replace(/\s*Écologique\s*-\s*Produit Durable/gi, '')
      // Supprimer les abréviations tronquées sans sens
      .replace(/\s*-\s*Qu\b/gi, '')
      .replace(/\s*-\s*[A-Z]{1,2}\b(?!\w)/g, '') // Supprime les abréviations courtes isolées
      // Règle générale : supprimer tout texte marketing après le dernier tiret
      .replace(/\s*-\s*[^-]{1,30}$/i, (match) => {
        // Vérifier si ce qui suit le tiret ressemble à un texte marketing
        const marketingPatterns = /qualité|premium|pro|offert|gratuit|économ|pratique|solution|efficace|durable|écolo|artisan|tradition|histoire|spécif|technique|responsable|garant|livr|promo|solde|destockage|nouveau|exclusif|unique|exception|meilleur|imbattable/i;
        if (marketingPatterns.test(match)) {
          return '';
        }
        return match;
      })
      .trim();
    
    // Supprimer les doubles espaces
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned;
  };
  
  // Nettoyer le nom du produit pour utilisation dans le contenu (sans suffixe)
  const cleanedProductName = cleanProductName(productName);
  
  // Ajouter le suffixe UNIQUEMENT pour les titres SEO
  const getTitleWithSuffix = (name: string) => {
    const cleaned = cleanProductName(name);
    if (style.titleSuffix) {
      return `${cleaned} ${style.titleSuffix}`;
    }
    return cleaned;
  };
  
  // Parser le nom du produit pour extraire les infos techniques
  const extractProductInfo = (name: string) => {
    // Extraire les dimensions (ex: 400mm, Ø125, 45°)
    const dimensions = name.match(/(\d+(?:\.\d+)?)\s*(?:mm|cm|m|°|Ø)/gi) || [];
    const angles = name.match(/\d+°/g) || [];
    const diameters = name.match(/[ØD]\s*\d+/gi) || [];
    
    return { dimensions, angles, diameters };
  };
  
  const productInfo = extractProductInfo(cleanedProductName);
  
  const fallbacks: Record<string, GeneratedProductContent> = {
    commercial: {
      title: getTitleWithSuffix(cleanedProductName),
      shortDescription: `${cleanedProductName} disponible immédiatement. Prix compétitif, livraison express 24h gratuite, garantie 2 ans. Stock limité, commandez maintenant!`,
      description: `<p>Le <strong>${cleanedProductName.toLowerCase()}</strong> est disponible au meilleur prix du marché avec des conditions exceptionnelles.</p><p>Profitez de notre offre spéciale incluant la livraison express gratuite et une garantie étendue.</p><ul><li>✓ <strong>Prix compétitif garanti</strong> - Nous alignons nos prix sur la concurrence</li><li>✓ Livraison express 24h offerte dès 50€ d'achat</li><li>✓ Garantie constructeur étendue à 2 ans</li><li>✓ Paiement sécurisé en 3x ou 4x sans frais</li></ul><p><strong>Attention stock limité!</strong> Plus que quelques exemplaires disponibles.</p>`,
      seo: {
        metaTitle: getTitleWithSuffix(cleanedProductName),
        metaDescription: `${cleanedProductName} au meilleur prix. Livraison 24h gratuite, garantie 2 ans, paiement 3x sans frais. Stock limité, commandez maintenant!`,
        keywords: [cleanedProductName.toLowerCase(), 'prix compétitif', 'livraison gratuite', 'garantie 2 ans', 'stock limité', 'paiement 3x'],
        focusKeyphrase: `${cleanedProductName.toLowerCase()} prix`
      }
    },
    utility: {
      title: getTitleWithSuffix(cleanedProductName),
      shortDescription: `${cleanedProductName} conçu pour faciliter vos installations. Solution pratique et efficace pour les professionnels. Gain de temps assuré, qualité durable.`,
      description: `<p>Le <strong>${cleanedProductName.toLowerCase()}</strong> est spécialement conçu pour simplifier vos travaux d'installation et de maintenance.</p><p>Cette solution professionnelle vous permet d'optimiser votre temps de travail tout en garantissant des résultats durables.</p><ul><li>✓ <strong>Installation rapide</strong> - Mise en œuvre simplifiée pour gagner du temps sur chantier</li><li>✓ Compatibilité universelle avec les systèmes existants</li><li>✓ Réduction des coûts de main-d'œuvre grâce à sa facilité d'utilisation</li><li>✓ Maintenance réduite grâce à sa conception robuste</li></ul><p>Une solution <strong>pratique et économique</strong> pour tous vos projets.</p>`,
      seo: {
        metaTitle: getTitleWithSuffix(cleanedProductName),
        metaDescription: `${cleanedProductName} pour installation facile et rapide. Solution pratique pour professionnels, gain de temps, qualité durable. Commandez en ligne!`,
        keywords: ['installation facile', cleanedProductName.toLowerCase(), 'solution pratique', 'gain de temps', 'professionnel', 'maintenance réduite'],
        focusKeyphrase: `${cleanedProductName.toLowerCase()} installation`
      }
    },
    technical: {
      title: getTitleWithSuffix(cleanedProductName),
      shortDescription: productInfo.dimensions.length > 0 
        ? `${cleanedProductName} avec dimensions ${productInfo.dimensions.join(', ')}. Matériau galvanisé résistant, conforme aux normes. Qualité professionnelle.`
        : `${cleanedProductName} fabriqué en acier galvanisé haute résistance. Conforme aux normes CE et NF. Installation professionnelle recommandée.`,
      description: `<p>Le <strong>${cleanedProductName.toLowerCase()}</strong> est un composant technique de qualité professionnelle conçu pour des applications exigeantes.</p>${
        productInfo.dimensions.length > 0 
          ? `<p>Caractéristiques dimensionnelles : ${productInfo.dimensions.join(', ')}${productInfo.angles.length > 0 ? `, angle ${productInfo.angles.join(', ')}` : ''}${productInfo.diameters.length > 0 ? `, diamètres ${productInfo.diameters.join(', ')}` : ''}</p>`
          : ''
      }<ul><li>✓ <strong>Matériau</strong> : Acier galvanisé à chaud, épaisseur conforme aux normes</li><li>✓ <strong>Traitement</strong> : Galvanisation par immersion, protection anti-corrosion longue durée</li><li>✓ <strong>Applications</strong> : Réseaux de ventilation, plomberie industrielle, systèmes CVC</li><li>✓ <strong>Conformité</strong> : Marquage CE, norme NF EN 1506, résistance pression 500 Pa</li></ul><p>Produit technique destiné à une <strong>installation par des professionnels qualifiés</strong>.</p>`,
      seo: {
        metaTitle: getTitleWithSuffix(cleanedProductName),
        metaDescription: productInfo.dimensions.length > 0
          ? `${cleanedProductName} ${productInfo.dimensions.join(' ')} galvanisé. Conforme CE/NF, résistant corrosion. Pour professionnels.`
          : `${cleanedProductName} en acier galvanisé conforme CE/NF. Qualité professionnelle, résistant corrosion. Installation par professionnel.`,
        keywords: [cleanedProductName.toLowerCase(), 'galvanisé', 'norme CE', 'norme NF', ...productInfo.dimensions.map(d => d.toLowerCase()), 'professionnel'],
        focusKeyphrase: `${cleanedProductName.toLowerCase()} galvanisé`
      }
    },
    ecological: {
      title: getTitleWithSuffix(cleanedProductName),
      shortDescription: `${cleanedProductName} fabriqué en France avec matériaux recyclables. Production éco-responsable, empreinte carbone réduite. Certification environnementale.`,
      description: `<p>Le <strong>${cleanedProductName.toLowerCase()}</strong> est issu d'une démarche éco-responsable privilégiant les matériaux durables et les circuits courts.</p><p>Fabriqué en France dans le respect des normes environnementales les plus strictes.</p><ul><li>✓ <strong>Matériaux recyclables à 100%</strong> - Acier recyclé et recyclable en fin de vie</li><li>✓ Production locale réduisant l'empreinte carbone du transport</li><li>✓ Process de fabrication optimisé pour minimiser les déchets</li><li>✓ Emballage en carton recyclé et film plastique biodégradable</li></ul><p>Choisir ce produit, c'est <strong>s'engager pour l'environnement</strong> sans compromis sur la qualité.</p>`,
      seo: {
        metaTitle: getTitleWithSuffix(cleanedProductName),
        metaDescription: `${cleanedProductName} éco-responsable fabriqué en France. Matériaux 100% recyclables, production durable, emballage écologique.`,
        keywords: [cleanedProductName.toLowerCase(), 'éco-responsable', 'fabriqué en France', 'recyclable', 'durable', 'écologique'],
        focusKeyphrase: `${cleanedProductName.toLowerCase()} écologique`
      }
    },
    storytelling: {
      title: getTitleWithSuffix(cleanedProductName),
      shortDescription: `${cleanedProductName} issu du savoir-faire français. Fabrication artisanale dans nos ateliers, qualité transmise depuis 3 générations. Pièce unique.`,
      description: `<p>Derrière chaque <strong>${cleanedProductName.toLowerCase()}</strong> se cache l'histoire d'un savoir-faire familial transmis depuis 1950.</p><p>Nos artisans perpétuent les gestes traditionnels tout en intégrant les innovations modernes pour vous offrir l'excellence.</p><ul><li>✓ <strong>70 ans d'expertise</strong> - Un savoir-faire reconnu dans toute la profession</li><li>✓ Fabrication dans nos ateliers français par des compagnons qualifiés</li><li>✓ Sélection rigoureuse des matières premières auprès de fournisseurs locaux</li><li>✓ Contrôle qualité unitaire garantissant la perfection de chaque pièce</li></ul><p>Plus qu'un produit, <strong>une histoire de passion et d'excellence</strong> au service de vos projets.</p>`,
      seo: {
        metaTitle: getTitleWithSuffix(cleanedProductName),
        metaDescription: `${cleanedProductName} fabriqué artisanalement en France depuis 1950. Savoir-faire familial, qualité exceptionnelle, contrôle unitaire.`,
        keywords: [cleanedProductName.toLowerCase(), 'fabrication française', 'artisanal', 'savoir-faire', 'tradition', 'qualité'],
        focusKeyphrase: `${cleanedProductName.toLowerCase()} artisanal`
      }
    }
  };
  
  // Retourner le fallback correspondant au style, ou le commercial par défaut
  return fallbacks[style.name] || fallbacks.commercial;
}

// Générer tout le contenu en un seul appel API avec style personnalisé
export async function generateAllContentSingleCall(
  genAI: GoogleGenerativeAI,
  product: any,
  style?: SEOStyle
): Promise<GeneratedProductContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const categoryName = product.categories?.[0]?.name || 'Boutique';
  
  // Utiliser le style par défaut (commercial) si aucun n'est fourni
  const selectedStyle = style || predefinedStyles[0];
  console.log('[generateAllContentSingleCall] Style reçu:', style);
  console.log('[generateAllContentSingleCall] Style sélectionné:', selectedStyle);
  
  const prompt = `Tu es un expert en e-commerce et SEO français. Génère TOUT le contenu marketing optimisé pour ce produit en UN SEUL JSON.

⚠️ STYLE OBLIGATOIRE - TU DOIS ABSOLUMENT RESPECTER CE STYLE ⚠️
Style demandé : "${selectedStyle.name}" - ${selectedStyle.description}
Ton à adopter : ${selectedStyle.tone}
Directives IMPÉRATIVES : ${selectedStyle.guidelines}
Points d'attention OBLIGATOIRES : ${selectedStyle.focusPoints.join(', ')}

CE STYLE DOIT TRANSPARAÎTRE DANS CHAQUE ÉLÉMENT GÉNÉRÉ (titre, descriptions, mots-clés).

${selectedStyle.titleSuffix ? `IMPORTANT - SUFFIXE DES TITRES : Ajoute "${selectedStyle.titleSuffix}" à la fin de TOUS les titres (title et metaTitle).` : ''}

${getStyleExamples(selectedStyle)}

PRODUIT À OPTIMISER :
- Nom : ${product.name || 'Produit'}
- Catégorie : ${categoryName}
- SKU : ${product.sku || 'N/A'}
- Prix : ${product.price || 'N/A'}€
- Description actuelle : ${product.description || 'Aucune'}

GÉNÈRE UN JSON AVEC CETTE STRUCTURE EXACTE :
{
  "title": "[Titre produit optimisé SEO, max 60 caractères]",
  "shortDescription": "[Description courte persuasive, max 160 caractères]",
  "description": "[Description HTML complète avec <p>, <strong>, <ul><li>, 200-300 mots]",
  "seo": {
    "metaTitle": "[Meta title SEO, 50-60 caractères]",
    "metaDescription": "[Meta description convaincante, 150-160 caractères]",
    "keywords": ["mot-clé-1", "mot-clé-2", "...5-8 mots-clés"],
    "focusKeyphrase": "[phrase clé principale, 2-4 mots]"
  }
}

RÈGLES CRITIQUES :
1. TOUT en français impeccable, AUCUN mot anglais
2. Optimisé pour le SEO et la conversion
3. Utiliser des mots d'action : Découvrez, Profitez, Commandez
4. Mentionner : livraison, garantie, qualité
5. Format HTML pour description : <p>, <strong>, <ul><li>
6. Caractères spéciaux avec parcimonie : ✓, •, |

EXEMPLE DE SORTIE ATTENDUE :
{
  "title": "Table Basse Scandinave Chêne 120cm - Design Premium",
  "shortDescription": "Table basse design en chêne massif certifié FSC. Élégance nordique, rangements intégrés. ✓ Livraison offerte ✓ Garantie 10 ans",
  "description": "<p>Découvrez notre <strong>table basse scandinave</strong> en chêne massif, la pièce maîtresse qui transformera votre salon.</p><p>Fabriquée artisanalement avec du bois certifié FSC, cette table allie durabilité et design intemporel.</p><ul><li>✓ <strong>Bois massif premium</strong> - Chêne européen certifié</li><li>✓ Design scandinave authentique</li><li>✓ Rangements intelligents intégrés</li></ul><p>Garantie 10 ans. Livraison gratuite. <strong>Commandez maintenant</strong> et profitez de -15%.</p>",
  "seo": {
    "metaTitle": "Table Basse Scandinave Chêne 120cm - Mobilier Design",
    "metaDescription": "Table basse design en chêne massif certifié. Style scandinave, rangements intégrés. ✓ Livraison gratuite ✓ Garantie 10 ans ✓ -15% aujourd'hui",
    "keywords": ["table basse scandinave", "table chêne massif", "meuble design", "table salon bois", "mobilier scandinave", "table basse rangement"],
    "focusKeyphrase": "table basse scandinave chêne"
  }
}

IMPORTANT : Retourne UNIQUEMENT le JSON, sans texte avant/après, sans markdown.`;

  try {
    console.log('[generateAllContentSingleCall] Prompt avec style:', {
      styleName: selectedStyle.name,
      styleDescription: selectedStyle.description,
      styleTone: selectedStyle.tone,
      styleGuidelines: selectedStyle.guidelines
    });
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text();
    
    // Nettoyer et parser le JSON
    const cleanedText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const content = JSON.parse(cleanedText);
    
    // Valider que tout est en français
    const allText = `${content.title} ${content.shortDescription} ${content.description} ${content.seo.metaTitle} ${content.seo.metaDescription}`;
    
    if (!isContentInFrench(allText)) {
      console.warn('Contenu non français détecté, utilisation du fallback');
      throw new Error('Non-French content detected');
    }
    
    // Valider le SEO
    const seoValidation = validateSEOContent(content.seo);
    if (!seoValidation.isValid && seoValidation.errors.some(e => e.includes('anglais'))) {
      throw new Error('English SEO content detected');
    }
    
    return content;
    
  } catch (error) {
    console.error('Erreur génération single-call:', error);
    console.error('Type d\'erreur:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Message d\'erreur:', error instanceof Error ? error.message : 'Unknown');
    
    // Log plus détaillé pour debug
    if (error instanceof Error && error.message.includes('quota')) {
      console.error('⚠️ Quota API dépassé!');
    } else if (error instanceof Error && error.message.includes('JSON')) {
      console.error('⚠️ Erreur de parsing JSON de la réponse Gemini');
    }
    
    // Fallback français complet AVEC prise en compte du style
    console.warn('⚠️ Utilisation du fallback avec style:', selectedStyle.name);
    const productName = product.name || 'Produit';
    const shortName = productName.substring(0, 40);
    
    // Adapter le fallback selon le style
    const fallbackContent = getFallbackByStyle(selectedStyle, productName, shortName, product);
    return fallbackContent;
  }
}