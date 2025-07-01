# Guide des Styles SEO

## Vue d'ensemble

Le système de génération SEO permet maintenant de choisir différents styles/tons pour le contenu généré. Vous pouvez sélectionner un style prédéfini ou ajouter vos propres directives personnalisées.

## Styles prédéfinis

### 1. **Commercial classique** (par défaut)
- **Ton** : Professionnel et persuasif, orienté conversion
- **Focus** : Caractéristiques produit, rapport qualité-prix, garanties, livraison rapide
- **Idéal pour** : Sites e-commerce classiques, produits grand public

### 2. **Axé sur l'utilité**
- **Ton** : Informatif et pratique, centré sur les avantages client
- **Focus** : Utilité du produit, résolution de problèmes, bénéfices concrets, cas d'usage
- **Idéal pour** : Produits techniques, outils, équipements professionnels

### 3. **Narration et émotion**
- **Ton** : Narratif et émotionnel, création d'une expérience
- **Focus** : Histoire du produit, artisanat, valeurs, expérience utilisateur
- **Idéal pour** : Produits artisanaux, luxe, marques avec une histoire

### 4. **Technique et détaillé**
- **Ton** : Précis et informatif, pour un public averti
- **Focus** : Spécifications techniques, matériaux, processus de fabrication, performance
- **Idéal pour** : Produits high-tech, équipements spécialisés, B2B

### 5. **Écologique et durable**
- **Ton** : Engagé et responsable, sensibilisation environnementale
- **Focus** : Durabilité, impact environnemental, matériaux écologiques, commerce équitable
- **Idéal pour** : Produits bio, éco-responsables, marques engagées

## Comment utiliser les styles

### 1. Dans la modale de génération
1. Ouvrez la modale SEO
2. Avant de démarrer, sélectionnez un style dans le menu déroulant
3. Les directives du style s'affichent en dessous

### 2. Directives personnalisées
1. Activez le switch "Ajouter des directives personnalisées"
2. Écrivez vos instructions spécifiques
3. Ces directives complètent le style sélectionné

### 3. Exemples de directives personnalisées

**Pour l'utilité (client actuel) :**
```
Expliquez comment ce produit facilite le travail quotidien des professionnels.
Détaillez les économies de temps et d'argent réalisées.
Donnez des exemples concrets d'utilisation en milieu professionnel.
```

**Pour le storytelling :**
```
Racontez l'histoire de la création de ce produit.
Mettez en avant le savoir-faire français et l'expertise locale.
Créez une connexion émotionnelle avec l'acheteur.
```

**Pour le technique :**
```
Détaillez les normes et certifications du produit.
Expliquez les technologies utilisées et leurs avantages.
Comparez avec les solutions concurrentes du marché.
```

## Impact sur le contenu généré

### Style Commercial (défaut)
```
Titre: Table de Travail Pro 200x80cm - Livraison Gratuite
Description: Profitez de notre table professionnelle robuste. 
✓ Garantie 5 ans ✓ Prix imbattable ✓ Stock disponible
```

### Style Utilité
```
Titre: Table de Travail Ergonomique - Gagnez en Productivité
Description: Optimisez votre espace de travail avec cette table 
conçue pour réduire la fatigue. Hauteur ajustable pour prévenir 
les TMS, surface anti-rayures pour une durabilité maximale.
```

### Style Écologique
```
Titre: Table Éco-Responsable en Bois Certifié FSC
Description: Fabriquée à partir de forêts gérées durablement. 
Zéro produit chimique, finition naturelle à l'huile de lin. 
Chaque achat plante un arbre.
```

## Conseils d'utilisation

### 1. **Cohérence de marque**
- Choisissez un style qui correspond à votre image de marque
- Utilisez le même style pour tous vos produits
- Les directives personnalisées permettent d'affiner

### 2. **Selon votre audience**
- B2B → Style technique ou utilité
- B2C haut de gamme → Storytelling
- Marché écologique → Style durable
- E-commerce général → Commercial

### 3. **Test A/B**
- Essayez différents styles sur des produits similaires
- Comparez les performances SEO et conversions
- Ajustez selon les résultats

## Architecture technique

### Structure SEOStyle
```typescript
interface SEOStyle {
  name: string;          // Identifiant unique
  description: string;   // Description courte
  guidelines: string;    // Directives principales
  tone: string;         // Ton à adopter
  focusPoints: string[]; // Points d'attention
}
```

### Flux de données
1. Sélection du style dans la modale
2. Envoi du style avec chaque produit
3. Modification du prompt Gemini selon le style
4. Génération adaptée au style choisi

## Limitations

1. **Un style par batch** : Tous les produits d'un batch utilisent le même style
2. **Pas de mélange** : On ne peut pas combiner plusieurs styles prédéfinis
3. **Directives limitées** : Maximum ~500 caractères pour les directives personnalisées

## Évolutions futures possibles

1. **Styles par catégorie** : Associer automatiquement un style à chaque catégorie de produits
2. **Templates personnalisés** : Sauvegarder vos propres styles réutilisables
3. **IA adaptative** : L'IA apprend de vos préférences au fil du temps
4. **Multi-styles** : Générer plusieurs versions pour A/B testing