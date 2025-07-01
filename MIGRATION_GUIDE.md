# Guide de Migration vers la Version SaaS

Ce guide vous accompagne dans la transformation de votre application EIDF-CRM en un micro SaaS multi-tenant pour la gestion WooCommerce.

## Vue d'ensemble de la refactorisation

La refactorisation transforme l'application mono-utilisateur actuelle en une plateforme SaaS complète avec :

- **Multi-tenancy** : Support de plusieurs organisations/boutiques
- **Gestion dynamique des credentials** : Chaque organisation configure ses propres API
- **Système de billing** : Plans d'abonnement avec limites et facturation
- **Isolation des données** : Sécurité et séparation complète entre organisations

## Étapes de migration

### 1. Configuration de la base de données

```bash
# 1. Installer PostgreSQL localement ou utiliser un service cloud

# 2. Créer la base de données
createdb eidf_crm_saas

# 3. Configurer l'URL de connexion dans .env
DATABASE_URL="postgresql://username:password@localhost:5432/eidf_crm_saas?schema=public"

# 4. Générer le client Prisma
npm run prisma:generate

# 5. Exécuter les migrations
npm run prisma:migrate

# 6. (Optionnel) Seed la base avec des données de démo
npm run prisma:seed
```

### 2. Configuration des variables d'environnement

Créez un fichier `.env` basé sur `.env.template` :

```env
# Base de données
DATABASE_URL="postgresql://..."

# Firebase Admin SDK
GOOGLE_APPLICATION_CREDENTIALS="path/to/firebase-admin-key.json"

# Clé de chiffrement (32 caractères minimum)
ENCRYPTION_KEY="your-secure-32-character-key-here"

# Stripe (pour le billing)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
VITE_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

### 3. Démarrage du serveur SaaS

```bash
# Démarrer en mode SaaS
npm run start:saas

# Ou démarrer seulement le serveur
npm run start:server:saas
```

### 4. Migration des données existantes

Si vous avez des données existantes, créez un script de migration :

```typescript
// scripts/migrate-to-saas.ts
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../src/server/services/encryption.service';

const prisma = new PrismaClient();

async function migrate() {
  // 1. Créer une organisation par défaut
  const org = await prisma.organization.create({
    data: {
      name: 'Ma Boutique',
      slug: 'ma-boutique',
      subscription: {
        create: {
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
        },
      },
    },
  });

  // 2. Migrer les credentials WooCommerce
  const wcCredentials = {
    apiUrl: process.env.VITE_WOOCOMMERCE_API_URL!,
    consumerKey: process.env.VITE_WOOCOMMERCE_CLIENT_KEY!,
    consumerSecret: process.env.VITE_WOOCOMMERCE_SECRET_KEY!,
  };

  await prisma.apiCredential.create({
    data: {
      organizationId: org.id,
      service: 'woocommerce',
      name: 'default',
      credentials: EncryptionService.encryptObject(wcCredentials),
    },
  });

  console.log('Migration terminée !');
}

migrate().catch(console.error).finally(() => prisma.$disconnect());
```

### 5. Mise à jour du frontend

1. **Wrapper l'application avec OrganizationProvider** :

```tsx
// src/main.tsx
import { OrganizationProvider } from '@/contexts/OrganizationContext';

<AuthProvider>
  <OrganizationProvider>
    <App />
  </OrganizationProvider>
</AuthProvider>
```

2. **Ajouter le sélecteur d'organisation dans la navbar** :

```tsx
// src/components/Layout/Navbar.tsx
import { OrganizationSwitcher } from '@/components/Organization/OrganizationSwitcher';

// Dans le composant Navbar
<OrganizationSwitcher />
```

3. **Implémenter l'onboarding pour les nouvelles organisations** :

```tsx
// src/pages/Dashboard.tsx
import { OnboardingFlow } from '@/components/Organization/OnboardingFlow';
import { useOrganization } from '@/contexts/OrganizationContext';

function Dashboard() {
  const { currentOrganization } = useOrganization();
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // Vérifier si l'organisation a des credentials configurés
  useEffect(() => {
    checkOnboardingStatus();
  }, [currentOrganization]);

  if (needsOnboarding) {
    return <OnboardingFlow onComplete={() => setNeedsOnboarding(false)} />;
  }

  // Dashboard normal...
}
```

### 6. Adapter les appels API

Tous les appels API doivent maintenant inclure l'organisation :

```typescript
// Avant
const response = await axios.get('/api/wc/products');

// Après (automatique avec OrganizationContext)
const response = await axios.get('/api/wc/products');
// Le header X-Organization-Id est ajouté automatiquement
```

### 7. Implémenter le billing (Phase 2)

1. **Créer la page de gestion des abonnements** :

```tsx
// src/pages/Billing.tsx
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

export function BillingPage() {
  // Implémenter la gestion des plans et paiements
}
```

2. **Ajouter les webhooks Stripe** :

```typescript
// src/server/routes/billing.routes.ts
router.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  // Gérer les événements Stripe (subscription.updated, etc.)
});
```

## Architecture finale

```
EIDF-CRM/
├── src/
│   ├── server/              # Backend multi-tenant
│   │   ├── db/             # Prisma client
│   │   ├── middleware/     # Auth & tenant isolation
│   │   ├── services/       # Business logic
│   │   └── routes/         # API endpoints
│   ├── contexts/           # React contexts (Auth, Organization)
│   ├── components/         # UI components
│   │   └── Organization/   # Org-specific components
│   └── lib/               # Client utilities
├── prisma/
│   └── schema.prisma      # Database schema
├── server-saas.ts         # Serveur principal SaaS
└── server.ts             # Ancien serveur (legacy)
```

## Checklist de migration

- [ ] Base de données PostgreSQL configurée
- [ ] Variables d'environnement mises à jour
- [ ] Firebase Admin SDK configuré
- [ ] Schéma Prisma migré
- [ ] Serveur SaaS démarré
- [ ] Frontend intégré avec OrganizationContext
- [ ] Onboarding flow implémenté
- [ ] Tests de bout en bout effectués
- [ ] Monitoring et logs configurés
- [ ] Backup des données legacy effectué

## Support et dépannage

### Erreurs communes

1. **"ENCRYPTION_KEY must be at least 32 characters"**
   - Générez une clé sécurisée : `openssl rand -base64 32`

2. **"Organization not found"**
   - Vérifiez que l'utilisateur a bien une organisation
   - Lancez l'onboarding si nécessaire

3. **"WooCommerce credentials not found"**
   - L'organisation doit configurer ses API via l'onboarding
   - Vérifiez dans la table `api_credentials`

### Prochaines étapes

1. Implémenter le système de billing complet
2. Ajouter des dashboards d'analytics par organisation
3. Mettre en place le monitoring et les alertes
4. Implémenter les sauvegardes automatiques
5. Préparer le déploiement en production

Pour toute question, consultez la documentation technique ou ouvrez une issue sur le repository.