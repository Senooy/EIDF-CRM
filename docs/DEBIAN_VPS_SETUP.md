# 🚀 Guide Complet de Déploiement EIDF-CRM sur VPS Debian

Ce guide vous permet d'installer complètement EIDF-CRM avec son infrastructure email sur un VPS Debian vierge.

## 🎯 Prérequis

### VPS Recommandé
- **OS**: Debian 12 (Bookworm) - Image fresh
- **RAM**: 4GB minimum (8GB recommandé)
- **CPU**: 2+ vCPU
- **Stockage**: 40GB+ SSD
- **IP**: IP dédiée fixe
- **Domaine**: Domaine pointant vers votre IP

### Informations à Préparer
- Nom de domaine (ex: `example.com`)
- Email admin (ex: `admin@example.com`)
- Mot de passe root/sudo
- Clés SSH (recommandé)

## 🔥 Installation Automatisée (Recommandé)

### Étape 1: Connexion au VPS

```bash
# Se connecter en root
ssh root@VOTRE_IP

# Ou si vous avez un utilisateur sudo
ssh votre-user@VOTRE_IP
sudo su -
```

### Étape 2: Télécharger et Lancer le Script

**Option A: Repository Public**
```bash
# Si le repository est public
curl -fsSL https://raw.githubusercontent.com/Senooy/EIDF-CRM/main/scripts/debian-vps-nuke-setup.sh -o debian-vps-setup.sh
chmod +x debian-vps-setup.sh

# Remplacez par vos vraies valeurs :
# example.com → votre domaine
# admin@example.com → votre email admin
./debian-vps-setup.sh example.com admin@example.com
```

**Option B: Repository Privé**
```bash
# 1. Cloner le repository sur votre machine locale avec authentification
git clone https://github.com/Senooy/EIDF-CRM.git
cd EIDF-CRM

# 2. Copier le script sur le VPS (depuis votre machine locale)
scp scripts/debian-vps-nuke-setup.sh root@VOTRE_IP:/root/

# 3. Sur le VPS, rendre exécutable et lancer
ssh root@VOTRE_IP
chmod +x /root/debian-vps-nuke-setup.sh

# Remplacez par vos vraies valeurs :
# example.com → votre domaine (ex: monentreprise.com)
# admin@example.com → votre email admin (ex: admin@monentreprise.com)
./debian-vps-nuke-setup.sh example.com admin@example.com
```

Le script va:
1. ⚡ Nettoyer le système
2. 📦 Installer toutes les dépendances
3. 🔧 Configurer Postfix + DKIM + DMARC
4. 🗄️ Installer PostgreSQL et Redis
5. 🚀 Déployer l'application EIDF-CRM
6. 🔒 Sécuriser le serveur
7. 📋 Afficher les informations finales

---

## 🛠️ Installation Manuelle Étape par Étape

Si vous préférez tout contrôler manuellement:

### Étape 1: Préparation du Système (15 min)

```bash
# Mise à jour complète du système
apt update && apt upgrade -y

# Installation des outils de base
apt install -y curl wget git vim htop unzip software-properties-common \
               apt-transport-https ca-certificates gnupg lsb-release

# Configuration du timezone
timedatectl set-timezone Europe/Paris

# Configuration du hostname
hostnamectl set-hostname mail.votre-domaine.com
echo "127.0.1.1 mail.votre-domaine.com mail" >> /etc/hosts
```

### Étape 2: Installation PostgreSQL (10 min)

```bash
# Installation PostgreSQL 15
apt install -y postgresql postgresql-contrib

# Configuration de base
sudo -u postgres createuser --createdb --superuser eidf
sudo -u postgres psql -c "ALTER USER eidf PASSWORD 'votre-mot-de-passe-secure';"
sudo -u postgres createdb eidf_crm -O eidf

# Démarrage automatique
systemctl enable postgresql
systemctl start postgresql
```

### Étape 3: Installation Redis (5 min)

```bash
# Installation Redis
apt install -y redis-server

# Configuration
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf

# Démarrage
systemctl enable redis-server
systemctl restart redis-server
```

### Étape 4: Installation Node.js et PM2 (10 min)

```bash
# Installation de Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Installation de PM2
npm install -g pm2

# Configuration PM2 au démarrage
pm2 startup systemd
```

