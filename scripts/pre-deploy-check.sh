#!/bin/bash

# EIDF CRM - Vérifications avant déploiement
# Valide la configuration et l'environnement avant le déploiement

set -euo pipefail

# Configuration
ENV_FILE=".env.production"
COMPOSE_FILE="docker-compose.prod.yml"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Variables globales
ERRORS=0
WARNINGS=0

# Fonction pour incrémenter les erreurs
error() {
    log_error "$1"
    ((ERRORS++))
}

# Fonction pour incrémenter les warnings
warning() {
    log_warning "$1"
    ((WARNINGS++))
}

# Vérification des fichiers requis
check_required_files() {
    log_info "Vérification des fichiers requis..."
    
    local required_files=(
        "$ENV_FILE"
        "$COMPOSE_FILE"
        "Dockerfile.frontend"
        "Dockerfile.backend" 
        "nginx.conf"
        "package.json"
        "prisma/schema.prisma"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            error "Fichier manquant: $file"
        fi
    done
    
    if [[ $ERRORS -eq 0 ]]; then
        log_success "Tous les fichiers requis sont présents"
    fi
}

# Vérification des variables d'environnement
check_env_vars() {
    log_info "Vérification des variables d'environnement..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        error "Fichier d'environnement $ENV_FILE manquant"
        return 1
    fi
    
    # Sourcer le fichier d'environnement
    set -a
    source "$ENV_FILE"
    set +a
    
    # Variables obligatoires
    local required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "ENCRYPTION_KEY"
        "FIREBASE_SERVICE_ACCOUNT"
        "APP_BASE_URL"
        "DEFAULT_FROM_EMAIL"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            error "Variable d'environnement manquante: $var"
        fi
    done
    
    # Validation des formats
    if [[ -n "${APP_BASE_URL:-}" ]] && [[ ! "$APP_BASE_URL" =~ ^https?:// ]]; then
        error "APP_BASE_URL doit commencer par http:// ou https://"
    fi
    
    if [[ -n "${DEFAULT_FROM_EMAIL:-}" ]] && [[ ! "$DEFAULT_FROM_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]]; then
        error "DEFAULT_FROM_EMAIL n'est pas un email valide"
    fi
    
    # Validation de la longueur des secrets
    if [[ -n "${POSTGRES_PASSWORD:-}" ]] && [[ ${#POSTGRES_PASSWORD} -lt 12 ]]; then
        warning "POSTGRES_PASSWORD est trop court (minimum 12 caractères)"
    fi
    
    if [[ -n "${ENCRYPTION_KEY:-}" ]] && [[ ${#ENCRYPTION_KEY} -lt 32 ]]; then
        error "ENCRYPTION_KEY est trop court (minimum 32 caractères)"
    fi
    
    log_success "Variables d'environnement vérifiées"
}

# Vérification de la configuration Docker Compose
check_docker_compose() {
    log_info "Validation de la configuration Docker Compose..."
    
    if ! docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config > /dev/null 2>&1; then
        error "Configuration Docker Compose invalide"
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config
    else
        log_success "Configuration Docker Compose valide"
    fi
}

# Vérification des ports
check_ports() {
    log_info "Vérification des ports..."
    
    local ports=(80 443)
    
    for port in "${ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            warning "Port $port déjà utilisé"
        fi
    done
    
    log_success "Ports vérifiés"
}

# Vérification de l'espace disque
check_disk_space() {
    log_info "Vérification de l'espace disque..."
    
    local available_gb=$(df / | awk 'NR==2 {printf "%.0f", $4/1024/1024}')
    
    if [[ $available_gb -lt 5 ]]; then
        error "Espace disque insuffisant: ${available_gb}GB disponibles (minimum 5GB)"
    elif [[ $available_gb -lt 10 ]]; then
        warning "Espace disque faible: ${available_gb}GB disponibles (recommandé 10GB+)"
    else
        log_success "Espace disque suffisant: ${available_gb}GB disponibles"
    fi
}

# Vérification de la mémoire
check_memory() {
    log_info "Vérification de la mémoire..."
    
    local mem_gb=$(free -g | awk 'NR==2{printf "%.0f", $2}')
    
    if [[ $mem_gb -lt 2 ]]; then
        error "Mémoire insuffisante: ${mem_gb}GB (minimum 2GB)"
    elif [[ $mem_gb -lt 4 ]]; then
        warning "Mémoire faible: ${mem_gb}GB (recommandé 4GB+)"
    else
        log_success "Mémoire suffisante: ${mem_gb}GB"
    fi
}

# Vérification de Docker
check_docker() {
    log_info "Vérification de Docker..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé"
        return 1
    fi
    
    if ! docker info &> /dev/null; then
        error "Docker n'est pas en cours d'exécution"
        return 1
    fi
    
    if ! docker compose version &> /dev/null; then
        error "Docker Compose n'est pas installé"
        return 1
    fi
    
    log_success "Docker opérationnel"
}

# Vérification du build
check_build() {
    log_info "Test de build..."
    
    # Test du build frontend
    if ! npm run build &> /dev/null; then
        error "Échec du build frontend"
    else
        log_success "Build frontend OK"
    fi
    
    # Cleanup
    rm -rf dist/ 2>/dev/null || true
}

# Vérification Firebase
check_firebase() {
    log_info "Vérification Firebase..."
    
    if [[ -n "${FIREBASE_SERVICE_ACCOUNT:-}" ]]; then
        # Tenter de décoder le JSON base64
        if echo "$FIREBASE_SERVICE_ACCOUNT" | base64 -d | jq . &> /dev/null; then
            log_success "Configuration Firebase valide"
        else
            error "FIREBASE_SERVICE_ACCOUNT n'est pas un JSON base64 valide"
        fi
    else
        warning "FIREBASE_SERVICE_ACCOUNT non configuré"
    fi
}

# Résumé des vérifications
show_summary() {
    echo ""
    log_info "============ RÉSUMÉ DES VÉRIFICATIONS ============"
    
    if [[ $ERRORS -eq 0 ]] && [[ $WARNINGS -eq 0 ]]; then
        log_success "✅ Toutes les vérifications sont passées avec succès!"
        log_success "Vous pouvez procéder au déploiement avec ./deploy.sh"
    elif [[ $ERRORS -eq 0 ]]; then
        log_warning "⚠️  ${WARNINGS} warning(s) détecté(s)"
        log_info "Le déploiement peut procéder mais vérifiez les warnings"
    else
        log_error "❌ ${ERRORS} erreur(s) et ${WARNINGS} warning(s) détecté(s)"
        log_error "Corrigez les erreurs avant le déploiement"
        exit 1
    fi
}

# Instructions de correction
show_help() {
    echo ""
    log_info "🔧 AIDE POUR LA CORRECTION DES ERREURS:"
    echo ""
    echo "1. Variables d'environnement manquantes:"
    echo "   cp .env.production.example .env.production"
    echo "   ./scripts/generate-secrets.sh"
    echo "   nano .env.production"
    echo ""
    echo "2. Configuration Firebase:"
    echo "   - Allez sur console.firebase.google.com"
    echo "   - Project Settings > Service Accounts"
    echo "   - Generate new private key"
    echo "   - base64 -w 0 service-account.json"
    echo ""
    echo "3. Espace disque insuffisant:"
    echo "   docker system prune -af"
    echo "   sudo apt autoremove -y"
    echo ""
    echo "4. Docker non installé:"
    echo "   ./scripts/vps-setup.sh votre-domaine.com"
}

# Fonction principale
main() {
    log_info "🔍 EIDF CRM - Vérifications pré-déploiement"
    echo ""
    
    check_required_files
    check_env_vars
    check_docker
    check_docker_compose
    check_ports
    check_disk_space
    check_memory
    check_build
    check_firebase
    
    show_summary
    
    if [[ $ERRORS -gt 0 ]]; then
        show_help
    fi
}

# Vérification des dépendances
for cmd in jq netstat free df; do
    if ! command -v $cmd &> /dev/null; then
        log_warning "$cmd non trouvé, certaines vérifications seront ignorées"
    fi
done

# Exécution
main "$@"