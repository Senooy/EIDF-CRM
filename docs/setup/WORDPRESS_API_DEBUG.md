# Guide de débogage des API WordPress

## Problèmes courants et solutions

### 1. Le serveur proxy n'est pas lancé

**Symptômes :**
- Message d'erreur : "Cannot connect to proxy server"
- Les appels API échouent en développement

**Solution :**
```bash
# Lancer le serveur proxy séparément
npm run start:proxy

# Ou lancer tout en même temps
npm run start
```

### 2. Erreur 401 - Non autorisé

**Symptômes :**
- Message d'erreur : "401 Unauthorized"
- Impossible de récupérer les données WordPress

**Solutions :**
1. Vérifier les identifiants WordPress dans les paramètres
2. Créer un mot de passe d'application dans WordPress :
   - Aller dans WordPress Admin > Utilisateurs > Votre profil
   - Descendre jusqu'à "Mots de passe d'application"
   - Créer un nouveau mot de passe d'application
   - Copier le mot de passe généré dans les paramètres du CRM

### 3. Erreur 400 - Bad Request sur la pagination

**Symptômes :**
- Les données se chargent partiellement
- Erreur 400 dans les logs

**Solution :**
- C'est normal quand il n'y a plus de pages à charger
- Le code gère maintenant cette erreur automatiquement

### 4. API REST désactivée

**Symptômes :**
- Erreur 404 sur les endpoints /wp-json/
- Aucune donnée ne se charge

**Solutions :**
1. Vérifier que l'API REST est activée dans WordPress
2. Vérifier qu'aucun plugin de sécurité ne bloque l'API
3. Tester l'API directement : `https://votre-site.com/wp-json/wp/v2/posts`

### 5. CORS en production

**Symptômes :**
- Erreur CORS dans la console du navigateur
- Les appels API fonctionnent en dev mais pas en production

**Solutions :**
1. Configurer les headers CORS sur le serveur WordPress
2. Utiliser un plugin WordPress comme "WP CORS"
3. Configurer le .htaccess :
```apache
Header set Access-Control-Allow-Origin "*"
Header set Access-Control-Allow-Methods "GET, POST, OPTIONS"
Header set Access-Control-Allow-Headers "Content-Type, Authorization"
```

## Outils de débogage

### Console du navigateur

1. Ouvrir les outils de développement (F12)
2. Aller dans l'onglet "Network"
3. Filtrer par "XHR" ou "Fetch"
4. Regarder les requêtes qui échouent
5. Vérifier les headers et les réponses

### Logs dans le code

Le système de logging est activé en développement. Les logs apparaissent dans la console :
- `[WordPressClient]` - Logs des appels API
- `[WordPressAnalytics]` - Logs de récupération des métriques
- `[ProxyCheck]` - Logs de vérification du proxy

### Test manuel des endpoints

Tester directement les endpoints WordPress :
```bash
# Posts
curl https://votre-site.com/wp-json/wp/v2/posts

# Avec authentification
curl -u "username:application_password" https://votre-site.com/wp-json/wp/v2/users
```

## Configuration recommandée

1. **En développement :**
   - Toujours lancer le serveur proxy
   - Utiliser `npm run start` pour tout lancer

2. **En production :**
   - Configurer CORS sur le serveur WordPress
   - Désactiver le proxy dans les variables d'environnement
   - S'assurer que le site utilise HTTPS

3. **Sécurité :**
   - Utiliser des mots de passe d'application spécifiques
   - Limiter les permissions au minimum nécessaire
   - Ne jamais exposer les identifiants dans le code