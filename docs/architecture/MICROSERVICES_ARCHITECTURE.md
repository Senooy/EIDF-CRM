# 🏗️ Architecture Microservices - EIDF CRM

## Vue d'ensemble

L'application a été refactorisée en une architecture microservices pour améliorer la scalabilité, la maintenabilité et la résilience.

```
┌─────────────────┐
│   Frontend      │
│   (React)       │
└────────┬────────┘
         │
┌────────▼────────┐
│   API Gateway   │
│   (Express)     │
└────────┬────────┘
         │
    ┌────┴────┬──────┬──────┬──────┬──────┐
    │         │      │      │      │      │
┌───▼──┐ ┌───▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼──┐ ┌─▼──┐
│ Auth │ │ Org  │ │ WC │ │Bill│ │Ana │ │ AI │
└───┬──┘ └───┬──┘ └─┬──┘ └─┬──┘ └─┬──┘ └─┬──┘
    │        │      │      │      │      │
    └────────┴──────┴──────┴──────┴──────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
    ┌────▼────┐ ┌───▼───┐ ┌────▼────┐
    │Postgres │ │ Redis │ │RabbitMQ │
    └─────────┘ └───────┘ └─────────┘
```

## Services

### 1. **API Gateway** (Port 3000)
- Point d'entrée unique pour tous les clients
- Routage intelligent vers les microservices
- Authentification et autorisation
- Rate limiting et métriques
- Circuit breaker pattern

### 2. **Auth Service** (Port 3001)
- Gestion de l'authentification Firebase
- Validation des tokens JWT
- Gestion des sessions
- RBAC (Role-Based Access Control)

### 3. **Organization Service** (Port 3002)
- Gestion des organisations (CRUD)
- Gestion des utilisateurs et rôles
- Invitations et onboarding
- Cache Redis pour les données fréquentes

### 4. **WooCommerce Service** (Port 3003)
- Proxy vers les APIs WooCommerce
- Gestion multi-tenant des credentials
- Cache des réponses API
- Rate limiting par organisation

### 5. **Billing Service** (Port 3004)
- Intégration Stripe
- Gestion des abonnements
- Webhooks de paiement
- Limites d'utilisation
- Factures et rapports

### 6. **Analytics Service** (Port 3005)
- Collecte et agrégation de métriques
- Calcul du health score
- Rapports et dashboards
- Export de données
- Consommation des events via RabbitMQ

### 7. **AI Service** (Port 3006)
- Génération de contenu avec Gemini
- Queue de traitement asynchrone
- Optimisation des prompts
- Cache des résultats

## Infrastructure

### Base de données
- **PostgreSQL** : Base relationnelle principale
  - Séparation par schéma pour chaque service
  - Réplication master-slave
  - Backups automatiques

### Cache
- **Redis** : Cache distribué
  - Sessions utilisateurs
  - Cache des API responses
  - Rate limiting counters
  - Pub/Sub pour events temps réel

### Message Queue
- **RabbitMQ** : Communication asynchrone
  - Events entre services
  - Jobs de traitement long
  - Retry automatique
  - Dead letter queues

### Monitoring
- **Prometheus** : Collecte de métriques
- **Grafana** : Visualisation et dashboards
- **ELK Stack** : Logs centralisés (optionnel)

## Patterns d'architecture

### 1. **API Gateway Pattern**
```typescript
// Tous les appels passent par le gateway
GET /api/organizations -> Gateway -> Organization Service
POST /api/wc/products -> Gateway -> WooCommerce Service
```

### 2. **Database per Service**
```sql
-- Chaque service a sa propre base
eidf_auth      -- Auth service
eidf_org       -- Organization service  
eidf_billing   -- Billing service
eidf_analytics -- Analytics service
```

### 3. **Event-Driven Architecture**
```typescript
// Publier un event
messageQueue.publish('organization.events', 'org.created', {
  organizationId: '123',
  name: 'New Org'
});

// Consumer dans Analytics
messageQueue.subscribe('organization.events', async (event) => {
  await recordActivity(event);
});
```

### 4. **Circuit Breaker**
```typescript
// Protection contre les services défaillants
if (failureCount > threshold) {
  return cachedResponse || fallbackResponse;
}
```

### 5. **Saga Pattern** (pour transactions distribuées)
```typescript
// Orchestration de transactions
1. Create organization -> Organization Service
2. Create subscription -> Billing Service
3. Send welcome email -> Notification Service
// Rollback si échec
```

## Déploiement

### Docker Compose (Développement)
```bash
# Démarrer tous les services
docker-compose up

# Démarrer un service spécifique
docker-compose up gateway organization
```

### Kubernetes (Production)
```bash
# Déployer sur K8s
kubectl apply -f k8s/

# Scaler un service
kubectl scale deployment gateway --replicas=5 -n eidf-crm
```

### Variables d'environnement
Chaque service a ses propres variables :
- `DATABASE_URL` : Connection string spécifique
- `REDIS_URL` : URL Redis partagée
- `RABBITMQ_URL` : URL RabbitMQ partagée
- Service-specific vars (API keys, etc.)

## Avantages de cette architecture

1. **Scalabilité indépendante**
   - Scaler uniquement les services sous charge
   - Auto-scaling basé sur les métriques

2. **Isolation des pannes**
   - Un service down n'affecte pas les autres
   - Circuit breakers pour la résilience

3. **Déploiement indépendant**
   - CI/CD par service
   - Rollback granulaire

4. **Stack technologique flexible**
   - Chaque service peut utiliser sa stack
   - Mise à jour indépendante

5. **Équipes autonomes**
   - Une équipe par service
   - Ownership clair

## Monitoring et observabilité

### Métriques exposées
- Request rate, error rate, duration (RED)
- Business metrics par service
- Resource utilization

### Dashboards Grafana
1. **Overview Dashboard**
   - Santé globale du système
   - Métriques business clés

2. **Service Dashboards**
   - Métriques spécifiques par service
   - Logs et traces

3. **SLA Dashboard**
   - Uptime par service
   - Performance vs SLA

### Alertes
- Service down
- High error rate (>5%)
- High latency (p95 > 2s)
- Resource exhaustion
- Business anomalies

## Sécurité

1. **Network Policies**
   - Services isolés par défaut
   - Communication via service mesh

2. **Secrets Management**
   - Kubernetes secrets
   - Rotation automatique

3. **mTLS entre services**
   - Chiffrement in-transit
   - Authentification mutuelle

4. **Rate Limiting**
   - Par IP
   - Par organisation
   - Par endpoint

## Prochaines étapes

1. **Service Mesh (Istio)**
   - Traffic management avancé
   - Observabilité automatique

2. **GraphQL Gateway**
   - API unifiée
   - Schema stitching

3. **Event Sourcing**
   - Historique complet
   - CQRS pattern

4. **Serverless Functions**
   - Jobs ponctuels
   - Scaling to zero