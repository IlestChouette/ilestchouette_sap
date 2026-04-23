# Il est chouette — Document de référence complet

> Ce document est la source de vérité sur le projet Il est chouette : l'entreprise, les services, l'architecture technique, les apps, les flux de paiement, et les règles métier. À donner en contexte à tout assistant IA travaillant sur ce projet.

---

## 1. L'entreprise

| Champ | Valeur |
|---|---|
| **Nom commercial** | Il est chouette |
| **Forme juridique** | SASU |
| **SIREN** | 942 069 949 |
| **RCS** | Nice |
| **Capital social** | 5 000 € |
| **Siège social** | 143 Promenade des Anglais, 06200 Nice, France |
| **Date de création** | 28 février 2025 |
| **Téléphone** | 06 95 42 73 12 |
| **Email** | allo@ilestchouette.fr |
| **Site web** | https://www.ilestchouette.fr |

**Président :** Fernando Francisco Fonseca Pinzón (né le 19/12/1984, Bogotá, Colombie)

**Tagline officielle :** "Assistant personnel à la demande"

**Concept :** Service de coursier humain à Nice. Des coursiers (personnes réelles) font les courses, livrent des médicaments, récupèrent des colis, conduisent des voitures, aident au quotidien, dépannent informatiquement ou font de petits travaux — à la demande via une app mobile ou WhatsApp.

---

## 2. Services et tarifs

| Service | ID | Emoji | Tarif | Disponibilité |
|---|---|---|---|---|
| Courses supermarché | `supermarket` | 🛒 | 8 € + 1 €/km | 7j/7 |
| Médicaments & pharmacie | `meds` | 💊 | 6 € + 1 €/km | 7j/7 |
| Nourriture & repas | `food` | 🍕 | 5 € + 1 €/km | 7j/7 |
| Clés, colis, documents | `keys` | 🗝️ | 6 € + 1 €/km | 7j/7 |
| Achats boutiques | `shopping` | 🛍️ | 8 € + 1 €/km | 7j/7 |
| Voiturier | `voiturier` | 🚗 | 25 €/h (min 1h) | 24h/24, 7j/7 |
| Accompagnement | `assist` | 🤝 | 25 €/h (min 1h) | 24h/24, 7j/7 |
| Dépannage informatique | `it` | 💻 | 65 €/h (min 1h) | 8h–19h, 7j/7 |
| Bricolage & petits travaux | `it` | 🔧 | 60 €/h (min 1h) | 8h–19h, 7j/7 |
| Mission spéciale | `other` | ✨ | Sur devis | À confirmer |

**Règle de calcul du prix :**
- Services à la livraison : `base + distance_km × 1 €`
- Services horaires : `tarif_heure × max(1, nb_heures)`
- Prix minimum toujours 1h pour les services horaires

**Supermarché — règle spéciale :**
Ne jamais inventer le prix des articles. Demander au client son budget estimé → le coursier fait les courses → saisit le montant réel en caisse → Stripe capture le montant exact (pré-autorisation).

---

## 3. Architecture technique

### Stack

| Couche | Technologie |
|---|---|
| Site web (vitrine + backoffice) | Next.js 14, Tailwind CSS, déployé sur Vercel |
| App client | React Native (Expo), Android + iOS |
| App coursier | React Native (Expo), Android + iOS |
| Backend / BDD | Supabase (PostgreSQL + Edge Functions Deno) |
| Paiement | Stripe |
| IA agent | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| Emails transactionnels | Resend (SMTP custom) → allo@ilestchouette.fr |
| Recherche produits | Open Food Facts API (sans clé, gratuit) |

### URLs et identifiants

| Ressource | Valeur |
|---|---|
| Site web | https://www.ilestchouette.fr / https://ilestchouette-sap.vercel.app |
| Supabase project URL | https://smvoupxtiilnhecgcxxh.supabase.co |
| Dashboard commerçant | /commercant/dashboard |
| Dashboard opérateur | /operateur |
| Dashboard admin | /admin |

### Répertoire du projet

