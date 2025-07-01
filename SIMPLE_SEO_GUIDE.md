# Guide SEO Simplifié - 10 produits/minute

## Vue d'ensemble

Le système de génération SEO est maintenant intégré directement dans la page Produits. Un simple bouton permet de lancer la génération automatique pour tous vos produits.

## Comment utiliser

### 1. Accéder aux produits
- Connectez-vous au CRM
- Cliquez sur "Produits" dans le menu

### 2. Lancer la génération SEO
- Cliquez sur le bouton "Générer SEO pour tous" en haut à droite
- La génération démarre automatiquement

### 3. Suivre la progression
- Une barre de progression apparaît sous l'en-tête
- Affiche : nombre de produits traités, temps restant
- Message jaune quand en pause API (normal)

### 4. Contrôles disponibles
- **Pause** : Met en pause temporairement
- **Reprendre** : Continue après une pause
- **Annuler** : Arrête complètement

## Fonctionnement

- **10 produits par minute** : Respecte les limites API
- **1 appel = 1 produit complet** : Titre + Descriptions + SEO
- **Automatique** : Pas besoin de supervision
- **Pause API** : 1 minute entre chaque lot de 10 produits

## Temps de traitement

Pour 1000 produits :
- Temps actif : ~100 minutes (1h40)
- Temps total : ~2 heures avec les pauses
- Peut tourner en arrière-plan

## Contenu généré par produit

1. **Titre optimisé** (60 caractères max)
2. **Description courte** (160 caractères max)
3. **Description complète** (HTML, 200-300 mots)
4. **Métadonnées Yoast SEO** :
   - Meta title
   - Meta description
   - Focus keyphrase
   - Keywords

## Avantages

✅ **Simple** : Un seul bouton
✅ **Intégré** : Directement dans la page Produits
✅ **Automatique** : Lance et oublie
✅ **Gratuit** : Utilise le Free Tier Gemini
✅ **Français** : 100% du contenu en français
✅ **SEO optimisé** : Compatible Yoast SEO

## FAQ

**Q: Puis-je fermer la page ?**
R: Non, gardez la page ouverte pendant le traitement.

**Q: Que faire si ça s'arrête ?**
R: Cliquez sur "Reprendre" ou relancez.

**Q: C'est trop lent ?**
R: C'est normal et gratuit. Pour aller plus vite, passez au tier payant.

**Q: Les produits sont-ils sauvegardés automatiquement ?**
R: Oui, chaque produit est mis à jour dans WooCommerce dès qu'il est traité.

## Support

- Test : `node test-simple-batch.mjs`
- Logs : Ouvrez la console du navigateur (F12)
- Serveur : Vérifiez les logs du terminal