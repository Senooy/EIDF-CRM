# Guide d'Infrastructure Email Complète

Ce guide couvre l'installation et la configuration complète d'une infrastructure d'email marketing professionelle pour EIDF-CRM.

## 📋 Vue d'Ensemble

L'infrastructure comprend:

### 🏗️ Architecture Backend
- **Serveur SMTP Postfix** avec configuration optimisée
- **Authentification DKIM** pour la réputation
- **Politique DMARC** pour la sécurité
- **Queue de traitement** avec Redis et Bull
- **Service de warm-up IP** automatisé
- **Tracking et analytics** en temps réel
- **Gestion des bounces** et désabonnements

### 🚀 Fonctionnalités Avancées
- **Envoi humanisé** avec délais variables
- **Variations de contenu** anti-spam
- **Warm-up IP progressif** sur 30-45 jours
- **Monitoring** et alertes automatiques
- **Gestion de réputation** IP/domaine
- **Conformité GDPR** complète

## 🛠️ Installation Complète

### 1. Configuration du Serveur

```bash
# Cloner le projet
git clone <repo-url>
cd EIDF-CRM

# Rendre les scripts exécutables
chmod +x scripts/*.sh

# Configuration Postfix (en root)
sudo ./scripts/postfix-setup.sh votre-domaine.com 192.168.1.100

# Configuration DNS
./scripts/dns-setup.sh votre-domaine.com 192.168.1.100
```

### 2. Configuration Base de Données

```bash
# Générer la migration Prisma
npx prisma generate
npx prisma migrate dev --name "email-infrastructure"

# Seed initial (optionnel)
npx prisma db seed
```

### 3. Variables d'Environnement

```env
# Base de données
DATABASE_URL="postgresql://user:password@localhost:5432/eidf_crm"

# Redis pour la queue
REDIS_URL="redis://localhost:6379"

# Configuration SMTP
SMTP_HOST="mail.votre-domaine.com"
SMTP_PORT=587
SMTP_SECURE=true
SMTP_USER="noreply@votre-domaine.com"
SMTP_PASS="votre-mot-de-passe"

# Tracking
TRACKING_BASE_URL="https://votre-domaine.com"
APP_BASE_URL="https://app.votre-domaine.com"

# Monitoring
EMAIL_MONITORING=true
ALERT_EMAIL="admin@votre-domaine.com"

# Développement
NODE_ENV="production"
```

### 4. Démarrage des Services

```bash
# Backend API
npm run dev

# Worker de queue (séparé)
npm run worker

# Frontend
npm run build
npm run start
```

## 📊 Configuration du Warm-up IP

### Création d'un Schedule

```typescript
import { ipWarmupService } from './services/ip-warmup.service';

// Créer un schedule de warm-up conservateur
const scheduleId = await ipWarmupService.createWarmupSchedule({
  organizationId: 'org-123',
  ipAddress: '192.168.1.100',
  startDate: new Date(),
  totalDuration: 30, // 30 jours
  maxDailyVolume: 5000,
  growthPattern: 'conservative'
});
```

### Progression Recommandée

| Jour | Emails Max | Gmail | Outlook | Yahoo | Autres |
|------|------------|-------|---------|-------|--------|
| 1-7  | 50-200     | 60%   | 25%     | 10%   | 5%     |
| 8-14 | 250-550    | 50%   | 30%     | 15%   | 5%     |
| 15-30| 650-2600   | 40%   | 35%     | 20%   | 5%     |

## 🎯 Utilisation des APIs

### Création de Campagne

```typescript
import { campaignApiService } from './services/campaign-api.service';

const campaign = await campaignApiService.createCampaign({
  name: "Newsletter Octobre 2024",
  subject: "Nos dernières actualités",
  body: "<h1>Bonjour {{firstName}}</h1><p>Contenu...</p>",
  recipients: [
    { 
      email: "user@example.com", 
      firstName: "John", 
      lastName: "Doe" 
    }
  ],
  dailyLimit: 200,
  hourlyLimit: 50,
  delayBetweenMin: 3,
  delayBetweenMax: 15
});
```

### Envoi et Contrôle

```typescript
// Envoyer immédiatement
await campaignApiService.sendCampaign(campaign.id);

// Mettre en pause
await campaignApiService.pauseCampaign(campaign.id);

// Reprendre
await campaignApiService.resumeCampaign(campaign.id);

// Statistiques en temps réel
const stats = await campaignApiService.getCampaignStats(campaign.id);
```

### Monitoring des Queues

```typescript
import { useQueueStats } from './hooks/useCampaignApi';

const { stats } = useQueueStats({ 
  autoRefresh: true, 
  refreshInterval: 5000 
});

console.log(stats); // { active: 5, waiting: 120, completed: 1250 }
```

## 🔐 Configuration DNS Complète

### Enregistrements Requis

```dns
; A Record pour le serveur mail
mail.votre-domaine.com.     A       192.168.1.100

; MX Record
votre-domaine.com.          MX  10  mail.votre-domaine.com.

; SPF Record
votre-domaine.com.          TXT     "v=spf1 ip4:192.168.1.100 mx -all"

; DKIM Record (généré automatiquement)
default._domainkey.votre-domaine.com. TXT "v=DKIM1;k=rsa;p=MIGfMA0GCS..."

; DMARC Record
_dmarc.votre-domaine.com.   TXT     "v=DMARC1; p=quarantine; rua=mailto:dmarc@votre-domaine.com"

; Reverse DNS (chez l'hébergeur)
100.1.168.192.in-addr.arpa. PTR     mail.votre-domaine.com.
```