```
ilestchouette_sap/
├── src/app/                    # Next.js — site web + backoffice
│   ├── HomeClient.tsx          # Page d'accueil (vitrine)
│   ├── page.tsx                # SEO + JSON-LD
│   ├── admin/                  # Dashboard admin (commandes, KPIs)
│   ├── operateur/              # Interface opérateur (créer commandes manuelles)
│   ├── commercant/             # Espace commerçant (login + dashboard)
│   └── bilan/                  # Bilan financier
├── supabase/functions/         # Edge Functions Deno
│   ├── chat-agent/             # Agent IA conversationnel
│   ├── create-payment-intent/  # Création paiement Stripe
│   └── capture-payment/        # Capture pré-autorisation Stripe
├── il-est-chouette-client/     # App mobile client (React Native)
│   ├── app/(tabs)/commander.tsx # Écran de commande via agent IA
│   └── lib/services.ts         # Définition des services et prix
└── il-est-chouette-coursier/   # App mobile coursier (React Native)
    └── app/(tabs)/index.tsx    # Liste des missions + FinishModal
```

---

## 4. Base de données (tables principales)

### `orders` — Commandes
| Colonne | Type | Description |
|---|---|---|
| id | UUID | Identifiant unique |
| service_id | text | ID du service (supermarket, meds, food…) |
| client_email | text | Email du client |
| client_name | text | Nom du client |
| client_phone | text | Téléphone du client |
| pickup_address | text | Adresse de collecte (ou nom du commerce) |
| dropoff_address | text | Adresse de livraison |
| notes | text | Instructions spéciales |
| price_items | numeric | Prix des articles |
| price_total | numeric | Total à payer (articles + frais) |
| price_items_actual | numeric | Montant réel payé en caisse (supermarché) |
| payment_method | text | `online_card`, `on_site_cash`, `on_site_card` |
| payment_status | text | `pending`, `paid`, `preauth`, `captured` |
| stripe_payment_intent_id | text | ID Stripe pour les paiements en ligne |
| status | text | `pending`, `accepted`, `en_route`, `delivered`, `annulee` |
| is_asap | boolean | Livraison immédiate ou programmée |
| scheduled_at | timestamptz | Date/heure programmée |
| merchant_id | UUID | Commerçant partenaire (si applicable) |
| created_at | timestamptz | Date de création |

### `merchants` — Commerçants partenaires
Colonnes clés : `id`, `name`, `email`, `category`, `address`, `opening_hours`, `closed_dates`, `is_open`, `user_id`, `status` (`active`/`pending`/`rejected`)

### `merchant_products` — Catalogue produits
Colonnes clés : `id`, `merchant_id`, `name`, `description`, `price`, `category`, `available`, `image_url`, `is_featured`

### `merchant_orders` — Commandes commerçants
Liaison entre `orders` et `merchants`. Statuts : `pending`, `accepted`, `preparing`, `ready`, `delivered`, `rejected`

---

## 5. Flux de paiement

### Paiement normal (livraison)
1. Client commande via agent IA → `payment_method: online_card`
2. App client → `create-payment-intent` → Stripe PaymentIntent
3. Commande créée avec `payment_status: paid`

### Pré-autorisation supermarché
1. Client commande supermarché → indique budget estimé
2. Stripe pré-autorise le montant (`capture_method: manual`) → `payment_status: preauth`
3. Coursier fait les courses, saisit le montant réel dans l'app
4. Edge Function `capture-payment` capture le montant exact
5. Commande mise à jour : `price_items_actual`, `price_total`, `payment_status: captured`
6. Le client est débité du montant réel, le reste est libéré automatiquement

### Paiement espèces / sur place
- `payment_method: on_site_cash` ou `on_site_card`
- Pas de Stripe impliqué
- `payment_status: pending` jusqu'à livraison

---

## 6. Agent IA (chat-agent)

- **Modèle** : `claude-haiku-4-5-20251001` (Anthropic)
- **Prompt caching** actif (`anthropic-beta: prompt-caching-2024-07-31`)
- **Clé API** : stockée dans les secrets Supabase (`ANTHROPIC_API_KEY`)

**Comportement :**
- Répond dans la langue du client (fr/en/es)
- Clôture les commandes en max 4 échanges
- Ne jamais inventer les prix des articles
- Pour supermarché : demander le budget estimé au client
- Propose un upsell naturel après confirmation
- Génère un bloc `[ACTION]{...}[/ACTION]` parsé par l'app pour créer la commande

