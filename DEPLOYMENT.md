# 🚀 Guide de Déploiement EIDF CRM

Guide complet pour déployer EIDF CRM sur un serveur VPS en production.

## 📋 Prérequis

### Serveur VPS
- **OS**: Ubuntu 20.04+ ou Debian 11+
- **RAM**: Minimum 2GB (4GB recommandés)
- **Stockage**: Minimum 20GB SSD
- **CPU**: 2 vCPUs minimum
- **Réseau**: Connexion stable avec IP publique

### Domaine et DNS
- Nom de domaine configuré
- Enregistrement A pointant vers l'IP du serveur
- Accès aux paramètres DNS

### Services externes
- Compte Firebase (pour l'authentification)
- Configuration SMTP (optionnel, sinon utilise Postfix local)

## 🏗️ Architecture de Production

```
Internet
    ↓
[Nginx] → [Frontend React]
    ↓
[Backend Node.js] ← → [PostgreSQL]
    ↓               ↗
[Redis Cache] ← ↗
    ↓
[Postfix SMTP]
```

### Composants

- **Frontend**: React + Nginx (port 80/443)
- **Backend**: Node.js Express (port 3001)
- **Base de données**: PostgreSQL 15
- **Cache**: Redis 7
- **Email**: Postfix
- **Monitoring**: Portainer (optionnel)

## 🔧 Installation Étape par Étape

### 1. Préparation du Serveur

```bash
# Connexion au serveur
ssh root@VOTRE_IP_SERVEUR

# Téléchargement du projet
git clone https://github.com/votre-repo/eidf-crm.git /opt/eidf-crm
cd /opt/eidf-crm

# Configuration initiale du VPS
chmod +x scripts/vps-setup.sh
./scripts/vps-setup.sh votre-domaine.com
```

### 2. Configuration des Variables

```bash
# Génération des secrets
./scripts/generate-secrets.sh

# Configuration de l'environnement
cp .env.production.example .env.production
nano .env.production
```

#### Variables Essentielles à Modifier

```env
# Domaine
APP_BASE_URL=https://votre-domaine.com
HOSTNAME=votre-domaine.com

# Mots de passe (utilisez generate-secrets.sh)
POSTGRES_PASSWORD=VotreMotDePasseSecurise
REDIS_PASSWORD=VotreRedisMotDePasse  
ENCRYPTION_KEY=VotreCleDeChiffrement

# Firebase (obligatoire)
FIREBASE_SERVICE_ACCOUNT=eyJhbGciOiJIUzI1...

# Email
DEFAULT_FROM_EMAIL=noreply@votre-domaine.com
DEFAULT_FROM_NAME=Votre Nom
```

### 3. Configuration Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Créez un nouveau projet ou sélectionnez un existant
3. Activez Authentication > Sign-in method > Email/Password
4. Project Settings > Service Accounts > Generate new private key
5. Encodez le fichier JSON en base64:

```bash
base64 -w 0 votre-service-account.json
```

6. Copiez le résultat dans `FIREBASE_SERVICE_ACCOUNT`

### 4. Déploiement

```bash
# Changement vers l'utilisateur application
su - eidf
cd /opt/eidf-crm

# Déploiement
./deploy.sh
```

### 5. Configuration SSL

```bash
# Après que l'application fonctionne sur HTTP
sudo certbot --nginx -d votre-domaine.com

# Redémarrage pour prendre en compte SSL
docker compose -f docker-compose.prod.yml restart frontend
```

## 🔍 Vérification du Déploiement

### Tests de Santé

```bash
# Statut des services
eidf-status

# Test des endpoints
curl http://localhost/health
curl http://localhost/api/health

# Logs des services
docker logs eidf-crm-frontend
docker logs eidf-crm-backend
docker logs eidf-crm-db
```

### Accès à l'Application

- **Frontend**: `https://votre-domaine.com`
- **API**: `https://votre-domaine.com/api/`
- **Admin** (si activé): `https://votre-domaine.com:9000`

## 📊 Monitoring et Maintenance

### Commands Utiles

```bash
# Statut complet
eidf-status

# Redémarrage des services
docker compose -f docker-compose.prod.yml restart

# Mise à jour
git pull origin main
./deploy.sh

# Sauvegarde manuelle
eidf-backup

# Restauration
docker exec -i eidf-crm-db psql -U postgres eidf_crm < /var/backups/eidf-crm/backup.sql
```

### Logs

```bash
# Logs en temps réel
docker logs -f eidf-crm-backend
docker logs -f eidf-crm-frontend

# Logs des erreurs
docker logs eidf-crm-backend | grep ERROR
```

### Performance

```bash
# Utilisation des ressources
htop
iotop
nethogs

# Espace disque
df -h
docker system df
```

## 🔒 Sécurité

### Pare-feu (UFW)
- Port 22 (SSH) - Accès restreint
- Port 80 (HTTP) - Redirection vers HTTPS
- Port 443 (HTTPS) - Application principale
- Port 9000 (Portainer) - Accès local uniquement

### Fail2Ban
- Protection SSH automatique
- Protection Nginx contre les attaques
- Bannissement automatique des IPs suspectes

### Bonnes Pratiques
- Mots de passe complexes
- Clés SSH recommandées
- Certificats SSL automatiquement renouvelés
- Sauvegardes quotidiennes automatiques

## 🔄 Mise à Jour

### Mise à jour de l'application

```bash
cd /opt/eidf-crm

# Sauvegarde avant mise à jour
eidf-backup

# Récupération des dernières modifications
git pull origin main

# Redéploiement
./deploy.sh

# Vérification
eidf-status
```

### Mise à jour du système

```bash
# Mise à jour des paquets
sudo apt update && sudo apt upgrade -y

# Redémarrage si nécessaire
sudo reboot
```

## 🆘 Dépannage

### Problèmes Courants

#### Service ne démarre pas

```bash
# Vérifier les logs
docker logs eidf-crm-backend
docker logs eidf-crm-db

# Vérifier la configuration
docker compose -f docker-compose.prod.yml config

# Redémarrage forcé
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d
```

#### Base de données inaccessible

```bash
# Test de connexion
docker exec eidf-crm-db psql -U postgres -c "SELECT 1"

# Réinitialisation
docker compose -f docker-compose.prod.yml restart database
```

#### Problème de certificat SSL

```bash
# Renouvellement forcé
sudo certbot renew --force-renewal

# Vérification
sudo certbot certificates
```

#### Espace disque insuffisant

```bash
# Nettoyage Docker
docker system prune -af

# Nettoyage des logs
sudo journalctl --vacuum-time=7d

# Suppression des anciennes sauvegardes
find /var/backups/eidf-crm -name "*.sql" -mtime +30 -delete
```

## 📞 Support

### Logs Importants
- Application: `docker logs eidf-crm-backend`
- Nginx: `/var/log/nginx/`
- Système: `journalctl -u docker`
- Sécurité: `/var/log/auth.log`

### Informations pour le Support
- Version de l'OS: `lsb_release -a`
- Version Docker: `docker --version`
- État des services: `eidf-status`
- Utilisation des ressources: `htop`

### Structure des Fichiers

```
/opt/eidf-crm/
├── docker-compose.prod.yml    # Configuration production
├── .env.production           # Variables d'environnement
├── deploy.sh                 # Script de déploiement
├── scripts/                  # Scripts utilitaires
├── logs/                     # Logs applicatifs
└── uploads/                  # Fichiers uploadés

/var/backups/eidf-crm/        # Sauvegardes
/etc/nginx/ssl/              # Certificats SSL
/var/log/nginx/              # Logs Nginx
```

---

## 🎉 Félicitations !

Votre installation EIDF CRM est maintenant opérationnelle en production.

Pour toute question ou problème, consultez les logs et utilisez les commandes de dépannage ci-dessus.