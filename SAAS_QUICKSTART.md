# 🚀 Démarrage Rapide - Version SaaS

## ✅ Installation Complétée

J'ai mis en place toute l'infrastructure SaaS pour votre application :

1. **Base de données SQLite** créée et migrée (`prisma/dev.db`)
2. **Schéma multi-tenant** avec organisations, utilisateurs, abonnements
3. **Données de démonstration** insérées (2 organisations de test)
4. **Serveur SaaS** configuré avec authentification et isolation des données

## 🎯 Pour Démarrer

### 1. Lancer le serveur SaaS

Dans un terminal :
```bash
npm run start:saas
```

Cela démarre :
- Le serveur backend SaaS sur le port 3001
- Le frontend Vite sur le port 5173

### 2. Accéder à l'application

Ouvrez votre navigateur à : http://localhost:5173

### 3. Tester avec les données de démo

**Utilisateur de test :**
- Email : demo@example.com
- Organisations disponibles :
  - Demo Store Free (Plan gratuit)
  - Demo Store Pro (Plan professionnel)

## 📁 Structure des Fichiers Créés

```
src/
├── server/
│   ├── db/prisma.ts                    # Client Prisma
│   ├── middleware/auth.ts              # Auth multi-tenant
│   ├── services/
│   │   ├── organization.service.ts     # Gestion des orgs
│   │   ├── api-credential.service.ts   # Credentials chiffrés
│   │   ├── encryption.service.ts       # Chiffrement AES
│   │   └── woocommerce-factory.ts      # WooCommerce multi-tenant
│   └── routes/
│       ├── organization.routes.ts      # API organisations
│       └── api-credential.routes.ts    # API credentials
├── contexts/
│   └── OrganizationContext.tsx         # Context React
└── components/Organization/
    ├── OrganizationSwitcher.tsx        # Sélecteur d'org
    └── OnboardingFlow.tsx              # Assistant config
```

## 🔧 Configuration

### Variables d'environnement

Le fichier `.env` contient :
```env
# Base de données SQLite
DATABASE_URL="file:./dev.db"

# Clé de chiffrement pour les API credentials
ENCRYPTION_KEY="your-super-secure-32-character-encryption-key-here"

# Configuration Firebase existante
VITE_FIREBASE_API_KEY="..."
# ... autres configs Firebase
```

### Base de données

- **SQLite** utilisé pour la démo (facilité de setup)
- Pour la production, migrez vers PostgreSQL :
  ```env
  DATABASE_URL="postgresql://user:pass@host:5432/dbname"
  ```

## 🧪 Tester l'API

J'ai créé un script de test :
```bash
npx tsx test-saas-api.ts
```

## 🔄 Migration des Données Existantes

Pour migrer vos credentials WooCommerce actuels :

```typescript
// scripts/migrate-existing.ts
import { PrismaClient } from '@prisma/client';
import { EncryptionService } from '../src/server/services/encryption.service';

const prisma = new PrismaClient();

async function migrate() {
  // Créer votre organisation
  const org = await prisma.organization.create({
    data: {
      name: 'Eco Industrie France',
      slug: 'eco-industrie-france',
      subscription: {
        create: {
          plan: 'PROFESSIONAL',
          status: 'ACTIVE',
        },
      },
    },
  });

  // Migrer les credentials WooCommerce
  await prisma.apiCredential.create({
    data: {
      organizationId: org.id,
      service: 'woocommerce',
      name: 'Production',
      credentials: EncryptionService.encryptObject({
        apiUrl: 'https://eco-industrie-france.com',
        consumerKey: process.env.WOOCOMMERCE_CLIENT_KEY,
        consumerSecret: process.env.WOOCOMMERCE_SECRET_KEY,
      }),
    },
  });
}
```

## 🎨 Intégration Frontend

Pour activer le multi-tenant dans votre UI :

1. **Wrapper l'app** dans `main.tsx` :
```tsx
import { OrganizationProvider } from '@/contexts/OrganizationContext';

<AuthProvider>
  <OrganizationProvider>
    <App />
  </OrganizationProvider>
</AuthProvider>
```

2. **Ajouter le sélecteur** dans la navbar :
```tsx
import { OrganizationSwitcher } from '@/components/Organization/OrganizationSwitcher';
```

## 📊 Prochaines Étapes

1. **Intégrer Stripe** pour la facturation
2. **Ajouter l'onboarding** pour nouvelles organisations
3. **Implémenter les limites** par plan d'abonnement
4. **Monitoring et analytics** par organisation
5. **Tests end-to-end** complets

## ❓ Support

Consultez :
- `MIGRATION_GUIDE.md` pour le guide complet
- `prisma/schema.prisma` pour le modèle de données
- `server-saas.ts` pour l'API backend

L'application est maintenant prête à être transformée en SaaS complet ! 🎉