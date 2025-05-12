# 📊 Routes WooCommerce API à exploiter pour KPIs

Toutes les routes commencent par :
`https://eco-industrie-france.com/wp-json/wc/v3/`

N'oublie pas d'utiliser l'authentification HTTP Basic avec ta **Consumer Key** et **Consumer Secret**.

---

## 🛒 `/orders`

### Objectif :
Récupérer les commandes pour analyser chiffre d'affaires, commandes par période, panier moyen…

### Paramètres utiles :
- `per_page` (int) : nombre de résultats par page (max 100)
- `page` (int) : page de résultats
- `status` (string) : `completed`, `pending`, `cancelled`, etc.
- `after` (datetime ISO8601) : ex. `2024-01-01T00:00:00`
- `before` (datetime ISO8601)

### Exemple :
GET /orders?after=2024-05-01T00:00:00&status=completed


---

## 👤 `/customers`

### Objectif :
Lister les clients pour voir le nombre total, les nouveaux inscrits, etc.

### Paramètres utiles :
- `per_page`
- `page`
- `orderby` : `date`, `email`, `name`, etc.
- `order` : `asc`, `desc`

---

## 📦 `/products`

### Objectif :
Lister tous les produits, voir les plus vendus, stock, etc.

### Paramètres utiles :
- `per_page`
- `page`
- `orderby` : `date`, `title`, `id`, `slug`, `price`, `popularity`, etc.
- `order`
- `status` : `publish`, `draft`
- `stock_status` : `instock`, `outofstock`, `onbackorder`

---

## 📈 `/reports`

> ⚠️ Obsolète dans les dernières versions, mais utile si dispo sur ton WooCommerce.

### Objectif :
Récupérer des rapports déjà calculés.

### Exemples :
- `/reports/sales`
- `/reports/orders/totals`
- `/reports/customers/totals`
- `/reports/products/totals`

---

## 🏷️ `/products/categories`

### Objectif :
Lister les catégories de produits pour regrouper les stats par catégorie.

---

## 🧾 `/coupons`

### Objectif :
Voir les coupons utilisés, performance des campagnes promos.

---

## 🚚 `/shipping/zones`

### Objectif :
Lister les zones de livraison pour croiser avec les commandes.

---

## 💳 `/payment_gateways`

### Objectif :
Lister les moyens de paiement activés et leur statut.

---

# 🔐 Authentification (Exemple Axios en React)

```js
axios.get('https://eco-industrie-france.com/wp-json/wc/v3/orders', {
  auth: {
    username: 'ck_xxxxxx',  // Consumer Key
    password: 'cs_xxxxxx'   // Consumer Secret
  }
})
.then(res => console.log(res.data))
.catch(err => console.error(err));
