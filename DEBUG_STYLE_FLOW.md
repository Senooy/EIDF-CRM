# Debug du flux de transmission du style SEO

## Analyse du problème

Le style sélectionné dans `SEOGenerationModal` pourrait ne pas être correctement transmis jusqu'à la fonction `generateAllContentSingleCall` qui génère le contenu avec Gemini.

## Flux identifié

1. **SEOGenerationModal.tsx** (ligne 161-181)
   - L'utilisateur sélectionne un style
   - Le style est stocké dans `selectedStyle` 
   - Au démarrage, le style est passé à `batchProcessor.startBatch(products, finalStyle)`
   - Debug ajouté : console.log du style sélectionné

2. **SimpleBatchProcessor.ts** (ligne 86-93, 225-228)
   - Reçoit le style dans `startBatch(products, style)`
   - Stocke le style dans `this.selectedStyle`
   - Envoie le style via axios.post avec le produit
   - Debug ajouté : console.log du style reçu et envoyé

3. **server.ts** (ligne 272-279)
   - Reçoit `{ product, style }` dans le body de la requête
   - Passe le style à `generateAllContentSingleCall(genAI, product, style)`
   - Debug ajouté : console.log du style reçu

4. **gemini-single-call.ts** (ligne 52-63)
   - Reçoit le style en paramètre
   - Utilise le style par défaut si aucun n'est fourni
   - Intègre le style dans le prompt Gemini
   - Debug ajouté : console.log du style et du prompt

## Points de vérification

### 1. Logs à surveiller dans la console du navigateur :
```
[SEOGenerationModal] Style sélectionné: {...}
[SimpleBatchProcessor] Style reçu dans startBatch: {...}
[SimpleBatchProcessor] Style défini via setStyle: {...}
[SimpleBatchProcessor] Envoi API avec style: {...}
```

### 2. Logs à surveiller dans le terminal serveur :
```
[Server] Style reçu dans la requête: {...}
[generateAllContentSingleCall] Style reçu: {...}
[generateAllContentSingleCall] Style sélectionné: {...}
[generateAllContentSingleCall] Prompt avec style: {...}
```

## Test manuel

1. Démarrer le serveur :
   ```bash
   npm run server
   ```

2. Dans l'interface :
   - Aller dans la page Produits
   - Cliquer sur "Générer SEO"
   - Sélectionner un style différent (ex: "Écologique et durable")
   - Ajouter éventuellement des directives personnalisées
   - Démarrer la génération

3. Observer les logs pour vérifier que le style est transmis à chaque étape

## Test automatisé

Utiliser le script de test créé :
```bash
node test-style-flow.mjs
```

Ce script :
- Envoie directement une requête au serveur avec un style écologique
- Vérifie si le contenu généré contient des termes écologiques
- Affiche les logs de transmission du style

## Solutions potentielles si le style n'est pas transmis

1. **Si le style est perdu entre le modal et le batch processor :**
   - Vérifier que `batchProcessor.setStyle(finalStyle)` est bien appelé
   - S'assurer que le style n'est pas écrasé ailleurs

2. **Si le style est perdu entre le batch processor et le serveur :**
   - Vérifier le payload axios dans les outils de développement (Network)
   - S'assurer que le Content-Type est bien application/json

3. **Si le style est perdu entre le serveur et Gemini :**
   - Vérifier que le destructuring `{ product, style }` fonctionne
   - S'assurer que le style n'est pas undefined

4. **Si Gemini ne respecte pas le style :**
   - Renforcer les instructions dans le prompt
   - Ajouter des exemples spécifiques au style
   - Augmenter le poids des directives de style dans le prompt

## Prompt amélioré suggéré

Si le style n'est pas suffisamment pris en compte, modifier le prompt dans `gemini-single-call.ts` pour être plus directif :

```typescript
IMPORTANT - STYLE OBLIGATOIRE À RESPECTER :
Tu DOIS absolument suivre le style "${selectedStyle.name}" défini ci-dessous.
Ce style doit transparaître dans TOUS les éléments générés (titre, descriptions, mots-clés).

${selectedStyle.guidelines}

Exemples de formulations pour ce style :
- [Ajouter des exemples spécifiques selon le style]
```

## Notes supplémentaires

- Le component `SEOGenerationPanel` n'utilise pas de style (appelle juste `startBatch(products)`)
- Seul `SEOGenerationModal` permet la sélection et transmission du style
- Les styles prédéfinis sont dans `predefinedStyles` (gemini-single-call.ts)
- Le style personnalisé combine les directives custom avec le ton/focus du style de base