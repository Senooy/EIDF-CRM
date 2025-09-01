# 🚀 EIDF CRM - Déploiement Rapide

Guide de déploiement simplifié pour EIDF CRM sur VPS.

## ⚡ Déploiement Express (5 minutes)

### 1. Préparation VPS

```bash
# Sur votre serveur Ubuntu/Debian
git clone https://github.com/votre-repo/eidf-crm.git /opt/eidf-crm
cd /opt/eidf-crm

# Configuration automatique du serveur
sudo ./scripts/vps-setup.sh votre-domaine.com
```

### 2. Configuration

```bash
# Génération des secrets sécurisés
./scripts/generate-secrets.sh

# Configuration de l'environnement
cp .env.production.example .env.production
nano .env.production
```

**Variables essentielles à modifier :**
```env
APP_BASE_URL=https://votre-domaine.com
POSTGRES_PASSWORD=VotreMotDePasseSecurise
REDIS_PASSWORD=VotreRedisMotDePasse
ENCRYPTION_KEY=VotreCleDeChiffrement32Caracteres
FIREBASE_SERVICE_ACCOUNT=VotreConfigFirebaseBase64
DEFAULT_FROM_EMAIL=noreply@votre-domaine.com
```

### 3. Vérifications

```bash
# Test de la configuration
./scripts/pre-deploy-check.sh
```

### 4. Déploiement

```bash
# Déploiement automatique
./deploy.sh
```

### 5. SSL (après déploiement)

```bash
# Certificat SSL automatique
sudo certbot --nginx -d votre-domaine.com
```

## ✅ Vérification

- **Application**: https://votre-domaine.com
- **API Health**: https://votre-domaine.com/api/health
- **Status**: `eidf-status`

## 🔧 Commandes Utiles

```bash
# Statut complet
eidf-status

# Logs en temps réel
docker logs -f eidf-crm-backend

# Redémarrage
docker compose -f docker-compose.prod.yml restart

# Mise à jour
git pull && ./deploy.sh

# Sauvegarde
eidf-backup
```

## 📚 Documentation Complète

Pour plus de détails, consultez [DEPLOYMENT.md](./DEPLOYMENT.md)

## 🆘 Support Rapide

### Problème courant : Service ne démarre pas
```bash
docker logs eidf-crm-backend
docker compose -f docker-compose.prod.yml restart
```

### Problème : Base de données
```bash
docker logs eidf-crm-db
docker compose -f docker-compose.prod.yml restart database
```

### Problème : Espace disque
```bash
docker system prune -af
sudo apt autoremove -y
```

---

**🎉 Votre EIDF CRM est maintenant prêt !**