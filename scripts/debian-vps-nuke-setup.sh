#!/bin/bash

# Script d'installation complète EIDF-CRM sur Debian VPS
# Usage: ./debian-vps-nuke-setup.sh [domain] [admin-email] [--no-confirm]
# Exemple: ./debian-vps-nuke-setup.sh example.com admin@example.com

set -e

# Configuration
DOMAIN=${1:-"example.com"}
ADMIN_EMAIL=${2:-"admin@example.com"}
NO_CONFIRM=${3}
IP_ADDRESS=$(hostname -I | awk '{print $1}')
HOSTNAME="mail.$DOMAIN"
APP_DIR="/opt/eidf-crm"
DB_PASSWORD=$(openssl rand -base64 32)
JWT_SECRET=$(openssl rand -base64 64)

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Fonction de logging avec couleurs
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

title() {
    echo -e "\n${PURPLE}🚀 $1${NC}"
    echo "=================================================="
}

# Vérification des permissions root
if [ "$EUID" -ne 0 ]; then 
    error "Ce script doit être exécuté en tant que root"
fi

# Affichage des informations
title "INSTALLATION EIDF-CRM SUR DEBIAN VPS"
echo -e "Domaine: ${GREEN}$DOMAIN${NC}"
echo -e "Email Admin: ${GREEN}$ADMIN_EMAIL${NC}"
echo -e "IP: ${GREEN}$IP_ADDRESS${NC}"
echo -e "Hostname: ${GREEN}$HOSTNAME${NC}"
echo -e "Répertoire App: ${GREEN}$APP_DIR${NC}"

if [ "$NO_CONFIRM" != "--no-confirm" ]; then
    echo -e "\n${YELLOW}⚠️  ATTENTION: Ce script va:${NC}"
    echo "  1. Nettoyer complètement le système"
    echo "  2. Installer PostgreSQL, Redis, Node.js, Postfix"
    echo "  3. Configurer l'infrastructure email complète"
    echo "  4. Déployer l'application EIDF-CRM"
    echo "  5. Sécuriser le serveur"
    echo
    read -p "Voulez-vous continuer? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Fonction de nettoyage en cas d'erreur
cleanup() {
    error "Installation échouée. Nettoyage en cours..."
    # Arrêter les services si ils existent
    systemctl stop postfix nginx redis-server postgresql || true
    # Nettoyer les packages installés
    apt autoremove -y || true
}

# Piège pour nettoyer en cas d'erreur
trap cleanup ERR

# ============================================================================
# PHASE 1: NETTOYAGE ET PRÉPARATION DU SYSTÈME
# ============================================================================

title "Phase 1: Nettoyage et Préparation (5 min)"

log "Arrêt des services existants..."
systemctl stop apache2 nginx postfix mysql mariadb redis-server postgresql || true

log "Suppression des packages existants..."
apt-get remove -y apache2 nginx postfix mysql-server mariadb-server redis-server postgresql* || true
apt-get autoremove -y
apt-get autoclean

log "Mise à jour complète du système..."
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y

log "Installation des outils de base..."
apt-get install -y curl wget git vim htop unzip software-properties-common \
                   apt-transport-https ca-certificates gnupg lsb-release \
                   build-essential python3-dev python3-pip bc

log "Configuration du timezone et hostname..."
timedatectl set-timezone Europe/Paris
hostnamectl set-hostname "$HOSTNAME"
echo "127.0.1.1 $HOSTNAME mail" >> /etc/hosts

success "Système nettoyé et préparé"

# ============================================================================
# PHASE 2: INSTALLATION DES BASES DE DONNÉES
# ============================================================================

title "Phase 2: Installation des Bases de Données (10 min)"

log "Installation de PostgreSQL 15..."
apt-get install -y postgresql postgresql-contrib postgresql-client

log "Configuration PostgreSQL..."
systemctl start postgresql
systemctl enable postgresql

# Configuration de l'utilisateur et base de données
sudo -u postgres psql << EOF
CREATE USER eidf WITH CREATEDB SUPERUSER PASSWORD '$DB_PASSWORD';
CREATE DATABASE eidf_crm OWNER eidf;
GRANT ALL PRIVILEGES ON DATABASE eidf_crm TO eidf;
\q
EOF

log "Installation de Redis..."
apt-get install -y redis-server

# Configuration Redis
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
sed -i 's/^# maxmemory <bytes>/maxmemory 512mb/' /etc/redis/redis.conf
sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf

