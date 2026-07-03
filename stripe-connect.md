# Stripe Connect — Guide d'intégration WOC

Flux : Junior paie WOC → WOC transfère automatiquement au mentor (destination charge) moins la commission plateforme.

---

## Architecture

```
Junior (client)
  │  POST /api/payment/intent { mentor_id, amount }
  ▼
Backend WOC
  │  PaymentIntent { amount, application_fee_amount, transfer_data.destination }
  ▼
Stripe
  │  transfert automatique après paiement
  ▼
Compte connecté mentor (acct_xxx)
  │  virement bancaire (payout schedule du mentor)
  ▼
Compte bancaire du mentor
```

---

## 1. Variables d'environnement

Copier dans `.env.local` (dev) ou dans les secrets de prod :

```env
# Clés Stripe (tableau de bord → Developers → API keys)
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx   # fourni par Stripe CLI ou le dashboard webhook

# URLs de retour après l'onboarding KYC du mentor
STRIPE_CONNECT_RETURN_URL=http://localhost:3000/mentor/onboarding/complete
STRIPE_CONNECT_REFRESH_URL=http://localhost:3000/mentor/onboarding

# Commission plateforme (12 % par défaut = 10 % marge + ~1.5 % + 0.25 € frais Stripe estimés)
STRIPE_PLATFORM_FEE_RATE=0.12
STRIPE_FEE_RATE=0.015         # taux Stripe estimé pour votre région — vérifier stripe.com/pricing
STRIPE_FEE_FIXED_CENTS=25     # partie fixe en centimes (0.25 €)
```

---

## 2. Migration base de données

```bash
docker compose exec backend php bin/console doctrine:migrations:migrate
```

Deux colonnes sont ajoutées sur `mentor_profile` :
- `stripe_account_id VARCHAR(255) UNIQUE` — l'ID du compte connecté Stripe (`acct_xxx`)
- `stripe_transfers_enabled TINYINT(1)` — `true` quand le KYC est validé

---

## 3. Nouveaux endpoints backend

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| `POST` | `/api/stripe/connect/onboard` | Mentor connecté | Crée le compte connecté et retourne l'URL d'onboarding |
| `GET` | `/api/stripe/connect/status` | Mentor connecté | Statut du compte connecté |
| `POST` | `/api/payment/intent` | Utilisateur connecté | Crée un PaymentIntent (destination charge) |
| `POST` | `/api/payment/webhook` | Stripe (signature) | Webhook Stripe |

---

## 4. Intégration frontend (Next.js)

### 4.1 Installer les librairies Stripe

```bash
npm install @stripe/stripe-js @stripe/react-stripe-js
```

### 4.2 Onboarding mentor — flux complet

Ajouter un bouton "Configurer mes paiements" dans la page profil mentor :

```tsx
// components/mentoring/profile/StripeOnboardingButton.tsx
'use client'

import { useState } from 'react'

export function StripeOnboardingButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    const res = await fetch('/api/stripe/connect/onboard', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
    })
    const { onboarding_url } = await res.json()
    window.location.href = onboarding_url  // redirige vers Stripe
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? 'Chargement...' : 'Configurer mes paiements'}
    </button>
  )
}
```

Page de retour après le KYC (route `STRIPE_CONNECT_RETURN_URL`) :

```tsx
// app/mentor/onboarding/complete/page.tsx
'use client'

import { useEffect, useState } from 'react'

export default function OnboardingCompletePage() {
  const [status, setStatus] = useState<'pending' | 'active'>('pending')

  useEffect(() => {
    async function checkStatus() {
      const res = await fetch('/api/stripe/connect/status', {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      const data = await res.json()
      if (data.transfers_enabled) setStatus('active')
    }
    // Vérifier toutes les 3 secondes (le webhook peut prendre quelques instants)
    const interval = setInterval(checkStatus, 3000)
    checkStatus()
    return () => clearInterval(interval)
  }, [])

  if (status === 'active') {
    return <p>Compte configuré. Vous pouvez recevoir des paiements.</p>
  }
  return <p>Vérification en cours... Le tableau de bord Stripe peut prendre quelques minutes.</p>
}
```

### 4.3 Paiement junior → mentor

```tsx
// hooks/usePayMentor.ts
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

export async function payMentor(mentorId: number, amountCents: number) {
  // 1. Créer le PaymentIntent côté backend
  const res = await fetch('/api/payment/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ mentor_id: mentorId, amount: amountCents }),
  })

  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error)  // ex: "Ce mentor n'a pas encore configuré son compte de paiement."
  }

  const { client_secret } = await res.json()

  // 2. Confirmer le paiement côté client
  const stripe = await stripePromise
  const { error } = await stripe!.confirmCardPayment(client_secret, {
    payment_method: {
      card: cardElement,  // élément Stripe récupéré via useElements()
    },
  })

  if (error) throw new Error(error.message)
}
```

Ajouter `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx` dans `.env.local` côté frontend.

### 4.4 Vérifier si un mentor peut recevoir des paiements

Le backend retourne `400` si le mentor n'est pas onboardé. Gérer ce cas côté frontend :

```tsx
try {
  await payMentor(mentor.id, amount)
} catch (e) {
  if (e.message.includes('compte de paiement')) {
    showToast('Ce mentor n\'a pas encore configuré son compte de paiement.')
  } else {
    showToast('Erreur lors du paiement.')
  }
}
```

