# 📌 Projet : WPHQ — Hub de Gestion WordPress Multisite

## 🎯 Objectif
Centraliser la gestion de plusieurs sites WordPress auto-hébergés (souvent mutualisés) sans devoir se connecter à chaque admin panel.

---

## 🧩 Stack proposée
- **Frontend** : Next.js (ou Vue) — Interface unique et rapide
- **Backend** : Node.js Express ou PHP Slim
- **Base de données** : IndexedDB (légère, simple à déployer)
- **Communication avec WordPress** : REST API + Plugins MU custom
- **Authentification** : Application Passwords WordPress (ou clés secrètes URL)

---

## 🔐 Authentification & Sécurité
- Stockage des credentials (Application Passwords) chiffrés
- Accès admin sécurisé (2FA, rate limiting, JWT)
- Vérification de l'intégrité des sites (ping REST API)

---

## 🛠️ Fonctionnalités principales

### 1. 📰 Publication d’articles
- Rédaction d’un article dans le hub
- Push multilingue ou multi-sites via `/wp-json/wp/v2/posts`
- Templates SEO avec placeholders dynamiques (ville, produit, etc.)
- Upload de médias centralisé via `/wp-json/wp/v2/media`

### 2. 🔄 Mises à jour (plugins, thèmes, WordPress core)
- Impossible via WP-CLI sur mutualisé => Contournement via plugin MU
- Lancement via URL sécurisée (ex : `?run-update=yes&key=XXX`)
- Gestion des réponses / logs dans le hub

### 3. 🧠 Programmatic SEO
- Générateur de pages à partir de CSV ou Google Sheets
- Injection automatique des données dynamiques
- Publication directe ou en brouillon

### 4. 📂 Gestion de fichiers (FTP/SFTP)
- Explorateur de fichiers intégré (upload / suppression)
- Connexion SFTP via lib ssh2
- Prise en charge des assets partagés

### 5. 🔎 Monitoring & Reporting
- Ping régulier de tous les sites (vérifier qu’ils sont UP)
- Logs d’erreurs et alertes centralisés
- Backup auto via exports JSON + fichiers zippés

---

## 🔌 Plugin MU à déployer sur chaque site
- Déclenche les mises à jour via URL + clé secrète
- Optionnel : expose des fonctions simples de monitoring, health-check, etc.
- Peut aussi recevoir des ordres via POST API (ex: purge cache)

Exemple :
```php
add_action('init', function () {
  if ($_GET['run-update'] === 'yes' && $_GET['key'] === 'maCléUltraSecrète') {
    include_once ABSPATH . 'wp-admin/includes/plugin.php';
    include_once ABSPATH . 'wp-admin/includes/update.php';
    wp_update_plugins();
    wp_update_themes();
    echo 'Mises à jour effectuées.';
    exit;
  }
});

---

## ❗ Contraintes d’un hébergement mutualisé

| Fonction     | Supportée | Contournement                          |
| ------------ | --------- | -------------------------------------- |
| WP-CLI       | ❌         | Plugin MU ou API custom                |
| SSH          | ❌         | SFTP (si dispo), sinon non utilisable  |
| Cron système | ❌         | Cron WordPress ou webhook externe      |
| REST API     | ✅         | Utilisable pour 90 % des fonctions     |
| Plugin MU    | ✅         | Permet de déployer fonctions critiques |

---

## ✅ Étapes de MVP

1. Dashboard de gestion des sites (ajout / édition / suppression)
2. Rédaction et push d’articles via REST API
3. Générateur de pages SEO à partir de templates
4. Déclencheur de mises à jour via plugin MU
5. Authentification sécurisée (tokens chiffrés)
6. Logs + état de santé des sites

---

## 🔮 Bonus (v2 ou +)

* Gestion multi-utilisateur
* Interface mobile
* Gestion DNS / SSL (si VPS)
* Intégration Jetpack (si actif sur sites)
* Sauvegardes automatisées vers Cloud