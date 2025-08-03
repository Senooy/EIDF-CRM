# Guide de débogage - Connexion WordPress/WooCommerce

## Problème actuel
L'application essaie de se connecter à l'ancien serveur backend (port 3001) au lieu d'utiliser le nouveau système de connexion directe aux API WordPress.

## Solution rapide

### 1. Arrêtez l'application actuelle (Ctrl+C)

### 2. Configurez votre site WordPress pour autoriser CORS

Ajoutez ce code dans le fichier `functions.php` de votre thème WordPress :

```php
// Enable CORS for REST API
add_action('init', function() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization");
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit();
    }
});
```

### 3. Démarrez l'application

```bash
npm run dev
```

### 4. Configurez votre site

1. Allez sur http://localhost:8081/settings/sites
2. Cliquez sur "Ajouter un site"
3. Remplissez :
   - **Nom du site** : Mon WordPress
   - **URL du site** : https://votre-site.com (sans slash final)
   - **Consumer Key** : Votre clé WooCommerce (depuis WooCommerce → Réglages → Avancé → API REST)
   - **Consumer Secret** : Votre secret WooCommerce

### 5. Testez la connexion

Le bouton "Ajouter le site" testera automatiquement la connexion.

## Si vous avez toujours des erreurs CORS

### Option A : Utilisez un plugin WordPress
Installez le plugin "WP CORS" depuis le repository WordPress.

### Option B : Utilisez une extension Chrome (développement uniquement)
1. Installez l'extension "CORS Unblock" ou "Allow CORS"
2. Activez-la uniquement pour votre domaine local

### Option C : Lancez Chrome sans sécurité (développement uniquement)
```bash
# macOS
open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security

# Windows
chrome.exe --user-data-dir="C:/Chrome dev session" --disable-web-security
```

## Vérification

Pour vérifier que tout fonctionne :
1. Ouvrez la console du navigateur (F12)
2. Allez dans l'onglet Network
3. Rechargez la page
4. Vous devriez voir des requêtes vers votre site WordPress (pas vers localhost:3001)

## Structure des appels API

Le nouveau système fait des appels directs :
- WordPress : `https://votre-site.com/wp-json/wp/v2/...`
- WooCommerce : `https://votre-site.com/wp-json/wc/v3/...`

Au lieu de passer par le serveur proxy :
- Ancien : `http://localhost:3001/api/wc/...`

## En cas de problème

1. Vérifiez que WooCommerce est bien installé et activé
2. Vérifiez que l'API REST est activée dans WordPress
3. Vérifiez les clés API dans WooCommerce
4. Testez l'API directement : `https://votre-site.com/wp-json/wc/v3/system_status?consumer_key=VOTRE_CLE&consumer_secret=VOTRE_SECRET`

Si vous voyez une réponse JSON, l'API fonctionne !