**Format du bloc ACTION :**
```json
[ACTION]{
  "type": "create_orders",
  "orders": [{
    "service_id": "food",
    "merchant_id": null,
    "pickup_address": "Pizza Cresci, 5 rue Massena Nice",
    "dropoff_address": "15 avenue Jean Medecin Nice",
    "notes": "1 pizza 4 fromages 18€",
    "price_items": 18,
    "price_total": 24,
    "hours": null,
    "is_asap": true,
    "scheduled_at": null,
    "payment_method": "online_card"
  }]
}[/ACTION]
```

---

## 7. Applications mobiles

### App client (`il-est-chouette-client`)
- Chat avec l'agent IA pour passer des commandes
- Paiement Stripe intégré (carte bancaire)
- Historique des commandes
- Recherche produits Open Food Facts (supermarché)
- Adresses sauvegardées
- Prise en charge multilingue (fr/en/es)

### App coursier (`il-est-chouette-coursier`)
- Liste des missions disponibles + acceptation
- Navigation vers pickup et dropoff
- FinishModal multi-étapes : saisie montant réel (supermarché) → formulaire → signature
- Capture pré-auth Stripe depuis l'app
- Tap to Pay Stripe Terminal (à implémenter)

---

## 8. Espace commerçant (web)

URL : `/commercant/dashboard`

**Fonctionnalités :**
- Connexion par email/mot de passe
- Réception commandes en temps réel (Supabase Realtime)
- Alerte sonore à chaque nouvelle commande
- Accepter / refuser / marquer "prêt" les commandes
- Gérer le catalogue produits (ajout, modif, suppression, photo, mise en avant)
- Modifier horaires et fermetures exceptionnelles
- Toggle ouvert/fermé instantané
- Changer son mot de passe depuis le profil
- Mot de passe oublié (email de reset via Resend)

**Commerçants actifs :**
- POCO LOCO (Restaurant) — pocoloconice@gmail.com
- La Bouquetterie Côte d'Azur — labouquetterie06@gmail.com

---

## 9. Emails transactionnels

- **Provider** : Resend
- **SMTP** : smtp.resend.com:465, user: resend
- **Expéditeur** : allo@ilestchouette.fr
- **Templates** : HTML custom avec logo Il est chouette sur fond blanc, couleur orange #EA580C
- **Templates configurés** : Reset Password, Confirm Signup, Invite User, Magic Link
- **Logo URL** : https://ilestchouette-sap.vercel.app/logo-chouette.png

---

## 10. Identité visuelle

- **Couleur principale** : Orange `#F97316` (Tailwind `orange-500`) / `#EA580C` pour emails
- **Mascotte** : Hibou avec lunettes rondes
- **Logo** : "Il est Chouette" avec hibou intégré dans les "oo"
- **Style** : chaleureux, rond, fun, accessible — pas corporate
- **Police** : système (Tailwind default)

---

## 11. Règles importantes à respecter

1. **Ne jamais inventer les prix des articles** — surtout pour supermarché
2. **Les commandes "autre / sur devis"** ne sont pas encore sécurisées (flux devis en attente d'implémentation)
3. **Le champ `pickup_address`** contient parfois le nom du commerce (ex: "Carrefour Lingostière") et non une adresse — c'est normal
4. **Stripe pré-auth** : utiliser `capture_method: manual` pour supermarché + online_card
5. **Supabase redirect URLs** : toujours ajouter les nouvelles URLs dans Authentication → URL Configuration avant de les utiliser dans resetPasswordForEmail
6. **Builds Android** : EAS Free plan → build local avec `--local` + `ANDROID_HOME=$HOME/Library/Android/sdk`
7. **Migration SQL** : toujours tester avec `IF NOT EXISTS` et exécuter depuis Supabase SQL Editor si `supabase db push` échoue
8. **Modèle Anthropic** : uniquement les modèles Claude 4.x disponibles sur ce compte (`claude-haiku-4-5-20251001`)

---

## 12. À faire / en attente

- [ ] **Flux devis sécurisé** : commande `pending_quote` → opérateur fixe le prix → client paie (protection contre la fraude)
- [ ] **Stripe Tap to Pay** : dans l'app coursier pour encaisser sur place sans terminal physique
- [ ] **Carte virtuelle Stripe** : pour que le coursier paie en magasin au nom du client
- [ ] **Upload AABs Play Store** : client `build-1776879022360.aab` + coursier `build-1776870181652.aab`
- [ ] **Migration SQL** : vérifier que `price_items_actual` est bien dans la table `orders`
