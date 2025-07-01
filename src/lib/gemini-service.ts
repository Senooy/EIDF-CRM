import { GoogleGenerativeAI } from '@google/generative-ai';
import { isContentInFrench, validateSEOContent } from './seo-validator';

// Initialize Gemini API (this will be called from server-side only)
export function initializeGemini(apiKey: string) {
  return new GoogleGenerativeAI(apiKey);
}

// Interface for SEO content
export interface SEOContent {
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  focusKeyphrase: string;
}

// Interface for generated content
export interface GeneratedProductContent {
  title: string;
  description: string;
  shortDescription: string;
  seo: SEOContent;
}

// Interface for batch generation result
export interface BatchGenerationResult {
  productId: number;
  success: boolean;
  content?: GeneratedProductContent;
  error?: string;
}

// Generate a compelling product title
export async function generateProductTitle(
  genAI: GoogleGenerativeAI,
  productData: {
    name?: string;
    category?: string;
    sku?: string;
    price?: string;
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `Génère un titre de produit HAUTEMENT OPTIMISÉ pour le SEO et les conversions en FRANÇAIS.

Produit actuel : ${productData.name || 'Produit inconnu'}
Catégorie : ${productData.category || 'Général'}
SKU : ${productData.sku || 'N/A'}
Prix : ${productData.price || 'N/A'}

RÈGLES D'OPTIMISATION SEO :
1. Commence par le mot-clé principal (type de produit)
2. Maximum 60 caractères impératif
3. Inclure 1-2 caractéristiques différenciantes
4. Éviter les mots vides (de, le, la, un, une)
5. Utiliser des séparateurs efficaces (- | •)
6. Capitaliser chaque mot important

STRUCTURE RECOMMANDÉE :
[Produit] [Caractéristique1] [Caractéristique2] - [Marque/Catégorie]

EXEMPLES OPTIMISÉS :
- "Baskets Running Femme Légères Respirantes - Sport Performance"
- "Table Basse Scandinave Bois Chêne 120cm - Design Moderne"
- "Smartphone 5G 128GB Écran OLED - Technologie Avancée"

IMPORTANT : Titre 100% en français, optimisé pour le référencement ET attractif pour l'achat.

Retourne UNIQUEMENT le titre optimisé.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

// Generate a detailed product description
export async function generateProductDescription(
  genAI: GoogleGenerativeAI,
  productData: {
    name?: string;
    category?: string;
    currentDescription?: string;
    price?: string;
    features?: string[];
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `Génère une description de produit PREMIUM optimisée pour le SEO et la conversion en FRANÇAIS.

Nom du produit : ${productData.name || 'Produit inconnu'}
Catégorie : ${productData.category || 'Général'}
Description actuelle : ${productData.currentDescription || 'Aucune description disponible'}
Prix : ${productData.price || 'N/A'}
Caractéristiques : ${productData.features?.join(', ') || 'Non spécifiées'}

STRATÉGIE DE CONTENU SEO :

1. STRUCTURE OPTIMALE (150-300 mots) :
   - Paragraphe 1 : Accroche + bénéfice principal + mots-clés
   - Paragraphe 2 : Caractéristiques techniques et avantages
   - Liste à puces : Points forts (3-5 éléments)
   - Paragraphe final : Garanties + appel à l'action

2. OPTIMISATION SEO :
   - Densité mots-clés : 2-3% (naturelle)
   - Mots-clés en <strong> (2-3 max)
   - Variations sémantiques du produit
   - Longue traîne intégrée naturellement

3. DÉCLENCHEURS PSYCHOLOGIQUES :
   - Urgence : "Stock limité", "Offre exclusive"
   - Confiance : "Garantie", "Certifié", "Testé"
   - Valeur : "Rapport qualité-prix", "Investissement durable"
   - Social : "Plébiscité", "Best-seller", "Choix n°1"

4. FORMAT HTML STRICT :
<p>[Accroche captivante avec mot-clé principal]</p>
<p>[Description détaillée avec bénéfices]</p>
<ul>
<li>✓ [Avantage 1 avec mot-clé]</li>
<li>✓ [Avantage 2 différenciant]</li>
<li>✓ [Avantage 3 unique]</li>
</ul>
<p>[Garanties + appel à l'action persuasif]</p>

EXEMPLE HAUTE CONVERSION :
<p>Découvrez notre <strong>table basse scandinave</strong> en bois de chêne massif, l'alliance parfaite entre design nordique et fonctionnalité moderne. Cette pièce maîtresse transformera votre salon en espace de vie chaleureux et contemporain.</p>
<p>Fabriquée artisanalement avec du bois certifié FSC, cette table associe durabilité écologique et esthétique intemporelle. Ses dimensions généreuses (120x60cm) et ses rangements intégrés optimisent votre espace tout en conservant une élégance épurée.</p>
<ul>
<li>✓ <strong>Bois massif premium</strong> - Chêne européen certifié, finition naturelle</li>
<li>✓ Design scandinave authentique - Lignes pures et minimalistes</li>
<li>✓ Rangements intelligents - Étagère intégrée pour magazines et télécommandes</li>
<li>✓ Montage simple - Livrée avec notice détaillée, assemblage en 30 minutes</li>
</ul>
<p>Garantie 10 ans sur la structure. Livraison gratuite et retour sous 30 jours. Rejoignez les milliers de clients satisfaits qui ont fait le choix de la qualité durable. <strong>Commandez aujourd'hui</strong> et profitez de -15% avec le code SCANDI2024.</p>

IMPÉRATIF : Retourne UNIQUEMENT le HTML, sans balises markdown ni commentaires.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  let text = response.text().trim();
  
  // Nettoyer le texte des balises markdown et autres artefacts
  text = text.replace(/```html?/gi, '');
  text = text.replace(/```/g, '');
  text = text.replace(/^\s*html\s*$/gmi, '');
  
  // S'assurer que le texte ne contient que du HTML valide
  if (!text.includes('<p>') && !text.includes('<ul>')) {
    // Si le texte n'a pas de balises HTML, l'envelopper dans un paragraphe
    text = `<p>${text}</p>`;
  }
  
  return text.trim();
}

// Generate a short product description
export async function generateShortDescription(
  genAI: GoogleGenerativeAI,
  productData: {
    name?: string;
    category?: string;
    mainFeatures?: string[];
  }
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `Génère une description courte ULTRA-OPTIMISÉE pour le SEO et la conversion en FRANÇAIS.

Produit : ${productData.name || 'Produit inconnu'}
Catégorie : ${productData.category || 'Général'}
Caractéristiques : ${productData.mainFeatures?.join(', ') || 'Non spécifiées'}

OBJECTIFS SEO & CONVERSION :
1. Maximum 160 caractères (idéal pour meta description aussi)
2. Commence par le bénéfice principal ou mot-clé
3. Inclure 2-3 mots-clés naturellement
4. Créer l'urgence ou le désir d'achat
5. Mentionner un avantage unique (qualité, prix, livraison)

STRUCTURE GAGNANTE :
[Bénéfice/Produit] + [Caractéristique clé] + [Avantage unique] + [Appel à l'action subtil]

EXEMPLES PERFORMANTS :
- "Chaussures de course ultra-légères pour performances maximales. Technologie d'amorti avancée, confort exceptionnel. Livraison express offerte."
- "Table design en bois massif, parfaite pour votre salon moderne. Fabrication artisanale française, garantie 10 ans. Stock limité."

MOTS PUISSANTS : Découvrez, Profitez, Exclusif, Premium, Garantie, Offert, Limité, Nouveau

IMPORTANT : 100% en français, sans HTML, optimisé pour convertir ET référencer.

Retourne UNIQUEMENT la description courte.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}

// Generate SEO content
export async function generateSEOContent(
  genAI: GoogleGenerativeAI,
  productData: {
    name?: string;
    category?: string;
    description?: string;
  }
): Promise<SEOContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  
  const prompt = `Génère des métadonnées SEO HAUTEMENT OPTIMISÉES en FRANÇAIS pour un produit e-commerce.

Produit : ${productData.name || 'Produit inconnu'}
Catégorie : ${productData.category || 'Général'}
Description : ${productData.description || 'Aucune description'}

INSTRUCTIONS CRITIQUES POUR L'OPTIMISATION SEO :

1. metaTitle (50-60 caractères) :
   - Commence par le mot-clé principal
   - Inclut la marque ou catégorie si pertinent
   - Utilise des mots d'action (Acheter, Découvrir, Profiter)
   - Évite les articles inutiles (le, la, les, un, une)
   - Exemple : "Chaussures Running Homme - Performance & Confort | SportShop"

2. metaDescription (150-160 caractères) :
   - Commence par un verbe d'action ou le produit
   - Inclut 2-3 mots-clés naturellement
   - Ajoute un appel à l'action (Livraison gratuite, Promo, Garantie)
   - Mentionne les bénéfices uniques
   - Exemple : "Découvrez nos chaussures de running pour homme. Confort optimal, durabilité exceptionnelle. ✓ Livraison 24h ✓ Retour gratuit ✓ -20% aujourd'hui"

3. keywords (5-8 mots-clés) :
   - Mot-clé principal en premier
   - Variations et synonymes
   - Mots-clés longue traîne
   - Termes de recherche populaires
   - Spécifiques à la catégorie/usage

4. focusKeyphrase (2-5 mots) :
   - Expression naturelle que les gens recherchent
   - Spécifique mais pas trop niche
   - Inclut le type de produit

RÈGLES ABSOLUES :
- TOUT en français impeccable
- Éviter le keyword stuffing
- Être naturel et convaincant
- Optimiser pour l'intention de recherche
- Utiliser des caractères spéciaux avec parcimonie (✓, •, |)

EXEMPLE DE RÉPONSE ATTENDUE (structure EXACTE à suivre) :
{
  "metaTitle": "Collier Fixation 630mm Haute Résistance - Installation Pro",
  "metaDescription": "Collier de fixation isolé 630mm pour installations professionnelles. ✓ Fixation ultra-sécurisée ✓ Résistance maximale ✓ Livraison 24h ✓ Garantie 5 ans",
  "keywords": ["collier fixation", "collier isolé 630mm", "fixation sécurisée", "collier professionnel", "fixation industrielle", "collier haute résistance"],
  "focusKeyphrase": "collier fixation 630mm"
}

IMPORTANT : Retourne UNIQUEMENT le JSON, sans aucun texte avant ou après, sans markdown, sans commentaires.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  
  try {
    const jsonText = response.text();
    // Nettoyer le texte si nécessaire (enlever les backticks markdown)
    const cleanedText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const seoData = JSON.parse(cleanedText);
    
    // Valider le contenu SEO
    const validation = validateSEOContent(seoData);
    
    if (!validation.isValid) {
      console.warn('Contenu SEO invalide:', validation.errors);
      
      // Si c'est juste un problème de langue, on peut utiliser le fallback
      if (validation.errors.some(e => e.includes('anglais'))) {
        throw new Error('English content detected');
      }
    }
    
    // Double vérification spécifique pour le contenu anglais
    if (!isContentInFrench(seoData.metaDescription) || !isContentInFrench(seoData.metaTitle)) {
      console.warn('Contenu non français détecté, utilisation du fallback');
      throw new Error('Non-French content detected');
    }
    
    return seoData;
  } catch (error) {
    console.error('Erreur parsing JSON SEO:', error);
    // Fallback en FRANÇAIS si le parsing JSON échoue
    const productName = productData.name || 'Produit';
    const categoryName = productData.category || 'Boutique';
    
    return {
      metaTitle: `${productName} - Qualité Premium | ${categoryName}`,
      metaDescription: `Découvrez notre ${productName.toLowerCase()} de haute qualité. ✓ Livraison rapide ✓ Garantie satisfait ou remboursé ✓ Prix compétitif. Commandez maintenant!`,
      keywords: [
        productName.toLowerCase(),
        categoryName.toLowerCase(),
        'acheter ' + productName.toLowerCase(),
        productName.toLowerCase() + ' pas cher',
        productName.toLowerCase() + ' qualité'
      ].filter(Boolean) as string[],
      focusKeyphrase: productName.toLowerCase()
    };
  }
}

// Generate all content for a product
export async function generateAllProductContent(
  genAI: GoogleGenerativeAI,
  product: any
): Promise<GeneratedProductContent> {
  try {
    // Extract category name if available - ALWAYS IN FRENCH
    const categoryName = product.categories?.[0]?.name || 'Boutique';
    
    // Generate all content in parallel for better performance
    const [title, description, shortDescription, seo] = await Promise.all([
      generateProductTitle(genAI, {
        name: product.name,
        category: categoryName,
        sku: product.sku,
        price: product.price
      }),
      generateProductDescription(genAI, {
        name: product.name,
        category: categoryName,
        currentDescription: product.description,
        price: product.price
      }),
      generateShortDescription(genAI, {
        name: product.name,
        category: categoryName
      }),
      generateSEOContent(genAI, {
        name: product.name,
        category: categoryName,
        description: product.description
      })
    ]);

    return {
      title,
      description,
      shortDescription,
      seo
    };
  } catch (error) {
    console.error('Error generating product content:', error);
    throw error;
  }
}

// Batch generate content for multiple products
export async function batchGenerateContent(
  genAI: GoogleGenerativeAI,
  products: any[],
  onProgress?: (completed: number, total: number) => void
): Promise<BatchGenerationResult[]> {
  const results: BatchGenerationResult[] = [];
  
  // Process in smaller batches to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (product) => {
        try {
          const content = await generateAllProductContent(genAI, product);
          return {
            productId: product.id,
            success: true,
            content
          };
        } catch (error) {
          return {
            productId: product.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      })
    );
    
    results.push(...batchResults);
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + batchSize, products.length), products.length);
    }
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < products.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}