systemctl enable redis-server
systemctl restart redis-server

success "Bases de données installées et configurées"

# ============================================================================
# PHASE 3: INSTALLATION NODE.JS ET PM2
# ============================================================================

title "Phase 3: Installation Node.js et PM2 (8 min)"

log "Installation de Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

log "Installation de PM2..."
npm install -g pm2 @prisma/cli

log "Configuration PM2 pour le démarrage automatique..."
pm2 startup systemd -u root --hp /root

success "Node.js et PM2 installés"

# ============================================================================
# PHASE 4: INSTALLATION ET CONFIGURATION EMAIL
# ============================================================================

title "Phase 4: Infrastructure Email (20 min)"

log "Installation des composants email..."
apt-get install -y postfix postfix-pcre opendkim opendkim-tools opendmarc \
                   mailutils rsyslog logrotate fail2ban ufw

# Configuration Postfix automatique
log "Configuration automatique de Postfix..."
debconf-set-selections << EOF
postfix postfix/main_mailer_type string 'Internet Site'
postfix postfix/mailname string $DOMAIN
postfix postfix/destinations string $DOMAIN, localhost.localdomain, localhost
EOF

# Reconfigurer postfix avec les nouvelles valeurs
dpkg-reconfigure -f noninteractive postfix

# Configuration main.cf
cat > /etc/postfix/main.cf << EOF
# Configuration Postfix pour EIDF-CRM
myhostname = $HOSTNAME
mydomain = $DOMAIN
myorigin = \$mydomain
inet_interfaces = all
inet_protocols = ipv4
mydestination = localhost

# Security et anti-spam
disable_vrfy_command = yes
smtpd_helo_required = yes
smtpd_helo_restrictions = 
  permit_mynetworks,
  permit_sasl_authenticated,
  reject_invalid_helo_hostname,
  reject_non_fqdn_helo_hostname,
  permit

smtpd_sender_restrictions = 
  permit_mynetworks,
  permit_sasl_authenticated,
  reject_non_fqdn_sender,
  reject_unknown_sender_domain,
  permit

smtpd_recipient_restrictions = 
  permit_mynetworks,
  permit_sasl_authenticated,
  reject_non_fqdn_recipient,
  reject_unknown_recipient_domain,
  reject_unauth_destination,
  permit

# Rate limiting pour warm-up
smtpd_client_connection_count_limit = 10
smtpd_client_connection_rate_limit = 50
smtpd_client_message_rate_limit = 200
smtpd_error_sleep_time = 1s
smtpd_soft_error_limit = 10
smtpd_hard_error_limit = 20

# Queue management
maximal_queue_lifetime = 5d
bounce_queue_lifetime = 2d
minimal_backoff_time = 300s
maximal_backoff_time = 4000s

# Message size
message_size_limit = 25600000
mailbox_size_limit = 0

# TLS Configuration
smtpd_use_tls = yes
smtpd_tls_cert_file = /etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file = /etc/ssl/private/ssl-cert-snakeoil.key
smtpd_tls_security_level = may
smtpd_tls_protocols = !SSLv2, !SSLv3

# Client TLS
smtp_use_tls = yes
smtp_tls_security_level = may

# Logging
maillog_file = /var/log/postfix.log

# DKIM/DMARC (ajouté plus tard)
milter_protocol = 2
milter_default_action = accept
smtpd_milters = inet:localhost:8891,inet:localhost:8893
non_smtpd_milters = inet:localhost:8891,inet:localhost:8893
EOF

# Configuration du port submission
cat >> /etc/postfix/master.cf << EOF

# Submission port for authenticated clients  
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING

587 inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject_unauth_destination
  -o smtpd_client_connection_count_limit=50
  -o smtpd_client_connection_rate_limit=100
EOF

log "Configuration OpenDKIM..."
mkdir -p /etc/opendkim/keys/$DOMAIN

# Configuration OpenDKIM
cat > /etc/opendkim.conf << EOF
Syslog			yes
UMask			002
Socket			inet:8891@localhost
Domain			$DOMAIN
KeyFile			/etc/opendkim/keys/$DOMAIN/default.private
Selector		default
PIDFILE			/var/run/opendkim/opendkim.pid
SignatureAlgorithm	rsa-sha256
UserID			opendkim:opendkim
TrustAnchorFile		/usr/share/dns/root.key
KeyTable		/etc/opendkim/KeyTable
SigningTable		/etc/opendkim/SigningTable
ExternalIgnoreList	/etc/opendkim/TrustedHosts
InternalHosts		/etc/opendkim/TrustedHosts
LogWhy			yes
Canonicalization	relaxed/simple
EOF

