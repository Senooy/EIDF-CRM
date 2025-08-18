#!/bin/bash

# Script de configuration Postfix pour l'envoi d'emails en masse
# Usage: ./postfix-setup.sh [domain] [ip-address]

set -e

DOMAIN=${1:-"example.com"}
IP_ADDRESS=${2:-$(hostname -I | awk '{print $1}')}
HOSTNAME=${3:-"mail.$DOMAIN"}

echo "🚀 Configuration de Postfix pour l'envoi d'emails en masse"
echo "Domain: $DOMAIN"
echo "IP Address: $IP_ADDRESS" 
echo "Hostname: $HOSTNAME"
echo

# Vérifier si on est root
if [ "$EUID" -ne 0 ]; then 
  echo "❌ Ce script doit être exécuté en tant que root"
  exit 1
fi

# Fonction de logging
log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "📦 Installation des paquets nécessaires..."

# Update packages
apt-get update

# Install required packages
apt-get install -y \
  postfix \
  postfix-pcre \
  opendkim \
  opendkim-tools \
  opendmarc \
  mailutils \
  rsyslog \
  logrotate \
  fail2ban \
  ufw

log "⚙️  Configuration de Postfix..."

# Backup existing config
cp /etc/postfix/main.cf /etc/postfix/main.cf.backup.$(date +%Y%m%d_%H%M%S)

# Configure main.cf
cat > /etc/postfix/main.cf << EOF
# Basic configuration
myhostname = $HOSTNAME
mydomain = $DOMAIN
myorigin = \$mydomain
inet_interfaces = all
inet_protocols = ipv4
mydestination = localhost

# Network and routing
relayhost =
mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128 10.0.0.0/8 192.168.0.0/16 172.16.0.0/12

# Mail handling
alias_maps = hash:/etc/aliases
alias_database = hash:/etc/aliases
home_mailbox = Maildir/

# Security and anti-spam
disable_vrfy_command = yes
smtpd_helo_required = yes
smtpd_helo_restrictions = 
  permit_mynetworks,
  permit_sasl_authenticated,
  reject_invalid_helo_hostname,
  reject_non_fqdn_helo_hostname,
  reject_unknown_helo_hostname,
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

# Rate limiting (important for warm-up)
smtpd_client_connection_count_limit = 10
smtpd_client_connection_rate_limit = 30
smtpd_client_message_rate_limit = 100
smtpd_error_sleep_time = 1s
smtpd_soft_error_limit = 10
smtpd_hard_error_limit = 20
smtpd_client_recipient_rate_limit = 100

# Queue management
maximal_queue_lifetime = 5d
bounce_queue_lifetime = 2d
minimal_backoff_time = 300s
maximal_backoff_time = 4000s
queue_run_delay = 300s

# Message size limits
message_size_limit = 25600000
mailbox_size_limit = 0

# TLS Configuration
smtpd_use_tls = yes
smtpd_tls_cert_file = /etc/ssl/certs/ssl-cert-snakeoil.pem
smtpd_tls_key_file = /etc/ssl/private/ssl-cert-snakeoil.key
smtpd_tls_security_level = may
smtpd_tls_protocols = !SSLv2, !SSLv3
smtpd_tls_ciphers = high
smtpd_tls_exclude_ciphers = aNULL, MD5, DES, 3DES, DES-CBC3-SHA, RC4-SHA, AES256-SHA, AES128-SHA

# SMTP client TLS
smtp_use_tls = yes
smtp_tls_security_level = may
smtp_tls_note_starttls_offer = yes

# Authentication (if needed)
smtpd_sasl_auth_enable = yes
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_security_options = noanonymous
broken_sasl_auth_clients = yes

# Logging
maillog_file = /var/log/postfix.log
EOF

log "🔧 Configuration du master.cf..."

# Configure submission port for authenticated sending
cat >> /etc/postfix/master.cf << EOF

# Submission port for authenticated clients
submission inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_reject_unlisted_recipient=no
  -o smtpd_client_restrictions=permit_sasl_authenticated,reject
  -o milter_macro_daemon_name=ORIGINATING

# High-volume submission port
587 inet n       -       y       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject_unauth_destination
  -o smtpd_client_connection_count_limit=50
  -o smtpd_client_connection_rate_limit=100
EOF

log "🔐 Configuration OpenDKIM..."

# Create OpenDKIM directory
mkdir -p /etc/opendkim
mkdir -p /etc/opendkim/keys/$DOMAIN

# Generate DKIM key
opendkim-genkey -s default -d $DOMAIN -D /etc/opendkim/keys/$DOMAIN/

# Set permissions
chown -R opendkim:opendkim /etc/opendkim
chmod 600 /etc/opendkim/keys/$DOMAIN/default.private

# Configure OpenDKIM
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

# Key table
KeyTable		/etc/opendkim/KeyTable
SigningTable		/etc/opendkim/SigningTable

