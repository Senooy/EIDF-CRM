#!/bin/bash

# EIDF CRM - Générateur de secrets sécurisés
# Génère les clés et mots de passe nécessaires pour la production

set -euo pipefail

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Fonction pour générer un mot de passe aléatoire
generate_password() {
    local length=${1:-32}
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-${length}
}

# Fonction pour générer une clé hexadécimale
generate_hex_key() {
    local length=${1:-32}
    openssl rand -hex ${length}
}

# Fonction principale
main() {
    log_info "🔐 Génération des secrets pour EIDF CRM"
    echo ""
    
    log_info "📋 Copiez ces valeurs dans votre fichier .env.production:"
    echo ""
    
    # Mot de passe PostgreSQL
    POSTGRES_PASSWORD=$(generate_password 24)
    echo "POSTGRES_PASSWORD=${POSTGRES_PASSWORD}"
    
    # Mot de passe Redis
    REDIS_PASSWORD=$(generate_password 24)
    echo "REDIS_PASSWORD=${REDIS_PASSWORD}"
    
    # Clé de chiffrement
    ENCRYPTION_KEY=$(generate_hex_key 32)
    echo "ENCRYPTION_KEY=${ENCRYPTION_KEY}"
    
    echo ""
    log_success "✅ Secrets générés avec succès!"
    echo ""
    
    log_warning "⚠️ IMPORTANT:"
    echo "1. Sauvegardez ces valeurs de manière sécurisée"
    echo "2. Ne les partagez jamais publiquement"
    echo "3. Utilisez un gestionnaire de mots de passe"
    echo "4. Changez ces valeurs si elles sont compromises"
    echo ""
    
    log_info "📝 Pour Firebase Service Account:"
    echo "1. Allez sur https://console.firebase.google.com/"
    echo "2. Sélectionnez votre projet"
    echo "3. Project Settings > Service Accounts"
    echo "4. Generate new private key"
    echo "5. Encodez le fichier JSON en base64:"
    echo "   base64 -w 0 service-account.json"
    echo "6. Copiez le résultat dans FIREBASE_SERVICE_ACCOUNT"
    echo ""
    
    log_info "🔒 Pour SSL/TLS:"
    echo "Après le déploiement, obtenez un certificat avec:"
    echo "sudo certbot --nginx -d votre-domaine.com"
}

# Vérification des dépendances
if ! command -v openssl &> /dev/null; then
    echo "Erreur: OpenSSL n'est pas installé"
    exit 1
fi

# Exécution
main