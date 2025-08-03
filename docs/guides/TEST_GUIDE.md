# 🧪 Guide de Test - EIDF-CRM SaaS

## 1. Démarrage de l'application

### Étape 1 : Lancer le serveur SaaS
```bash
# Dans un terminal
npm run start:saas
```

Vérifiez que vous voyez :
- ✅ SaaS Server is running on http://localhost:3001
- ✅ Multi-tenant WooCommerce API ready
- ✅ Organization management API ready

### Étape 2 : Accéder à l'application
Ouvrez votre navigateur : http://localhost:5173

## 2. Test de l'authentification et des organisations

### Test 2.1 : Connexion avec le compte de démo
1. Sur la page de connexion, utilisez :
   - Email : `demo@example.com`
   - Token : `demo-token` (pour le dev)

2. Vous devriez voir :
   - ✅ Redirection vers le dashboard
   - ✅ Sélecteur d'organisation dans la navbar

### Test 2.2 : Changement d'organisation
1. Cliquez sur le sélecteur d'organisation
2. Vous devriez voir 2 organisations :
   - Demo Store Free (Plan gratuit)
   - Demo Store Pro (Plan professionnel)
3. Changez d'organisation et vérifiez que le contexte change

### Test 2.3 : Création d'une nouvelle organisation
1. Dans le sélecteur, cliquez sur "Create Organization"
2. Entrez un nom : "Ma Nouvelle Boutique"
3. Vérifiez que l'organisation est créée et sélectionnée

## 3. Test du flow d'onboarding

### Test 3.1 : Configuration WooCommerce
1. Si vous voyez l'écran d'onboarding, testez avec :
   - Store URL : `https://demo-store.com`
   - Consumer Key : `ck_demo_key`
   - Consumer Secret : `cs_demo_secret`

2. La connexion échouera (normal, ce sont des credentials de test)

## 4. Test du billing et des limites

### Test 4.1 : Page de facturation
1. Naviguez vers `/billing`
2. Vérifiez :
   - ✅ Les 4 plans sont affichés (Free, Starter, Pro, Enterprise)
   - ✅ Le plan actuel est indiqué
   - ✅ L'utilisation actuelle est visible

### Test 4.2 : Limites d'utilisation
1. Sur Demo Store Free, vous devriez voir :
   - Limite utilisateurs : 1
   - Limite générations IA : 50/mois
   
2. Sur Demo Store Pro :
   - Limite utilisateurs : 10
   - Limite générations IA : 2000/mois

### Test 4.3 : Test des limites IA
1. Allez sur la page produits
2. Essayez de générer du contenu IA
3. Vérifiez que le compteur s'incrémente
4. Si vous atteignez la limite, vérifiez le blocage

## 5. Test des analytics

### Test 5.1 : Dashboard analytics
1. Naviguez vers `/analytics`
2. Vérifiez la présence de :
   - ✅ Cartes de métriques (CA, commandes, produits, IA)
   - ✅ Graphiques de tendances
   - ✅ Health Score de l'organisation
   - ✅ Flux d'activité récente

### Test 5.2 : Changement de période
1. Changez la période (7, 30, 90 jours)
2. Vérifiez que les données se mettent à jour

### Test 5.3 : Export de rapport
1. Cliquez sur "Exporter"
2. Un fichier JSON devrait se télécharger

## 6. Test de l'API multi-tenant

### Test 6.1 : API Organizations
```bash
# Lister mes organisations
curl -H "Authorization: Bearer demo-token" \
  http://localhost:3001/api/my-organizations

# Créer une organisation
curl -X POST -H "Authorization: Bearer demo-token" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test API Org"}' \
  http://localhost:3001/api/organizations
```

### Test 6.2 : API Credentials
```bash
# Lister les credentials (avec org ID)
curl -H "Authorization: Bearer demo-token" \
  -H "X-Organization-Id: [ORG_ID]" \
  http://localhost:3001/api/credentials

# Tester la connexion WooCommerce
curl -X POST -H "Authorization: Bearer demo-token" \
  -H "X-Organization-Id: [ORG_ID]" \
  http://localhost:3001/api/credentials/test/woocommerce
```

### Test 6.3 : API Analytics
```bash
# Obtenir le résumé
curl -H "Authorization: Bearer demo-token" \
  -H "X-Organization-Id: [ORG_ID]" \
  http://localhost:3001/api/analytics/summary

# Obtenir le health score
curl -H "Authorization: Bearer demo-token" \
  -H "X-Organization-Id: [ORG_ID]" \
  http://localhost:3001/api/analytics/health
```

## 7. Test du tracking d'activité

### Test 7.1 : Vérifier l'enregistrement des activités
1. Effectuez des actions (navigation, clics)
2. Allez sur `/analytics`
3. Vérifiez que les activités apparaissent dans le flux

### Test 7.2 : Activity tracking via API
```bash
# Enregistrer une activité custom
curl -X POST -H "Authorization: Bearer demo-token" \
  -H "X-Organization-Id: [ORG_ID]" \
  -H "Content-Type: application/json" \
  -d '{"action": "test.action", "entityType": "test"}' \
  http://localhost:3001/api/analytics/activity
```

## 8. Test du dashboard admin

### Test 8.1 : Accès admin
1. Naviguez vers `/admin` (si implémenté)
2. Vous devriez voir :
   - ✅ Statistiques globales
   - ✅ Liste de toutes les organisations
   - ✅ Répartition par plan
   - ✅ MRR total

### Test 8.2 : Filtres et recherche
1. Testez la recherche d'organisations
2. Filtrez par plan (Free, Starter, etc.)
3. Filtrez par statut (Active, Cancelled)

## 9. Vérification de la base de données

### Test 9.1 : Prisma Studio
```bash
# Ouvrir l'interface Prisma
npm run prisma:studio
```

Vérifiez dans les tables :
- `Organization` : Les organisations créées
- `User` : Les utilisateurs
- `Subscription` : Les abonnements
- `ActivityLog` : Les logs d'activité
- `ApiCredential` : Les credentials (chiffrés)

## 10. Tests de performance

### Test 10.1 : Isolation des données
1. Créez 2 organisations différentes
2. Configurez des credentials différents pour chaque
3. Vérifiez que les données ne se mélangent pas

### Test 10.2 : Limites et quotas
1. Testez l'approche des limites (80%)
2. Testez le dépassement des limites
3. Vérifiez les messages d'erreur appropriés

## 🐛 Problèmes courants

### "Failed to connect to WooCommerce"
- Normal avec les credentials de démo
- Utilisez de vrais credentials WooCommerce pour tester

### "Organization not found"
- Vérifiez que vous êtes connecté
- Vérifiez qu'une organisation est sélectionnée

### "Limite atteinte"
- C'est le comportement attendu
- Changez de plan ou attendez le mois suivant

## ✅ Checklist de validation

- [ ] Authentification fonctionne
- [ ] Changement d'organisation fonctionne
- [ ] Création d'organisation fonctionne
- [ ] Limites d'utilisation fonctionnent
- [ ] Analytics s'affichent correctement
- [ ] Export de rapport fonctionne
- [ ] API multi-tenant isole les données
- [ ] Activity tracking enregistre les actions
- [ ] Dashboard admin affiche les stats
- [ ] Base de données contient les bonnes données

## 🚀 Tests avancés

Pour des tests plus poussés :
1. Créez plusieurs utilisateurs
2. Testez les invitations (à implémenter)
3. Simulez des webhooks Stripe
4. Testez avec de vrais credentials WooCommerce
5. Testez la montée en charge avec plusieurs orgs

Bon test ! 🎉