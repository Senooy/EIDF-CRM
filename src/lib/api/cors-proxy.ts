// Proxy pour gérer les problèmes CORS avec les API WordPress
// Cette solution utilise un proxy public pour le développement
// En production, utilisez votre propre proxy ou configurez CORS sur WordPress

const CORS_PROXY_URL = 'https://cors-anywhere.herokuapp.com/';

export function proxifyUrl(url: string): string {
  // En développement uniquement, utiliser un proxy CORS
  if (import.meta.env.DEV) {
    // Vérifier si l'URL est déjà proxifiée
    if (url.startsWith(CORS_PROXY_URL)) {
      return url;
    }
    
    // Pour localhost, ne pas utiliser de proxy
    if (url.includes('localhost') || url.includes('127.0.0.1')) {
      return url;
    }
    
    // Ajouter le proxy pour les autres URLs
    return CORS_PROXY_URL + url;
  }
  
  return url;
}

// Instructions pour configurer CORS sur WordPress
export const WORDPRESS_CORS_INSTRUCTIONS = `
Pour éviter les problèmes CORS, ajoutez ce code dans votre fichier functions.php WordPress :

/**
 * Enable CORS for REST API
 */
function enable_cors() {
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Authorization, X-WP-Nonce");
    header("Access-Control-Allow-Credentials: true");
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        status_header(200);
        exit();
    }
}
add_action('init', 'enable_cors');

// Ou utilisez un plugin comme "WP CORS" pour une configuration plus simple.
`;