# Génération de la clé DKIM
opendkim-genkey -s default -d "$DOMAIN" -D "/etc/opendkim/keys/$DOMAIN/"
chown -R opendkim:opendkim /etc/opendkim
chmod 600 /etc/opendkim/keys/$DOMAIN/default.private

# Configuration des tables OpenDKIM
echo "default._domainkey.$DOMAIN $DOMAIN:default:/etc/opendkim/keys/$DOMAIN/default.private" > /etc/opendkim/KeyTable
echo "*@$DOMAIN default._domainkey.$DOMAIN" > /etc/opendkim/SigningTable

cat > /etc/opendkim/TrustedHosts << EOF
127.0.0.1
localhost
$HOSTNAME
$DOMAIN
*.$DOMAIN
$IP_ADDRESS
EOF

log "Configuration OpenDMARC..."
cat > /etc/opendmarc.conf << EOF
Socket inet:8893@localhost
Syslog true
UMask 002
UserID opendmarc:opendmarc
PidFile /var/run/opendmarc.pid
RejectFailures false
TrustedAuthservIDs $HOSTNAME
EOF

log "Configuration des logs..."
cat > /etc/rsyslog.d/30-postfix.conf << EOF
mail.*                          /var/log/postfix.log
mail.info                       /var/log/postfix.log
mail.warn                       /var/log/postfix.log
mail.err                        /var/log/postfix.log
& stop
EOF

systemctl restart rsyslog

success "Infrastructure email configurée"

# ============================================================================
# PHASE 5: INSTALLATION NGINX ET CERTIFICATS SSL
# ============================================================================

title "Phase 5: Installation Nginx et SSL (8 min)"

log "Installation Nginx et Certbot..."
apt-get install -y nginx certbot python3-certbot-nginx

# Configuration Nginx basique
cat > /etc/nginx/sites-available/eidf-crm << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    # Certbot challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout       60s;
        proxy_send_timeout          60s;
        proxy_read_timeout          60s;
    }

    # API routes
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Activer le site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/eidf-crm /etc/nginx/sites-enabled/

# Test de la configuration
nginx -t
systemctl enable nginx
systemctl restart nginx

success "Nginx installé et configuré"

# ============================================================================
# PHASE 6: DÉPLOIEMENT DE L'APPLICATION
# ============================================================================

title "Phase 6: Déploiement EIDF-CRM (15 min)"

log "Création de l'utilisateur d'application..."
adduser --system --group --home "$APP_DIR" --shell /bin/bash eidf

log "Clone du repository..."
if [ ! -d "$APP_DIR" ]; then
    git clone https://github.com/youneskhelifi/EIDF-CRM.git "$APP_DIR"
else
    cd "$APP_DIR"
    git pull origin main
fi

chown -R eidf:eidf "$APP_DIR"

log "Installation des dépendances..."
cd "$APP_DIR"
sudo -u eidf npm install

log "Configuration de l'environnement..."
sudo -u eidf cat > "$APP_DIR/.env.production" << EOF
# Base de données
DATABASE_URL="postgresql://eidf:$DB_PASSWORD@localhost:5432/eidf_crm"

# Redis
REDIS_URL="redis://localhost:6379"

# Application
NODE_ENV="production"
PORT=3000
API_PORT=3001

# JWT
JWT_SECRET="$JWT_SECRET"
JWT_EXPIRES_IN="7d"

# Email Configuration
SMTP_HOST="localhost"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=""
SMTP_PASS=""

# Tracking
TRACKING_BASE_URL="https://$DOMAIN"
APP_BASE_URL="https://$DOMAIN"

# Organisation par défaut
DEFAULT_ORG_NAME="EIDF"
DEFAULT_ORG_EMAIL="$ADMIN_EMAIL"

# Monitoring
EMAIL_MONITORING=true
ALERT_EMAIL="$ADMIN_EMAIL"

# Features
ENABLE_WARMUP=true
ENABLE_CONTENT_VARIATIONS=true
ENABLE_TRACKING=true
ENABLE_BOUNCE_MANAGEMENT=true
EOF

log "Build de l'application..."
sudo -u eidf npm run build

