# Guide du Traitement Batch IA

## Vue d'ensemble

Le système de traitement batch permet de générer automatiquement du contenu optimisé SEO pour vos 1000+ produits tout en respectant les limites gratuites de l'API Gemini.

## Caractéristiques principales

### 1. **Optimisation API**
- **1 seul appel API par produit** (au lieu de 4)
- Génère tout le contenu en une fois : titre, descriptions, SEO
- Réduit drastiquement le nombre d'appels nécessaires

### 2. **Respect des limites Free Tier**
- **12 requêtes/minute** (limite : 15)
- **180 requêtes/jour** (limite : 200)
- **1M tokens/minute** (largement suffisant)

### 3. **File d'attente intelligente**
- Persistance dans localStorage
- Reprend automatiquement après interruption
- Gestion des échecs avec retry automatique
- Pause/reprise manuelle possible

### 4. **Interface intuitive**
- Dashboard temps réel
- Statistiques détaillées
- Sélection facile des produits
- Notifications de progression

## Comment utiliser

### 1. Accéder au système
1. Connectez-vous au CRM
2. Cliquez sur "IA Batch" dans la sidebar
3. L'interface de traitement batch s'affiche

### 2. Ajouter des produits
**Option A : Sélection manuelle**
- Cochez les produits souhaités
- Cliquez "Ajouter X sélectionnés"

**Option B : Tous les produits**
- Cliquez "Ajouter tous (1000)"
- Tous vos produits sont ajoutés à la file

### 3. Lancer le traitement
- Cliquez sur "Démarrer"
- Le système commence automatiquement
- Respecte les limites API
- Continue jusqu'à completion

### 4. Surveiller la progression
- **Barre de progression** : % global complété
- **Statistiques temps réel** : En attente, Terminés, Échecs
- **Temps estimé** : Calcul automatique du temps restant
- **Limites API** : Visualisation de l'utilisation

## Temps de traitement

Pour 1000 produits avec les limites Free Tier :
- **180 produits/jour maximum**
- **~6 jours au total**
- **~15 minutes de traitement actif/jour**
- **Automatique** : pas besoin de supervision

## Fonctionnalités avancées

### Gestion des échecs
- Les produits en échec sont automatiquement réessayés (3 tentatives)
- Bouton "Réessayer échecs" pour relancer manuellement
- Détails de l'erreur visibles dans la file

### Pause et reprise
- Bouton "Pause" pour arrêter temporairement
- Le traitement reprend exactement où il s'était arrêté
- Idéal pour libérer des ressources

### Nettoyage
- "Nettoyer terminés" : Supprime les produits traités de la file
- Libère de l'espace dans l'interface
- N'affecte pas les produits en WooCommerce

## Contenu généré

Chaque produit reçoit :
1. **Titre optimisé** (max 60 caractères)
2. **Description courte** (max 160 caractères)
3. **Description complète** (HTML, 200-300 mots)
4. **Métadonnées Yoast SEO** :
   - Meta title
   - Meta description
   - Focus keyphrase
   - Keywords (5-8)

## Qualité garantie

### 100% Français
- Validation automatique du contenu
- Rejet du contenu anglais
- Fallback français si besoin

### Optimisé SEO
- Structure adaptée au référencement
- Mots-clés pertinents
- Appels à l'action intégrés
- Compatible Yoast SEO

### Orienté conversion
- Mots d'action : Découvrez, Profitez, Commandez
- Avantages mis en avant
- Garanties et livraison mentionnées
- Urgence créée subtilement

## Sauvegarde automatique

- Les produits sont **automatiquement mis à jour** dans WooCommerce
- Les métadonnées SEO sont sauvegardées pour Yoast
- Aucune intervention manuelle nécessaire
- Vérifiable dans WordPress admin

## Dépannage

### "Limite atteinte"
- Normal : attend automatiquement
- Reprend dès que possible
- Patience recommandée

### Produits en échec
- Vérifiez la connexion internet
- Utilisez "Réessayer échecs"
- Consultez les logs serveur si persistant

### Page blanche/erreur
- Rafraîchissez la page
- La file est persistante
- Reprenez où vous étiez

## Conseils d'utilisation

1. **Lancez le soir** : Le traitement continue la nuit
2. **Par lots** : Traitez les produits prioritaires d'abord
3. **Vérifiez régulièrement** : 1-2 fois par jour suffisent
4. **Patience** : 6 jours pour 1000 produits, c'est gratuit !

## Migration vers le tier payant

Si vous souhaitez aller plus vite :
- **Tier payant** : 2000 requêtes/minute
- **Temps pour 1000 produits** : ~30 minutes
- **Coût** : Voir tarification Gemini
- **Configuration** : Changez juste la clé API

## Support

- Logs serveur : `npm run start` montre les détails
- Test unitaire : `node test-batch-system.mjs`
- Vérification SEO : `node test-french-seo.mjs`

Le système est conçu pour être autonome et fiable. Lancez-le et laissez-le travailler !