### Étape 5: Installation et Configuration Email (30 min)

```bash
# Installation des composants email
apt install -y postfix postfix-pcre opendkim opendkim-tools opendmarc \
               mailutils rsyslog logrotate fail2ban ufw

# Configuration automatique avec notre script
# Si repo privé, copier d'abord: scp scripts/postfix-setup.sh root@VOTRE_IP:/root/
# Sinon télécharger: curl -fsSL https://raw.githubusercontent.com/Senooy/EIDF-CRM/main/scripts/postfix-setup.sh -o postfix-setup.sh
chmod +x postfix-setup.sh
./postfix-setup.sh votre-domaine.com VOTRE_IP
```

### Étape 6: Installation Nginx (10 min)

```bash
# Installation Nginx
apt install -y nginx certbot python3-certbot-nginx

# Configuration de base
systemctl enable nginx
systemctl start nginx

# Configuration firewall
ufw allow 'Nginx Full'
ufw allow ssh
ufw --force enable
```

### Étape 7: Déploiement de l'Application (20 min)

```bash
# Créer l'utilisateur de l'application
adduser --system --group --home /opt/eidf-crm eidf

# Cloner le repository
cd /opt
# Pour repo privé: utiliser SSH ou token d'accès personnel
# git clone https://github.com/Senooy/EIDF-CRM.git eidf-crm
# OU copier les fichiers depuis votre machine locale:
# scp -r ./EIDF-CRM root@VOTRE_IP:/opt/eidf-crm
git clone https://github.com/Senooy/EIDF-CRM.git eidf-crm
chown -R eidf:eidf /opt/eidf-crm

# Installation des dépendances
cd /opt/eidf-crm
sudo -u eidf npm install

# Configuration de l'environnement
sudo -u eidf cp .env.example .env.production
# Éditer .env.production avec vos valeurs

# Build de l'application
sudo -u eidf npm run build

# Configuration de la base de données
sudo -u eidf npx prisma migrate deploy
sudo -u eidf npx prisma generate

# Configuration PM2
sudo -u eidf pm2 start ecosystem.config.js --env production
sudo -u eidf pm2 save
```

### Étape 8: Configuration Nginx Reverse Proxy (10 min)

```bash
# Configuration Nginx pour l'app
cat > /etc/nginx/sites-available/eidf-crm << 'EOF'
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

# Activer le site
ln -s /etc/nginx/sites-available/eidf-crm /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default

# Test et redémarrage
nginx -t
systemctl reload nginx
```

### Étape 9: Configuration SSL avec Let's Encrypt (10 min)

```bash
# Obtenir le certificat SSL
certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Configuration du renouvellement automatique
echo "0 12 * * * /usr/bin/certbot renew --quiet" | crontab -
```

### Étape 10: Configuration DNS (15 min)

```bash
# Générer les enregistrements DNS
cd /opt/eidf-crm
./scripts/dns-setup.sh votre-domaine.com VOTRE_IP

# Afficher les enregistrements à configurer
./scripts/dns-setup.sh votre-domaine.com VOTRE_IP all
```

Configurer chez votre registrar de domaine:

```dns
# A Record
mail.votre-domaine.com.     A       VOTRE_IP
votre-domaine.com.          A       VOTRE_IP
www.votre-domaine.com.      A       VOTRE_IP

# MX Record
votre-domaine.com.          MX  10  mail.votre-domaine.com.

# SPF Record
votre-domaine.com.          TXT     "v=spf1 ip4:VOTRE_IP mx -all"

# DKIM Record (copier depuis la sortie du script)
default._domainkey.votre-domaine.com. TXT "v=DKIM1;k=rsa;p=..."

# DMARC Record
_dmarc.votre-domaine.com.   TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@votre-domaine.com"
```

**IMPORTANT**: Configurez aussi le **Reverse DNS (PTR)** chez votre hébergeur VPS:
`VOTRE_IP` → `mail.votre-domaine.com`

---

## 🔒 Sécurisation Finale (10 min)

```bash
# Configuration avancée Fail2Ban
curl -fsSL https://raw.githubusercontent.com/Senooy/EIDF-CRM/main/scripts/debian-security.sh -o security.sh
chmod +x security.sh
./security.sh

# Vérification des services
systemctl status postfix opendkim opendmarc redis-server postgresql nginx

# Test de santé général
cd /opt/eidf-crm
./scripts/email-monitoring.sh health
```