---

## 5. Tester en local

### 5.1 Prérequis

```bash
# Installer Stripe CLI
# macOS : brew install stripe/stripe-cli/stripe
# Windows : https://stripe.com/docs/stripe-cli#install
stripe login
```

### 5.2 Recevoir les webhooks localement

```bash
# Dans un terminal dédié — relayer les événements Stripe vers le backend local
stripe listen --forward-to http://localhost:8082/api/payment/webhook

# La CLI affiche le webhook secret à mettre dans STRIPE_WEBHOOK_SECRET :
# > Ready! Your webhook signing secret is whsec_xxx
```

### 5.3 Simuler un onboarding mentor

```bash
# 1. Appeler l'endpoint (avec un token JWT valide)
curl -X POST http://localhost:8082/api/stripe/connect/onboard \
  -H "Authorization: Bearer $TOKEN"

# Retourne : {"onboarding_url": "https://connect.stripe.com/setup/..."}

# 2. Ouvrir l'URL dans le navigateur et compléter le formulaire Stripe Test
# Utiliser les données de test Stripe (NIP: 000 000, IBAN: FR76 3000 6000 0112 3456 7890 189)

# 3. Après complétion, Stripe envoie account.updated → le backend met transfers_enabled = true
```

### 5.4 Simuler un paiement complet

```bash
# Déclencher manuellement un événement account.updated pour débloquer un mentor
stripe trigger account.updated

# Créer un PaymentIntent de test (5000 = 50 €)
curl -X POST http://localhost:8082/api/payment/intent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mentor_id": 1, "amount": 5000}'
```

### 5.5 Cartes de test

| Carte | Résultat |
|-------|----------|
| `4242 4242 4242 4242` | Paiement réussi |
| `4000 0025 0000 3155` | 3D Secure requis |
| `4000 0000 0000 9995` | Paiement échoué (fonds insuffisants) |
| `4000 0000 0000 0069` | Paiement expiré |

Date d'expiration : n'importe quelle date future. CVV : n'importe quels 3 chiffres.

### 5.6 Lancer les tests unitaires

```bash
# Dans le conteneur Docker
docker compose exec backend composer run tests

# Ou cibler les nouveaux tests uniquement
docker compose exec backend bash -c "rm -rf var/cache/test && php vendor/bin/phpunit tests/Controller/StripeConnectControllerTest.php tests/Controller/PaymentControllerTest.php tests/Service/StripeServiceTest.php tests/Service/StripeConnectServiceTest.php --testdox"
```

---

## 6. Mise en production — checklist

### 6.1 Dashboard Stripe (obligatoire avant le premier paiement réel)

- [ ] **Platform profile** → `dashboard.stripe.com/settings/connect/platform-profile`
  - Remplir les informations de la plateforme
  - Activer **"Negative balance liability : Your platform"** (obligatoire pour les destination charges)

- [ ] **Platform Pricing Tool** → `dashboard.stripe.com/settings/connect/platform_pricing`
  - Configurer les règles de commission (en alternative à `application_fee_amount` en dur)

- [ ] **Webhook endpoint** → `dashboard.stripe.com/webhooks`
  - URL : `https://votre-domaine.com/api/payment/webhook`
  - Événements à écouter : `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `account.updated`
  - Copier le **Signing secret** dans `STRIPE_WEBHOOK_SECRET`

- [ ] **Radar pour plateformes** → `dashboard.stripe.com/radar`
  - Activer les règles de détection de fraude (recommandé — la plateforme est merchant of record)

### 6.2 Variables d'environnement de production

```env
STRIPE_SECRET_KEY=sk_live_xxx           # clé live (jamais sk_test_)
STRIPE_WEBHOOK_SECRET=whsec_xxx         # secret du webhook live
STRIPE_CONNECT_RETURN_URL=https://woc.dev/mentor/onboarding/complete
STRIPE_CONNECT_REFRESH_URL=https://woc.dev/mentor/onboarding
STRIPE_PLATFORM_FEE_RATE=0.12
STRIPE_FEE_RATE=0.015                   # vérifier les taux actuels sur stripe.com/pricing
STRIPE_FEE_FIXED_CENTS=25
```

### 6.3 Monitoring post-déploiement

- **Margin report** → `dashboard.stripe.com/connect/margin` — surveiller que l'`application_fee_amount` couvre bien les frais Stripe
- **Connected accounts** → `dashboard.stripe.com/connect/accounts` — vérifier les onboardings en attente
- Alertes sur `charge.dispute.created` (webhook) — les litiges sont de la responsabilité de la plateforme

### 6.4 Points d'attention

- Les taux Stripe (`STRIPE_FEE_RATE`, `STRIPE_FEE_FIXED_CENTS`) sont des **estimations** — les taux réels varient selon le type de carte, le pays et les éventuels accords négociés. Utiliser le **Margin report** pour calibrer.
- Les plateformes hors Brésil et Malaisie ne peuvent pas collecter de frais depuis des comptes connectés dans ces pays.
- En cas de litige, Stripe reverse le transfert depuis le compte connecté vers votre plateforme. Si le solde du compte connecté est insuffisant, c'est votre plateforme qui absorbe la perte (`losses_collector: application`).
