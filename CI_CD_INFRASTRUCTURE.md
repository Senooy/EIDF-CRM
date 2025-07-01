# 🚀 Infrastructure as Code & CI/CD - EIDF CRM

## Vue d'ensemble

L'infrastructure et le pipeline CI/CD sont entièrement automatisés pour garantir des déploiements fiables et reproductibles.

```
Code Push → GitHub Actions → Build & Test → Docker Registry → Deploy → Kubernetes
                ↓                                                          ↓
           Terraform Apply                                          Monitoring
```

## Pipeline CI/CD

### 1. **Workflow Principal** (`.github/workflows/ci-cd.yml`)

#### Étapes du pipeline :

1. **Tests** (sur chaque PR)
   - Linting du code
   - Tests unitaires
   - Build de vérification
   - Scan de sécurité

2. **Build** (sur push main/develop)
   - Construction des images Docker
   - Tag avec SHA du commit
   - Push vers GitHub Container Registry

3. **Deploy Staging** (sur push develop)
   - Déploiement automatique
   - Tests de fumée
   - Notification Slack

4. **Deploy Production** (sur push main)
   - Déploiement Blue/Green
   - Validation manuelle requise
   - Rollback automatique si échec

### 2. **Infrastructure Workflow** (`.github/workflows/infrastructure.yml`)

- Validation Terraform
- Plan sur PR avec commentaire
- Apply automatique sur main
- État stocké dans S3

## Infrastructure as Code (Terraform)

### Architecture AWS

```
┌─────────────────────────────────────────────────────┐
│                      Route53                         │
│                   (DNS Management)                   │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                   CloudFront                         │
│                    (CDN)                             │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│                 Load Balancer                        │
│                    (ALB)                             │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
┌───────▼──────┐           ┌───────▼──────┐
│     EKS      │           │     EKS      │
│   Cluster    │           │   Cluster    │
│   (Prod)     │           │  (Staging)   │
└──────┬───────┘           └──────┬───────┘
       │                          │
   ┌───┴────┬────┬────┐      ┌───┴────┐
   │   │    │    │    │      │        │
 ┌─▼─┐┌▼─┐ ┌▼─┐ ┌▼─┐  │    ┌─▼─┐ ┌───▼───┐
 │RDS││  │ │  │ │S3│  │    │RDS│ │Redis  │
 │   ││R │ │R │ │  │  │    │   │ │       │
 │   ││e │ │a │ │  │  │    │   │ │       │
 └───┘│d │ │b │ └──┘  │    └───┘ └───────┘
      │i │ │b │       │
      │s │ │i │       │
      └──┘ │t │       │
           │M │       │
           │Q │       │
           └──┘       │
```

### Modules Terraform

1. **VPC Module** (`terraform/modules/vpc/`)
   - Subnets publics/privés
   - NAT Gateways
   - Route tables
   - Security groups

2. **EKS Module** (`terraform/modules/eks/`)
   - Cluster EKS managé
   - Node groups (on-demand + spot)
   - IRSA (IAM Roles for Service Accounts)
   - Auto-scaling configuration

3. **RDS Module** (`terraform/modules/rds/`)
   - PostgreSQL Multi-AZ
   - Backups automatiques
   - Encryption at rest
   - Read replicas (production)

4. **ElastiCache Module** (`terraform/modules/elasticache/`)
   - Redis cluster
   - Failover automatique
   - Encryption in-transit

5. **S3 Module** (`terraform/modules/s3/`)
   - Buckets pour assets et backups
   - Versioning et lifecycle policies
   - Cross-region replication

6. **Monitoring Module** (`terraform/modules/monitoring/`)
   - CloudWatch dashboards
   - Alertes et métriques
   - Log aggregation

### Environnements

```bash
# Staging
terraform plan -var-file=environments/staging.tfvars
terraform apply -var-file=environments/staging.tfvars

# Production
terraform plan -var-file=environments/production.tfvars
terraform apply -var-file=environments/production.tfvars
```

## Déploiement avec Helm

### Structure Helm

```
helm/
├── eidf-crm/
│   ├── Chart.yaml
│   ├── values.yaml
│   ├── values-staging.yaml
│   ├── values-production.yaml
│   └── templates/
│       ├── deployment-*.yaml
│       ├── service-*.yaml
│       ├── ingress.yaml
│       ├── configmap.yaml
│       └── secret.yaml
└── infrastructure/
    ├── postgresql-values.yaml
    ├── redis-values.yaml
    └── rabbitmq-values.yaml
```

### Commandes de déploiement