log "Configuration de la base de données..."
sudo -u eidf npx prisma generate
sudo -u eidf npx prisma migrate deploy

log "Configuration PM2..."
sudo -u eidf cat > "$APP_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: 'eidf-crm-frontend',
      script: 'npm',
      args: 'start',
      cwd: '/opt/eidf-crm',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'eidf-crm-api',
      script: 'src/server/index.js',
      cwd: '/opt/eidf-crm',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'eidf-crm-worker',
      script: 'src/server/worker.js',
      cwd: '/opt/eidf-crm',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
EOF

log "Démarrage de l'application..."
sudo -u eidf pm2 start "$APP_DIR/ecosystem.config.js" --env production
sudo -u eidf pm2 save

# Configuration PM2 système
env PATH=$PATH:/usr/bin pm2 startup systemd -u eidf --hp "$APP_DIR"

success "Application EIDF-CRM déployée"

# ============================================================================
# PHASE 7: CONFIGURATION SSL ET SÉCURISATION
# ============================================================================

title "Phase 7: Sécurisation et SSL (10 min)"

log "Configuration du firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 25/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 587/tcp
ufw allow 465/tcp
ufw --force enable

log "Configuration Fail2Ban..."
cat > /etc/fail2ban/jail.d/eidf-custom.conf << EOF
[postfix]
enabled = true
port = smtp,465,587
filter = postfix
logpath = /var/log/postfix.log
maxretry = 3
bantime = 3600

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
logpath = /var/log/nginx/error.log
maxretry = 5
bantime = 3600

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
bantime = 3600
EOF

log "Obtention du certificat SSL..."
# Attendre que Nginx soit complètement démarré
sleep 5

if certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos --email "$ADMIN_EMAIL"; then
    success "Certificat SSL obtenu"
else
    warning "Impossible d'obtenir le certificat SSL automatiquement"
    warning "Vous pourrez le configurer manuellement plus tard avec:"
    warning "certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

log "Configuration du renouvellement automatique SSL..."
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -

success "Système sécurisé"

# ============================================================================
# PHASE 8: DÉMARRAGE DES SERVICES ET TESTS
# ============================================================================

title "Phase 8: Démarrage et Tests Finaux (5 min)"

log "Démarrage de tous les services..."
systemctl enable postfix opendkim opendmarc nginx fail2ban
systemctl restart postfix opendkim opendmarc nginx fail2ban

# Attendre que tous les services soient démarrés
sleep 10

log "Tests de connectivité..."
# Test des ports
if netstat -tuln | grep -q ":25 "; then
    success "Port 25 (SMTP) : OK"
else
    warning "Port 25 (SMTP) : PROBLÈME"
fi

if netstat -tuln | grep -q ":587 "; then
    success "Port 587 (Submission) : OK"
else
    warning "Port 587 (Submission) : PROBLÈME"
fi

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
    success "Application Web : OK"
else
    warning "Application Web : PROBLÈME"
fi

if redis-cli ping | grep -q "PONG"; then
    success "Redis : OK"
else
    warning "Redis : PROBLÈME"
fi

if sudo -u postgres psql -d eidf_crm -c "SELECT 1" > /dev/null 2>&1; then
    success "PostgreSQL : OK"
else
    warning "PostgreSQL : PROBLÈME"
fi

success "Installation terminée !"

# ============================================================================
# INFORMATIONS FINALES
# ============================================================================

title "🎉 INSTALLATION TERMINÉE AVEC SUCCÈS!"

echo -e "\n${GREEN}🌐 Accès à votre application:${NC}"
echo -e "   Application Web: ${BLUE}https://$DOMAIN${NC}"
echo -e "   Interface Admin: ${BLUE}https://$DOMAIN/admin${NC}"

echo -e "\n${GREEN}📧 Configuration Email:${NC}"
echo -e "   Serveur SMTP: ${BLUE}$HOSTNAME${NC}"
echo -e "   Port SMTP: ${BLUE}587 (avec STARTTLS)${NC}"
echo -e "   Authentication: ${BLUE}Nécessaire${NC}"

echo -e "\n${GREEN}🔐 Informations de Base de Données:${NC}"
echo -e "   Host: ${BLUE}localhost:5432${NC}"
echo -e "   Database: ${BLUE}eidf_crm${NC}"
echo -e "   User: ${BLUE}eidf${NC}"
echo -e "   Password: ${BLUE}$DB_PASSWORD${NC}"

