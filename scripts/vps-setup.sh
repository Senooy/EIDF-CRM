#!/bin/bash

# EIDF CRM - Configuration initiale du VPS
# À exécuter sur un serveur Ubuntu/Debian fraîchement installé

set -euo pipefail

# Configuration
APP_USER="eidf"
APP_DIR="/opt/eidf-crm"
DOMAIN="${1:-localhost}"

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

# Vérification des privilèges root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "Ce script doit être exécuté en tant que root"
        exit 1
    fi
}

# Mise à jour du système
update_system() {
    log_info "Mise à jour du système..."
    
    apt update -y
    apt upgrade -y
    apt autoremove -y
    
    log_success "Système mis à jour"
}

# Installation des paquets de base
install_packages() {
    log_info "Installation des paquets essentiels..."
    
    apt install -y \
        curl \
        wget \
        git \
        htop \
        nano \
        vim \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        logrotate \
        cron
    
    log_success "Paquets installés"
}

# Installation de Docker
install_docker() {
    log_info "Installation de Docker..."
    
    # Suppression des anciennes versions
    apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Ajout du dépôt Docker
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Installation
    apt update -y
    apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Configuration du service
    systemctl enable docker
    systemctl start docker
    
    log_success "Docker installé"
}

# Création de l'utilisateur application
create_app_user() {
    log_info "Création de l'utilisateur application..."
    
    if id "$APP_USER" &>/dev/null; then
        log_warning "Utilisateur $APP_USER existe déjà"
    else
        useradd -m -s /bin/bash "$APP_USER"
        usermod -aG docker "$APP_USER"
        log_success "Utilisateur $APP_USER créé"
    fi
    
    # Création du répertoire de l'application
    mkdir -p "$APP_DIR"
    chown "$APP_USER:$APP_USER" "$APP_DIR"
    chmod 755 "$APP_DIR"
}

# Configuration du pare-feu
setup_firewall() {
    log_info "Configuration du pare-feu..."
    
    # Réinitialisation
    ufw --force reset
    
    # Règles par défaut
    ufw default deny incoming
    ufw default allow outgoing
    
    # SSH
    ufw allow ssh
    
    # HTTP/HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # SMTP (pour les emails sortants)
    ufw allow out 25/tcp
    ufw allow out 587/tcp
    ufw allow out 465/tcp
    
    # DNS
    ufw allow out 53
    
    # Administration (Portainer) - uniquement en local
    ufw allow from 10.0.0.0/8 to any port 9000
    ufw allow from 172.16.0.0/12 to any port 9000
    ufw allow from 192.168.0.0/16 to any port 9000
    
    # Activation
    ufw --force enable
    
    log_success "Pare-feu configuré"
}

# Configuration de Fail2Ban
setup_fail2ban() {
    log_info "Configuration de Fail2Ban..."
    
    cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3
EOF

    systemctl restart fail2ban
    systemctl enable fail2ban
    
    log_success "Fail2Ban configuré"
}

# Configuration des logs
setup_logging() {
    log_info "Configuration de la rotation des logs..."
    
    cat > /etc/logrotate.d/eidf-crm <<EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 0644 $APP_USER $APP_USER
    postrotate
        docker kill --signal="USR1" \$(docker ps -q --filter label=com.docker.compose.project=eidf-crm) 2>/dev/null || true
    endscript
}
EOF

    log_success "Rotation des logs configurée"
}

# Installation de certbot pour SSL
install_ssl() {
    if [[ "$DOMAIN" != "localhost" ]]; then
        log_info "Installation de Certbot pour SSL..."
        
        apt install -y certbot python3-certbot-nginx
        
        # Création du certificat (nécessite que le domaine pointe vers le serveur)
        log_warning "Pour obtenir le certificat SSL, exécutez manuellement:"
        log_warning "certbot --nginx -d $DOMAIN"
        
        log_success "Certbot installé"
    else
        log_info "SSL ignoré pour localhost"
    fi
}

