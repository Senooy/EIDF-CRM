# Système d'authentification EIDF-CRM

## Vue d'ensemble

Le système d'authentification de l'application EIDF-CRM utilise Firebase Authentication pour gérer l'authentification des utilisateurs de manière sécurisée. Le système comprend :

- Authentification côté client avec Firebase Auth
- Protection des routes React avec ProtectedRoute
- Middleware d'authentification côté serveur
- Déconnexion automatique après inactivité
- Gestion des tokens JWT

## Architecture

### Côté Client

1. **AuthContext** (`src/contexts/AuthContext.tsx`)
   - Fournit l'état d'authentification global
   - Gère la déconnexion automatique après 30 minutes d'inactivité
   - Expose les fonctions `currentUser`, `loading`, et `logout`

2. **ProtectedRoute** (`src/components/Auth/ProtectedRoute.tsx`)
   - Composant HOC qui protège les routes nécessitant une authentification
   - Redirige vers `/login` si l'utilisateur n'est pas connecté
   - Affiche un indicateur de chargement pendant la vérification

3. **UserProfile** (`src/components/Auth/UserProfile.tsx`)
   - Composant de profil utilisateur dans la navbar
   - Permet la déconnexion et l'accès aux paramètres

4. **API Client** (`src/utils/api-client.tsx`)
   - Intercepteur Axios qui ajoute automatiquement le token Firebase
   - Gère les erreurs 401 et redirige vers login si nécessaire

### Côté Serveur

1. **Middleware Auth** (`src/server/middleware/auth.ts`)
   - Vérifie les tokens Firebase sur toutes les routes API
   - Extrait l'ID de l'organisation et les rôles utilisateur
   - Protège les endpoints sensibles

2. **Configuration des serveurs**
   - `server.ts` : Serveur principal avec authentification activée
   - `server-saas.ts` : Serveur SaaS multi-tenant avec auth et organisations

## Utilisation

### Connexion

```tsx
// Page de login
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const handleLogin = async (email: string, password: string) => {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    // L'utilisateur sera automatiquement redirigé
  } catch (error) {
    // Gérer l'erreur
  }
};
```

### Déconnexion

```tsx
// Utiliser le hook useAuth
const { logout } = useAuth();

const handleLogout = async () => {
  await logout();
  // L'utilisateur sera redirigé vers /login
};
```

### Accès aux informations utilisateur

```tsx
const { currentUser } = useAuth();

if (currentUser) {
  console.log('Email:', currentUser.email);
  console.log('UID:', currentUser.uid);
}
```

### Appels API authentifiés

```tsx
import { apiClient } from '@/utils/api-client';

// Le token sera automatiquement ajouté
const response = await apiClient.getOrders();
```

## Configuration

### Variables d'environnement

Assurez-vous que les variables Firebase sont configurées dans `.env` :

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### Firebase Admin SDK (serveur)

Pour le serveur, configurez Firebase Admin dans `.env.server` :

```env
FIREBASE_SERVICE_ACCOUNT_PATH=path/to/serviceAccount.json
```

## Sécurité

1. **Tokens JWT** : Les tokens Firebase sont automatiquement rafraîchis
2. **Déconnexion automatique** : Après 30 minutes d'inactivité
3. **Protection des routes** : Toutes les routes sauf login/reset-password sont protégées
4. **Validation côté serveur** : Tous les endpoints API vérifient l'authentification
5. **HTTPS** : Assurez-vous d'utiliser HTTPS en production

## Dépannage

### Erreur "Session expirée"
- Le token a expiré, l'utilisateur doit se reconnecter
- Vérifiez la configuration Firebase

### Routes non protégées
- Assurez-vous que la route est dans le composant ProtectedLayout
- Vérifiez que AuthProvider entoure toute l'application

### Erreur 401 sur les API
- Vérifiez que le middleware auth est appliqué côté serveur
- Confirmez que le token est envoyé dans les headers