echo -e "\n${YELLOW}📋 ENREGISTREMENTS DNS À CONFIGURER:${NC}"
echo -e "   ${BLUE}A Record:${NC}"
echo -e "   $DOMAIN           A      $IP_ADDRESS"
echo -e "   www.$DOMAIN       A      $IP_ADDRESS"
echo -e "   mail.$DOMAIN      A      $IP_ADDRESS"
echo ""
echo -e "   ${BLUE}MX Record:${NC}"
echo -e "   $DOMAIN           MX 10  mail.$DOMAIN"
echo ""
echo -e "   ${BLUE}SPF Record:${NC}"
echo -e "   $DOMAIN           TXT    \"v=spf1 ip4:$IP_ADDRESS mx -all\""
echo ""
echo -e "   ${BLUE}DKIM Record:${NC}"
echo -e "   default._domainkey.$DOMAIN TXT \"$(cat /etc/opendkim/keys/$DOMAIN/default.txt | sed 's/.*( "//' | sed 's/" ).*//' | tr -d '\n' | sed 's/" "//g')\""
echo ""
echo -e "   ${BLUE}DMARC Record:${NC}"
echo -e "   _dmarc.$DOMAIN    TXT    \"v=DMARC1; p=quarantine; rua=mailto:dmarc@$DOMAIN\""

echo -e "\n${RED}⚠️  IMPORTANT - REVERSE DNS:${NC}"
echo -e "   Configurez chez votre hébergeur VPS:"
echo -e "   ${BLUE}$IP_ADDRESS → mail.$DOMAIN${NC}"

echo -e "\n${GREEN}🛠️  Commandes Utiles:${NC}"
echo -e "   Monitoring: ${BLUE}$APP_DIR/scripts/email-monitoring.sh health${NC}"
echo -e "   Test DNS: ${BLUE}$APP_DIR/scripts/dns-setup.sh $DOMAIN test${NC}"
echo -e "   Logs Email: ${BLUE}tail -f /var/log/postfix.log${NC}"
echo -e "   Logs App: ${BLUE}sudo -u eidf pm2 logs${NC}"
echo -e "   Status Services: ${BLUE}systemctl status postfix nginx postgresql redis-server${NC}"

echo -e "\n${GREEN}📚 Documentation:${NC}"
echo -e "   Guide complet: ${BLUE}$APP_DIR/docs/DEBIAN_VPS_SETUP.md${NC}"
echo -e "   Infrastructure Email: ${BLUE}$APP_DIR/docs/EMAIL_INFRASTRUCTURE_GUIDE.md${NC}"

echo -e "\n${PURPLE}🎯 ÉTAPES SUIVANTES:${NC}"
echo "1. Configurer les enregistrements DNS (OBLIGATOIRE)"
echo "2. Attendre la propagation DNS (24-48h max)"
echo "3. Tester avec: $APP_DIR/scripts/dns-setup.sh $DOMAIN test"
echo "4. Accéder à l'application et créer le premier utilisateur"
echo "5. Configurer le warm-up IP pour commencer l'envoi"
echo "6. Tester la délivrabilité sur https://mail-tester.com"

echo -e "\n${GREEN}✅ Votre infrastructure EIDF-CRM est prête !${NC}"

log "Sauvegarde des informations dans /root/eidf-installation.txt..."
cat > /root/eidf-installation.txt << EOF
EIDF-CRM Installation Summary
=============================
Date: $(date)
Domain: $DOMAIN
IP: $IP_ADDRESS
Admin Email: $ADMIN_EMAIL

Database:
- Host: localhost:5432
- Database: eidf_crm
- User: eidf
- Password: $DB_PASSWORD

Application:
- Directory: $APP_DIR
- Web: https://$DOMAIN
- API: https://$DOMAIN/api

Services:
- Postfix: port 25, 587
- Nginx: port 80, 443
- Redis: localhost:6379
- PostgreSQL: localhost:5432

Configuration Files:
- Postfix: /etc/postfix/main.cf
- Nginx: /etc/nginx/sites-available/eidf-crm
- App: $APP_DIR/.env.production

Important:
- Configure DNS records shown in installation output
- Configure reverse DNS: $IP_ADDRESS -> mail.$DOMAIN
- Test deliverability after DNS propagation
EOF

success "Installation complète ! Informations sauvées dans /root/eidf-installation.txt"