# Configuration des limites système
setup_limits() {
    log_info "Configuration des limites système..."
    
    cat >> /etc/security/limits.conf <<EOF
$APP_USER soft nofile 65536
$APP_USER hard nofile 65536
$APP_USER soft nproc 4096
$APP_USER hard nproc 4096
EOF

    # Configuration sysctl
    cat >> /etc/sysctl.conf <<EOF
# EIDF CRM optimizations
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 4096
vm.swappiness = 10
vm.max_map_count = 262144
EOF

    sysctl -p
    
    log_success "Limites système configurées"
}

# Installation de monitoring de base
install_monitoring() {
    log_info "Installation d'outils de monitoring..."
    
    apt install -y htop iotop nethogs ncdu
    
    # Script de monitoring personnalisé
    cat > /usr/local/bin/eidf-status <<EOF
#!/bin/bash
echo "=== EIDF CRM Status ==="
echo "Date: \$(date)"
echo ""
echo "=== System ==="
uptime
echo ""
echo "=== Docker ==="
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "=== Disk ==="
df -h / /var/lib/docker
echo ""
echo "=== Memory ==="
free -h
echo ""
echo "=== Network ==="
ss -tuln | grep -E ':(80|443|3001|5432|6379|25)'
EOF

    chmod +x /usr/local/bin/eidf-status
    
    log_success "Monitoring installé"
}

# Configuration de la sauvegarde automatique
setup_backup() {
    log_info "Configuration des sauvegardes automatiques..."
    
    mkdir -p /var/backups/eidf-crm
    chown "$APP_USER:$APP_USER" /var/backups/eidf-crm
    
    # Script de sauvegarde
    cat > /usr/local/bin/eidf-backup <<EOF
#!/bin/bash
cd $APP_DIR
sudo -u $APP_USER docker exec eidf-crm-db pg_dump -U postgres eidf_crm > /var/backups/eidf-crm/daily-\$(date +%Y%m%d).sql
find /var/backups/eidf-crm -name "daily-*.sql" -mtime +7 -delete
EOF

    chmod +x /usr/local/bin/eidf-backup
    
    # Cron job pour sauvegarde quotidienne à 2h du matin
    echo "0 2 * * * /usr/local/bin/eidf-backup" | crontab -u root -
    
    log_success "Sauvegardes automatiques configurées"
}

# Messages de fin
show_final_instructions() {
    log_success "🎉 Configuration du VPS terminée!"
    echo ""
    log_info "📋 Prochaines étapes:"
    echo "1. Cloner le projet: su - $APP_USER && cd $APP_DIR && git clone <repo-url> ."
    echo "2. Configurer .env.production avec vos paramètres"
    echo "3. Lancer le déploiement: ./deploy.sh"
    echo ""
    log_info "🔧 Commandes utiles:"
    echo "- Statut: eidf-status"
    echo "- Logs: docker logs eidf-crm-backend"
    echo "- Monitoring: htop, iotop, nethogs"
    echo "- Sauvegarde manuelle: eidf-backup"
    echo ""
    log_info "🔒 Sécurité:"
    echo "- Pare-feu activé (ports 22, 80, 443)"
    echo "- Fail2Ban configuré"
    echo "- Utilisateur non-root créé: $APP_USER"
    echo ""
    if [[ "$DOMAIN" != "localhost" ]]; then
        log_warning "⚠️ N'oubliez pas d'obtenir le certificat SSL:"
        echo "certbot --nginx -d $DOMAIN"
    fi
}

# Fonction principale
main() {
    log_info "🚀 Configuration du VPS EIDF CRM"
    log_info "Domaine: $DOMAIN"
    
    check_root
    update_system
    install_packages
    install_docker
    create_app_user
    setup_firewall
    setup_fail2ban
    setup_logging
    install_ssl
    setup_limits
    install_monitoring
    setup_backup
    
    show_final_instructions
}

# Gestion des signaux
trap 'log_error "Configuration interrompue"; exit 1' INT TERM

# Exécution
main