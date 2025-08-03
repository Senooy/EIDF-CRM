# Guide de la nouvelle modale de génération SEO

## Changements principaux

Le système a été complètement refactorisé pour éviter les erreurs de quota API (429 Too Many Requests) :

### 1. **Traitement séquentiel**
- **Avant** : 10 produits traités en parallèle (10 requêtes simultanées)
- **Maintenant** : 1 produit à la fois (respecte vraiment la limite API)

### 2. **Interface modale**
- **Avant** : Panel intégré dans la page
- **Maintenant** : Modale dédiée avec validation manuelle

### 3. **Validation par batch**
- Chaque batch de 10 produits max
- Affichage des résultats détaillés
- Bouton pour valider et continuer

## Comment utiliser la nouvelle modale

### 1. Ouvrir la modale
1. Allez dans "Produits"
2. Cliquez sur "Générer SEO"
3. La modale s'ouvre avec le chargement des produits

### 2. Démarrer la génération
1. Choisissez le mode :
   - **Mode manuel** (par défaut) : Validation après chaque batch
   - **Mode automatique** : Continue automatiquement après 1 minute
2. Cliquez sur "Démarrer la génération"

### 3. Pendant le traitement
La modale affiche :
- Le produit en cours de traitement
- La progression globale (ex: 23/1000 produits)
- Le numéro du batch actuel (ex: Batch 3/100)

### 4. Résultats du batch
Après chaque batch, vous voyez :
- ✅ Produits réussis avec :
  - Titre généré
  - Description courte
  - Cliquez sur l'œil pour voir plus de détails
- ❌ Produits échoués avec le message d'erreur

### 5. Validation manuelle
En mode manuel :
1. Vérifiez les résultats
2. Cliquez sur "Valider et continuer"
3. Attente de 1 minute (compteur visible)
4. Le batch suivant démarre

### 6. Mode automatique
Si activé :
- Pas de validation requise
- Continue automatiquement après 1 minute
- Idéal pour laisser tourner sans supervision

## Architecture technique

### SimpleBatchProcessor amélioré
```typescript
// Traitement séquentiel
for (let i = 0; i < batch.length; i++) {
  await this.processProduct(product, globalIndex);
}
```

### Événements émis
- `batch-started` : Début d'un nouveau batch
- `product-processing` : Produit en cours
- `product-completed` : Produit terminé avec contenu
- `batch-results` : Résultats complets du batch
- `waiting-validation` : En attente de validation
- `waiting-next-batch` : Timer avant prochain batch

### Structure GeneratedContent
```typescript
interface GeneratedContent {
  productId: number;
  productName: string;
  title: string;
  shortDescription: string;
  description: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    focusKeyphrase: string;
    keywords: string[];
  };
  success: boolean;
  error?: string;
}
```

## Avantages du nouveau système

### 1. **Respect strict des limites API**
- 1 seule requête à la fois
- Pause obligatoire entre les batchs
- Plus d'erreurs 429

### 2. **Visibilité totale**
- Voir exactement ce qui est généré
- Validation avant de continuer
- Contrôle sur le processus

### 3. **Flexibilité**
- Mode manuel pour vérifier
- Mode auto pour la nuit
- Pause/reprise à tout moment

### 4. **Persistance localStorage**
- Les produits traités sont sauvegardés
- Reprise possible après interruption
- Pas de double traitement

## FAQ

**Q: Pourquoi 1 produit à la fois ?**
R: Pour éviter les erreurs 429. L'API Gemini free tier est très limitée.

**Q: Puis-je fermer la modale ?**
R: Oui, mais le traitement s'arrêtera. Les produits déjà traités sont sauvegardés.

**Q: Le timer est-il obligatoire ?**
R: Oui, c'est une limite de l'API Google. 10 produits max par minute.

**Q: Puis-je modifier les résultats ?**
R: Non, mais vous pouvez les vérifier avant validation. Pour modifier, utilisez l'interface WooCommerce.

## Limites connues

1. **Vitesse** : Maximum 10 produits/minute (limite API)
2. **Modal bloquante** : Doit rester ouverte pendant le traitement
3. **Pas d'édition** : Les résultats ne sont pas modifiables dans la modale

## Conseils d'utilisation

1. **Pour tester** : Commencez avec peu de produits
2. **Pour la nuit** : Activez le mode automatique
3. **Pour vérifier** : Utilisez le mode manuel
4. **En cas d'erreur** : Les produits échoués sont marqués, vous pouvez les retraiter plus tard