---

## 🧪 Tests et Validation (15 min)

### Test 1: Connectivité de base

```bash
# Test des ports
nmap -p 25,80,443,587 localhost

# Test SMTP
telnet localhost 25
# Taper: quit

# Test DNS
./scripts/dns-setup.sh votre-domaine.com test
```

### Test 2: Application Web

```bash
# Vérifier l'application
curl -I http://votre-domaine.com
curl -I https://votre-domaine.com

# Logs de l'application
sudo -u eidf pm2 logs
```

### Test 3: Envoi d'Email

```bash
# Test d'envoi simple
echo "Test email $(date)" | mail -s "Test EIDF-CRM" admin@votre-domaine.com

# Vérifier les logs
tail -f /var/log/postfix.log
```

### Test 4: Délivrabilité

1. Aller sur https://mail-tester.com/
2. Envoyer un email de test depuis votre application
3. Vérifier le score (objectif: 8+/10)

---

## 📊 Monitoring et Maintenance

### Commandes de Monitoring

```bash
# Santé globale du système
./scripts/email-monitoring.sh health

# Statistiques email
./scripts/email-monitoring.sh stats

# Nettoyage et maintenance
./scripts/email-monitoring.sh cleanup
```

### Tâches de Maintenance (Automatisées)

```bash
# Ajouter au crontab
crontab -e

# Contenu à ajouter:
# Renouvellement SSL automatique
0 12 * * * /usr/bin/certbot renew --quiet

# Nettoyage quotidien
0 2 * * * /opt/eidf-crm/scripts/email-monitoring.sh cleanup

# Monitoring quotidien
0 8 * * * /opt/eidf-crm/scripts/email-monitoring.sh health | mail -s "EIDF-CRM Health Report" admin@votre-domaine.com

# Backup hebdomadaire
0 3 * * 0 pg_dump eidf_crm | gzip > /opt/backups/eidf_crm_$(date +\%Y\%m\%d).sql.gz
```

---

## 🎯 Post-Installation

### 1. Configuration de l'Application

1. **Accéder à l'interface** : https://votre-domaine.com
2. **Créer le premier utilisateur admin**
3. **Configurer l'organisation** dans les paramètres
4. **Configurer SMTP** dans l'interface (utiliser localhost:587)

### 2. Warm-up IP

```bash
# Créer un schedule de warm-up via l'API ou l'interface
# Commencer avec 50 emails/jour pendant 1 semaine
# Puis augmenter graduellement
```

### 3. Tests de Campagne

1. **Créer une liste de test** avec vos emails
2. **Envoyer une campagne de test** (5-10 destinataires)
3. **Vérifier les statistiques** d'ouverture et de clic
4. **Contrôler la délivrabilité** avec mail-tester.com

---

## 🆘 Résolution de Problèmes

### Problèmes Courants

**Email non reçu :**
```bash
# Vérifier les logs
tail -f /var/log/postfix.log
# Vérifier la queue
mailq
```

**Application inaccessible :**
```bash
# Vérifier PM2
sudo -u eidf pm2 status
# Vérifier Nginx
systemctl status nginx
# Vérifier les logs
sudo -u eidf pm2 logs
```

**Certificat SSL expiré :**
```bash
# Renouveler manuellement
certbot renew --force-renewal
systemctl reload nginx
```

### Support

Pour toute question:
1. Vérifier les logs: `/var/log/postfix.log`, `pm2 logs`
2. Tester la santé: `./scripts/email-monitoring.sh health`
3. Vérifier DNS: `./scripts/dns-setup.sh votre-domaine.com test`

---

## 📚 Informations de Connexion

Après installation, vous aurez accès à:

- **Application Web**: https://votre-domaine.com
- **Base de données**: PostgreSQL sur localhost:5432
- **Redis**: localhost:6379
- **Email**: Postfix sur ports 25, 587, 465
- **Logs**: `/var/log/postfix.log`, `pm2 logs`

**Sauvegarder ces informations** dans un gestionnaire de mots de passe !

---

*Installation terminée ! Votre infrastructure EIDF-CRM est prête pour l'envoi d'emails marketing professionnels.*