```bash
# Déployer en staging
./scripts/deploy.sh staging v1.2.3

# Déployer en production
./scripts/deploy.sh production v1.2.3

# Rollback
helm rollback eidf-crm -n eidf-crm

# Voir l'historique
helm history eidf-crm -n eidf-crm
```

## Stratégies de déploiement

### 1. **Blue/Green (Production)**

```yaml
# Déploiement sur environnement "green"
kubectl apply -f deployment-green.yaml

# Test de santé
./scripts/health-check.sh green

# Basculement du trafic
kubectl patch service gateway -p '{"spec":{"selector":{"version":"green"}}}'

# Suppression de l'ancien "blue"
kubectl delete deployment gateway-blue
```

### 2. **Rolling Update (Staging)**

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxSurge: 1
    maxUnavailable: 0
```

### 3. **Canary Deployment (A/B Testing)**

```yaml
# 10% du trafic vers la nouvelle version
- destination:
    host: gateway
    subset: v2
  weight: 10
- destination:
    host: gateway
    subset: v1
  weight: 90
```

## Monitoring et Observabilité

### Métriques exposées

- **Application** : Latence, throughput, taux d'erreur
- **Infrastructure** : CPU, mémoire, réseau, disque
- **Business** : Utilisateurs actifs, revenus, conversions

### Dashboards Grafana

1. **Overview Dashboard**
   - Santé globale
   - SLIs principaux
   - Alertes actives

2. **Service Dashboards**
   - Métriques RED par service
   - Traces distribuées
   - Logs centralisés

3. **Infrastructure Dashboard**
   - Utilisation des ressources
   - Coûts AWS
   - Scaling events

### Alertes configurées

```yaml
# Exemples d'alertes
- Service down > 2 min → PagerDuty
- Error rate > 5% → Slack
- CPU > 80% → Auto-scaling
- Budget dépassé → Email finance
```

## Sécurité

### 1. **Secrets Management**

```bash
# AWS Secrets Manager
aws secretsmanager create-secret \
  --name eidf-crm/production \
  --secret-string file://secrets.json

# Kubernetes secrets depuis AWS
kubectl create secret generic app-secrets \
  --from-literal=jwt-secret=$(aws secretsmanager get-secret-value \
    --secret-id eidf-crm/production \
    --query SecretString \
    --output text | jq -r .jwt_secret)
```

### 2. **Network Policies**

```yaml
# Isolation par défaut
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
spec:
  podSelector: {}
  policyTypes:
  - Ingress
  - Egress
```

### 3. **Pod Security Standards**

```yaml
# Enforcement au niveau namespace
kubectl label namespace eidf-crm \
  pod-security.kubernetes.io/enforce=restricted
```

## Backup et Disaster Recovery

### 1. **Backup automatique**

```bash
# RDS snapshots quotidiens
# S3 versioning pour les assets
# Velero pour Kubernetes
velero backup create daily-backup \
  --include-namespaces eidf-crm \
  --ttl 720h
```

### 2. **Plan de récupération**

1. RTO (Recovery Time Objective) : 1 heure
2. RPO (Recovery Point Objective) : 1 heure
3. Tests de DR mensuels

## Coûts et optimisation

### Estimation mensuelle (Production)

| Service | Configuration | Coût estimé |
|---------|--------------|-------------|
| EKS | 3 x t3.large + 3 x spot | $250 |
| RDS | db.t3.medium Multi-AZ | $150 |
| ElastiCache | cache.t3.small x 3 | $120 |
| S3 + CloudFront | 1TB transfer | $100 |
| Load Balancer | 1 ALB | $25 |
| **Total** | | **~$645/mois** |

### Optimisations

1. **Spot instances** pour workloads non-critiques
2. **Reserved instances** pour économies long terme
3. **Auto-scaling** agressif
4. **S3 lifecycle policies**
5. **CloudFront caching**

## Scripts utiles

```bash
# Déploiement
./scripts/deploy.sh [env] [version]

# Tests
./scripts/smoke-tests.sh [url]

# Rollback
./scripts/rollback.sh [env] [version]

# Backup
./scripts/backup.sh [env]

# Monitoring
./scripts/check-health.sh [env]
```

## Checklist de déploiement

- [ ] Tests passent en local
- [ ] PR approuvée par 2 reviewers
- [ ] Scan de sécurité OK
- [ ] Documentation à jour
- [ ] Migration DB testée
- [ ] Rollback plan défini
- [ ] Monitoring configuré
- [ ] Alertes testées
- [ ] Communication équipe

L'infrastructure est maintenant entièrement automatisée et prête pour la production ! 🚀