# Trusted hosts
ExternalIgnoreList	/etc/opendkim/TrustedHosts
InternalHosts		/etc/opendkim/TrustedHosts

# Logging
LogWhy			yes
Canonicalization	relaxed/simple
EOF

# Create key table
echo "default._domainkey.$DOMAIN $DOMAIN:default:/etc/opendkim/keys/$DOMAIN/default.private" > /etc/opendkim/KeyTable

# Create signing table
echo "*@$DOMAIN default._domainkey.$DOMAIN" > /etc/opendkim/SigningTable

# Create trusted hosts
cat > /etc/opendkim/TrustedHosts << EOF
127.0.0.1
localhost
$HOSTNAME
$DOMAIN
*.$DOMAIN
$IP_ADDRESS
EOF

# Configure Postfix to use OpenDKIM
cat >> /etc/postfix/main.cf << EOF

# DKIM configuration
milter_protocol = 2
milter_default_action = accept
smtpd_milters = inet:localhost:8891
non_smtpd_milters = inet:localhost:8891
EOF

log "📊 Configuration OpenDMARC..."

cat > /etc/opendmarc.conf << EOF
Socket inet:8893@localhost
Syslog true
UMask 002
UserID opendmarc:opendmarc
PidFile /var/run/opendmarc.pid
PublicSuffixList /usr/share/publicsuffix/public_suffix_list.dat
RejectFailures false
TrustedAuthservIDs $HOSTNAME
EOF

# Add DMARC to Postfix
sed -i 's/smtpd_milters = inet:localhost:8891/smtpd_milters = inet:localhost:8891,inet:localhost:8893/' /etc/postfix/main.cf
sed -i 's/non_smtpd_milters = inet:localhost:8891/non_smtpd_milters = inet:localhost:8891,inet:localhost:8893/' /etc/postfix/main.cf

log "📝 Configuration des logs..."

# Configure rsyslog for better email logging
cat > /etc/rsyslog.d/30-postfix.conf << EOF
# Postfix logging
mail.*                          /var/log/postfix.log
mail.info                       /var/log/postfix.log
mail.warn                       /var/log/postfix.log
mail.err                        /var/log/postfix.log

# Stop processing after logging to postfix.log
& stop
EOF

# Configure logrotate for postfix logs
cat > /etc/logrotate.d/postfix << EOF
/var/log/postfix.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    sharedscripts
    postrotate
        systemctl reload rsyslog
    endscript
}
EOF

log "🛡️  Configuration du pare-feu..."

# Configure firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 25/tcp
ufw allow 587/tcp
ufw allow 465/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

log "🔒 Configuration Fail2Ban..."

# Configure fail2ban for Postfix
cat > /etc/fail2ban/jail.d/postfix.conf << EOF
[postfix]
enabled = true
port = smtp,465,submission
filter = postfix
logpath = /var/log/postfix.log
maxretry = 3
bantime = 3600

[postfix-sasl]
enabled = true
port = smtp,465,submission
filter = postfix-sasl
logpath = /var/log/postfix.log
maxretry = 3
bantime = 3600
EOF

log "🚀 Démarrage des services..."

# Start and enable services
systemctl enable postfix opendkim opendmarc rsyslog fail2ban
systemctl restart rsyslog
systemctl restart opendkim
systemctl restart opendmarc
systemctl restart postfix
systemctl restart fail2ban

log "✅ Configuration terminée!"

echo
echo "📋 INFORMATIONS IMPORTANTES:"
echo "============================="
echo
echo "🔑 Clé DKIM publique à ajouter dans votre DNS:"
echo "Nom: default._domainkey.$DOMAIN"
echo "Type: TXT"
cat /etc/opendkim/keys/$DOMAIN/default.txt
echo
echo "📧 Enregistrements DNS recommandés:"
echo "SPF: v=spf1 ip4:$IP_ADDRESS -all"
echo "DMARC: v=DMARC1; p=quarantine; rua=mailto:dmarc@$DOMAIN"
echo
echo "🔧 Fichiers de configuration:"
echo "- Postfix: /etc/postfix/main.cf"
echo "- OpenDKIM: /etc/opendkim.conf"
echo "- Logs: /var/log/postfix.log"
echo
echo "📊 Commandes utiles:"
echo "- Vérifier la queue: mailq"
echo "- Vider la queue: postsuper -d ALL"
echo "- Test DKIM: opendkim-testkey -d $DOMAIN -s default -vvv"
echo "- Logs en temps réel: tail -f /var/log/postfix.log"
echo
echo "⚠️  N'OUBLIEZ PAS:"
echo "1. Configurer les enregistrements DNS (SPF, DKIM, DMARC)"
echo "2. Obtenir un certificat SSL valide"
echo "3. Configurer le reverse DNS (PTR)"
echo "4. Tester la délivrabilité avec mail-tester.com"
echo "5. Commencer par un warm-up IP progressif"
echo

log "Configuration Postfix terminée avec succès!"