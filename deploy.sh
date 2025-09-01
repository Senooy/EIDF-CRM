#!/bin/bash

# EIDF CRM - Script de déploiement production
# Usage: ./deploy.sh [--force] [--no-backup]

set -euo pipefail

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
BACKUP_DIR="/var/backups/eidf-crm"
PROJECT_NAME="eidf-crm"

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonctions utilitaires
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

# Vérification des prérequis
check_prerequisites() {
    log_info "Vérification des prérequis..."
    
    # Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker n'est pas installé"
        exit 1
    fi
    
    # Docker Compose
    if ! docker compose version &> /dev/null; then
        log_error "Docker Compose n'est pas installé"
        exit 1
    fi
    
    # Fichier d'environnement
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Fichier d'environnement $ENV_FILE manquant"
        log_info "Copiez .env.example vers $ENV_FILE et configurez les variables"
        exit 1
    fi
    
    log_success "Prérequis validés"
}

# Sauvegarde de la base de données
backup_database() {
    if [[ "$1" == "--no-backup" ]]; then
        log_warning "Sauvegarde de la base de données ignorée"
        return 0
    fi
    
    log_info "Sauvegarde de la base de données..."
    
    # Créer le répertoire de sauvegarde
    sudo mkdir -p "$BACKUP_DIR"
    
    # Nom du fichier de sauvegarde avec timestamp
    BACKUP_FILE="$BACKUP_DIR/database-$(date +%Y%m%d-%H%M%S).sql"
    
    # Sauvegarde si le conteneur de base de données existe
    if docker ps -a | grep -q "eidf-crm-db"; then
        docker exec eidf-crm-db pg_dump -U postgres eidf_crm > "$BACKUP_FILE"
        log_success "Base de données sauvegardée: $BACKUP_FILE"
    else
        log_warning "Conteneur de base de données non trouvé, première installation"
    fi
}

# Arrêt des services existants
stop_services() {
    log_info "Arrêt des services existants..."
    
    if docker compose -f "$COMPOSE_FILE" ps -q | grep -q .; then
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
        log_success "Services arrêtés"
    else
        log_info "Aucun service en cours d'exécution"
    fi
}

# Construction des images
build_images() {
    log_info "Construction des images Docker..."
    
    # Build avec cache si possible
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --parallel
    
    log_success "Images construites"
}

# Migration de la base de données
migrate_database() {
    log_info "Migration de la base de données..."
    
    # Démarrer uniquement la base de données et Redis pour les migrations
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d database redis
    
    # Attendre que la base de données soit prête
    log_info "Attente de la base de données..."
    timeout 60 docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec database sh -c 'until pg_isready -U postgres; do sleep 1; done'
    
    # Exécuter les migrations Prisma
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" run --rm backend sh -c "npx prisma migrate deploy && npx prisma db seed"
    
    log_success "Base de données migrée"
}

# Démarrage des services
start_services() {
    log_info "Démarrage des services..."
    
    # Démarrer tous les services
    docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    # Attendre que les services soient prêts
    log_info "Vérification de l'état des services..."
    sleep 10
    
    # Vérifier les services
    if docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps | grep -q "unhealthy"; then
        log_error "Certains services ne sont pas sains"
        docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
        exit 1
    fi
    
    log_success "Services démarrés"
}

# Tests de santé
health_checks() {
    log_info "Tests de santé des services..."
    
    # Test du backend
    if curl -f http://localhost/api/health &> /dev/null; then
        log_success "Backend: OK"
    else
        log_error "Backend: ERREUR"
        return 1
    fi
    
    # Test du frontend
    if curl -f http://localhost/health &> /dev/null; then
        log_success "Frontend: OK"
    else
        log_error "Frontend: ERREUR"
        return 1
    fi
    
    log_success "Tous les services sont opérationnels"
}

# Nettoyage
cleanup() {
    log_info "Nettoyage des images non utilisées..."
    docker image prune -f
    docker volume prune -f
    log_success "Nettoyage terminé"
}

# Fonction principale
main() {
    local force=false
    local no_backup=false
    
    # Parse arguments
    for arg in "$@"; do
        case $arg in
            --force)
                force=true
                shift
                ;;
            --no-backup)
                no_backup=true
                shift
                ;;
            -h|--help)
                echo "Usage: $0 [--force] [--no-backup]"
                echo "  --force     Forcer le déploiement même en cas d'erreurs mineures"
                echo "  --no-backup Ignorer la sauvegarde de la base de données"
                exit 0
                ;;
            *)
                log_error "Argument non reconnu: $arg"
                exit 1
                ;;
        esac
    done
    
    log_info "🚀 Début du déploiement EIDF CRM"
    
    # Étapes du déploiement
    check_prerequisites
    
    if [[ "$no_backup" == "true" ]]; then
        backup_database --no-backup
    else
        backup_database
    fi
    
    stop_services
    build_images
    migrate_database
    start_services
    
    # Tests de santé avec retry
    for i in {1..5}; do
        if health_checks; then
            break
        else
            if [[ $i -eq 5 ]]; then
                log_error "Tests de santé échoués après 5 tentatives"
                exit 1
            fi
            log_warning "Tentative $i/5 échouée, nouvelle tentative dans 10s..."
            sleep 10
        fi
    done
    
    cleanup
    
    log_success "🎉 Déploiement terminé avec succès!"
    log_info "Application disponible sur: http://$(hostname -I | awk '{print $1}')"
    log_info "Interface d'administration: http://$(hostname -I | awk '{print $1}'):9000 (si Portainer activé)"
}

# Gestion des signaux
trap 'log_error "Déploiement interrompu"; exit 1' INT TERM

# Exécution
main "$@"