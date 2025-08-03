# Configuration CORS pour WordPress/WooCommerce

## Problème
L'application essaie de se connecter directement aux API WordPress/WooCommerce depuis le navigateur, ce qui peut causer des erreurs CORS (Cross-Origin Resource Sharing).

## Solutions

### Solution 1 : Configuration WordPress (Recommandée)

Ajoutez ce code dans votre fichier `functions.php` de votre thème WordPress :

```php
/**
 * Enable CORS for REST API
 */
function enable_cors_for_rest_api() {
    // Autorise les requêtes depuis votre domaine frontend
    $allowed_origins = array(
        'http://localhost:8080',
        'http://localhost:8081',
        'http://localhost:3000',
        'https://votre-domaine-frontend.com'
    );
    
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
    
    if (in_array($origin, $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $origin);
    } else {
        // Ou utilisez * pour autoriser tous les domaines (moins sécurisé)
        header("Access-Control-Allow-Origin: *");
    }
    
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce");
    header("Access-Control-Allow-Credentials: true");
    
    // Gérer les requêtes OPTIONS (preflight)
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit();
    }
}
add_action('init', 'enable_cors_for_rest_api');
add_action('rest_api_init', 'enable_cors_for_rest_api');
```

### Solution 2 : Plugin WordPress

Installez un plugin CORS comme :
- **WP CORS** : https://wordpress.org/plugins/wp-cors/
- **REST API CORS** : Simple et efficace

### Solution 3 : Configuration serveur (Apache)

Si vous avez accès à la configuration Apache, ajoutez dans `.htaccess` :

```apache
<IfModule mod_headers.c>
    Header set Access-Control-Allow-Origin "*"
    Header set Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Header set Access-Control-Allow-Headers "Content-Type, Authorization"
</IfModule>
```

### Solution 4 : Configuration serveur (Nginx)

Pour Nginx, ajoutez dans votre configuration :

```nginx
location /wp-json/ {
    add_header 'Access-Control-Allow-Origin' '*';
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization';
    
    if ($request_method = 'OPTIONS') {
        return 204;
    }
}
```

### Solution 5 : Proxy de développement

Pour le développement local uniquement, vous pouvez utiliser un proxy. L'application inclut déjà une tentative de proxy, mais vous pouvez aussi :

1. Utiliser l'extension Chrome "CORS Unblock"
2. Lancer Chrome avec les sécurités désactivées (développement uniquement) :
   ```bash
   # macOS
   open -n -a /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --args --user-data-dir="/tmp/chrome_dev_test" --disable-web-security
   
   # Windows
   chrome.exe --user-data-dir="C:/Chrome dev session" --disable-web-security
   ```

## Test de connexion

Une fois CORS configuré :

1. Allez dans Paramètres → Sites
2. Ajoutez votre site WordPress
3. Configurez les clés API WooCommerce :
   - Dans WordPress : WooCommerce → Réglages → Avancé → API REST
   - Créez une nouvelle clé API
   - Copiez la Consumer Key et Consumer Secret
4. Testez la connexion

## Vérification

Pour vérifier que CORS fonctionne, ouvrez la console du navigateur et vérifiez les headers de réponse. Vous devriez voir :
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
```