### Vérification DNS

```bash
# Tester tous les enregistrements
./scripts/dns-setup.sh votre-domaine.com test

# Génération automatique du fichier zone
./scripts/dns-setup.sh votre-domaine.com zone
```

## 📈 Monitoring et Maintenance

### Commandes de Monitoring

```bash
# Santé générale du système
./scripts/email-monitoring.sh health

# Statistiques détaillées
./scripts/email-monitoring.sh stats

# Vérifications approfondies
./scripts/email-monitoring.sh check

# Maintenance et nettoyage
./scripts/email-monitoring.sh cleanup
```

### Métriques Importantes

```typescript
// Dashboard temps réel
const metrics = {
  emailsSent: 12450,
  openRate: 24.5,
  clickRate: 3.2,
  bounceRate: 1.8,
  unsubscribeRate: 0.3,
  queueStatus: {
    active: 5,
    waiting: 120,
    failed: 2
  }
};
```

## 🚨 Alertes et Résolution de Problèmes

### Alertes Automatiques

Le système envoie des alertes pour:
- Queue bloquée (>1000 messages)
- Taux de bounce élevé (>5%)
- Services arrêtés
- Certificats SSL expirés
- Espace disque faible

### Résolution Rapide

```bash
# Queue bloquée
sudo postsuper -d ALL
sudo systemctl restart postfix

# Service arrêté
sudo systemctl restart postfix opendkim opendmarc

# Logs en temps réel
tail -f /var/log/postfix.log | grep ERROR

# Nettoyer les erreurs
sudo ./scripts/email-monitoring.sh cleanup
```

## 🎛️ Interface d'Administration

### Dashboard Principal

L'interface web offre:
- **Vue d'ensemble** des campagnes actives
- **Monitoring temps réel** des queues
- **Statistiques détaillées** par campagne
- **Gestion du warm-up** IP
- **Configuration SMTP** par organisation
- **Gestion des listes** (bounces, désabonnements)

### Fonctionnalités Avancées

- **Test d'emails** avant envoi
- **Aperçu des templates** avec personnalisation
- **Segmentation avancée** des destinataires
- **A/B testing** des sujets
- **Rapports d'analyse** exportables

## 📚 Bonnes Pratiques

### Délivrabilité

1. **Commencer petit** : 50-100 emails/jour au début
2. **Progressivité** : Augmenter graduellement sur 30 jours
3. **Consistance** : Envoyer régulièrement
4. **Qualité du contenu** : Éviter le spam
5. **Nettoyage des listes** : Retirer les bounces

### Sécurité

1. **Certificats SSL** valides et renouvelés
2. **Mots de passe forts** pour SMTP
3. **Firewall configuré** (ports 25, 587, 465)
4. **Monitoring fail2ban** actif
5. **Logs centralisés** et analysés

### Performance

1. **Rate limiting** adapté à votre réputation
2. **Queue monitoring** proactif  
3. **Délais humanisés** entre envois
4. **Variations de contenu** pour éviter les filtres
5. **Nettoyage régulier** des logs et queues

## 🔧 Développement et API

### Endpoints Principaux

```
POST   /api/campaigns                    # Créer une campagne
GET    /api/campaigns                    # Lister les campagnes
GET    /api/campaigns/:id                # Détails d'une campagne
POST   /api/campaigns/:id/send           # Envoyer une campagne
POST   /api/campaigns/:id/test           # Email de test

GET    /api/warmup/status/:ip            # Statut warm-up
POST   /api/warmup/schedule              # Créer un schedule
GET    /api/warmup/stats                 # Statistiques globales

GET    /api/tracking/open/:trackingId    # Pixel de tracking
GET    /api/tracking/click/:trackingId   # Tracking de clic
GET    /api/unsubscribe/:trackingId      # Page de désabonnement
```

### Webhooks Disponibles

```
POST   /api/webhooks/sendgrid            # Webhooks SendGrid
POST   /api/webhooks/ses                 # Webhooks Amazon SES
POST   /api/webhooks/mailgun             # Webhooks Mailgun
POST   /api/webhooks/postfix             # Webhooks Postfix personnalisés
```

---

## 🚀 Mise en Production

### Checklist Finale

- [ ] DNS configurés et propagés (48h)
- [ ] Certificats SSL installés
- [ ] Services démarrés et monitorés
- [ ] Warm-up IP programmé
- [ ] Tests de délivrabilité réussis
- [ ] Monitoring opérationnel
- [ ] Sauvegardes configurées
- [ ] Documentation équipe complète

### Support

Pour toute question ou problème:
1. Consulter les logs: `tail -f /var/log/postfix.log`
2. Vérifier le monitoring: `./scripts/email-monitoring.sh health`
3. Tester la délivrabilité: https://mail-tester.com
4. Contacter l'équipe technique

---

*Cette infrastructure email est conçue pour une délivrabilité maximale et une conformité complète aux standards actuels.*