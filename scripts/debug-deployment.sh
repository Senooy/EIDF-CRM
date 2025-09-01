#!/bin/bash

# EIDF CRM - Debug du déploiement
# Diagnostique pourquoi l'ancienne version est déployée

set -euo pipefail

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

# Vérification des images Docker
check_docker_images() {
    log_info "🐳 Images Docker actuelles:"
    echo ""
    
    # Images liées au projet
    docker images | grep -E "(eidf|frontend|backend)" || echo "Aucune image trouvée"
    echo ""
    
    # Taille des images
    log_info "📦 Taille des images:"
    docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep -E "(eidf|frontend|backend)" || echo "Aucune image trouvée"
    echo ""
}

# Vérification des conteneurs
check_containers() {
    log_info "🔧 Conteneurs en cours d'exécution:"
    echo ""
    
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.CreatedAt}}"
    echo ""
    
    log_info "📋 Tous les conteneurs (y compris arrêtés):"
    docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}" | grep -E "(eidf|frontend|backend)" || echo "Aucun conteneur trouvé"
    echo ""
}

# Vérification des volumes
check_volumes() {
    log_info "💾 Volumes Docker:"
    echo ""
    
    docker volume ls | grep -E "(eidf|postgres|redis)" || echo "Aucun volume trouvé"
    echo ""
}

# Vérification du code source
check_source_code() {
    log_info "📁 Version du code source:"
    echo ""
    
    # Derniers commits
    log_info "Derniers commits Git:"
    git log --oneline -5 || log_warning "Pas un dépôt Git"
    echo ""
    
    # État Git
    log_info "État Git:"
    git status --porcelain || log_warning "Pas un dépôt Git"
    echo ""
    
    # Vérification des fichiers modifiés récemment
    log_info "Fichiers modifiés récemment (dernières 2h):"
    find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" | xargs ls -lt | head -10
    echo ""
}

# Vérification des builds
check_builds() {
    log_info "🏗️ Vérification des builds:"
    echo ""
    
    # Dossier dist
    if [[ -d "dist" ]]; then
        log_info "Dossier dist existant ($(ls -la dist/ | wc -l) fichiers):"
        ls -la dist/ | head -5
        echo "..."
    else
        log_warning "Aucun dossier dist trouvé"
    fi
    echo ""
    
    # Node modules
    if [[ -d "node_modules" ]]; then
        log_info "Node modules installés: $(ls node_modules/ | wc -l) paquets"
    else
        log_warning "Node modules manquants"
    fi
    echo ""
}

# Vérification de la configuration
check_configuration() {
    log_info "⚙️ Configuration:"
    echo ""
    
    # Fichiers de config Docker
    for file in docker-compose.prod.yml Dockerfile.frontend Dockerfile.backend; do
        if [[ -f "$file" ]]; then
            log_success "$file présent (modifié: $(stat -f '%Sm' "$file"))"
        else
            log_error "$file manquant"
        fi
    done
    echo ""
    
    # Variables d'environnement
    if [[ -f ".env.production" ]]; then
        log_success ".env.production présent"
        log_info "Variables définies:"
        grep -E "^[A-Z_]+" .env.production | cut -d= -f1 | head -5
        echo "... ($(wc -l < .env.production) lignes total)"
    else
        log_warning ".env.production manquant"
    fi
    echo ""
}

# Test de build rapide
test_build() {
    log_info "🧪 Test de build rapide:"
    echo ""
    
    # Test build frontend
    log_info "Test build frontend..."
    if timeout 30s npm run build &> /tmp/build.log; then
        log_success "Build frontend OK"
    else
        log_error "Build frontend échoué:"
        tail -5 /tmp/build.log
    fi
    echo ""
}

# Recommandations de correction
show_recommendations() {
    log_info "💡 RECOMMANDATIONS POUR CORRIGER:"
    echo ""
    
    echo "🔥 SOLUTION RAPIDE - Rebuild forcé:"
    echo "   ./deploy.sh --force-rebuild"
    echo ""
    
    echo "🧹 NETTOYAGE COMPLET:"
    echo "   docker compose -f docker-compose.prod.yml down"
    echo "   docker system prune -af"
    echo "   docker volume prune -f"
    echo "   ./deploy.sh"
    echo ""
    
    echo "🎯 REBUILD SANS CACHE:"
    echo "   docker compose -f docker-compose.prod.yml build --no-cache"
    echo "   docker compose -f docker-compose.prod.yml up -d"
    echo ""
    
    echo "🔍 SI LE PROBLÈME PERSISTE:"
    echo "   1. Vérifiez que vos modifications sont bien dans le bon fichier"
    echo "   2. Vérifiez les logs: docker logs eidf-crm-frontend"
    echo "   3. Vérifiez le contenu: docker exec eidf-crm-frontend ls -la /usr/share/nginx/html"
    echo "   4. Testez en local: npm run dev"
    echo ""
}

# Fonction principale
main() {
    log_info "🔍 DIAGNOSTIC DE DÉPLOIEMENT EIDF CRM"
    echo ""
    
    check_docker_images
    check_containers
    check_volumes
    check_source_code
    check_builds
    check_configuration
    test_build
    
    echo ""
    show_recommendations
}

# Nettoyage à la sortie
cleanup() {
    rm -f /tmp/build.log
}

trap cleanup EXIT

# Exécution
main "$@"