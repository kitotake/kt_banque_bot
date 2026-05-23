# 🏦 KT Banque — Bot Discord RP Bancaire

Bot Discord complet de gestion bancaire RP, développé en **TypeScript** avec **Discord.js v14**.

> 💡 **Monnaie du serveur : Prex** | `1 000 Prex = 1 €` (les euros sont indicatifs uniquement)

---

## ✨ Fonctionnalités

### 👤 Commandes Utilisateurs
| Commande | Description |
|----------|-------------|
| `/bank` | Tableau de bord complet : solde, carte, transactions récentes |
| `/balance` | Affiche votre solde en Prex |
| `/history` | Historique paginé de vos transactions |
| `/topbanque` | Classement des joueurs + réserve banque centrale |
| `/card create` | Créer votre carte KT Banque |
| `/card info` | Afficher votre carte et solde |
| `/card freeze` | Geler / dégeler votre carte |
| `/boutique` | Parcourir la boutique RP par catégorie |
| `/buy <item_id>` | Acheter un article (avec confirmation) |
| `/help` | Menu d'aide interactif avec catégories |

### 🔧 Commandes Admin Staff
| Commande | Description |
|----------|-------------|
| `/bankadmin init <montant>` | Initialise la banque centrale (en Prex) |
| `/bankadmin addmoney` | Ajouter des Prex à un joueur |
| `/bankadmin removemoney` | Retirer des Prex à un joueur |
| `/bankadmin transfer` | Virement entre deux joueurs |
| `/bankadmin logs` | Voir les derniers logs système |
| `/bankadmin setvocal` | Définir le salon vocal économie |
| `/addmoney` | Alias addmoney (standalone) |
| `/removemoney` | Alias removemoney (standalone) |
| `/transfer` | Alias transfer (standalone) |
| `/reset` | Remettre un compte à 0 Prex |
| `/shopadd` | Créer un article boutique |
| `/shopedit` | Modifier un article |
| `/shopremove` | Supprimer un article |
| `/shoptoggle` | Activer / désactiver un article |
| `/shopsales` | Statistiques des ventes |
| `/refund` | Rembourser un achat |

---

## 🚀 Installation

### Prérequis
- Node.js **≥ 18.0.0**
- npm ou yarn
- Bot Discord configuré sur le [Portail Développeur](https://discord.com/developers/applications)

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer `.env`
```env
TOKEN=votre_token_discord
CLIENT_ID=votre_client_id
GUILD_ID=votre_guild_id
LOG_CHANNEL_ID=id_salon_logs_economiques
LOG2_CHANNEL_ID=id_salon_logs_admin
```

### 3. Déployer les commandes slash
```bash
npm run deploy
```

### 4. Lancer le bot
```bash
# Développement
npm run dev

# Production
npm run build && npm start
```

### 5. Initialiser la banque centrale
```
/bankadmin init 1000000
```
Cela règle la réserve centrale à **1 000 000 Prex** (1 000 €).

### 6. Configurer le salon vocal
```
/bankadmin setvocal #salon-vocal-économie
```
Le salon affichera : `🏦 BC : 1 000 000 Prex`

---

## 💰 Système monétaire

| Valeur | Prex |
|--------|------|
| 1 € | 1 000 Prex |
| 10 € | 10 000 Prex |
| 50 € | 50 000 Prex |
| 100 € | 100 000 Prex |

- Les **Prex** sont la monnaie de base (stockée en entiers)
- Les **euros** sont uniquement indicatifs (affichage)
- Toutes les commandes admin saisissent les montants **en Prex**

---

## 🏗️ Architecture

```
src/
├── commands/
│   ├── banque/           # Commandes utilisateurs
│   │   ├── bank.ts       # Tableau de bord
│   │   ├── balance.ts
│   │   ├── history.ts
│   │   ├── topbanque.ts  # Classement + banque centrale
│   │   ├── card.ts       # Carte bancaire RP
│   │   ├── boutique.ts
│   │   ├── buy.ts
│   │   └── help.ts       # Menu aide interactif
│   ├── admin/            # Commandes staff standalone
│   │   ├── addmoney.ts
│   │   ├── removemoney.ts
│   │   ├── transfer.ts
│   │   ├── reset.ts
│   │   ├── refund.ts
│   │   ├── shopadd.ts
│   │   ├── shopedit.ts
│   │   ├── shopremove.ts
│   │   ├── shoptoggle.ts
│   │   └── shopsales.ts
│   └── bankadmin/
│       └── bankadmin.ts  # /bankadmin init|addmoney|removemoney|transfer|logs|setvocal
│
├── events/
│   ├── ready.ts          # Init systèmes + salon vocal
│   ├── interactionCreate.ts
│   └── guildMemberAdd.ts # Création compte + carte auto
│
├── systems/
│   ├── bank/
│   │   ├── bankManager.ts        # Comptes (Prex)
│   │   ├── transactionManager.ts # Transactions (Prex)
│   │   ├── saveSystem.ts         # JSON atomique + backups
│   │   └── security.ts           # Anti-fraude, cooldowns
│   ├── economy/
│   │   └── centralBank.ts        # Banque centrale + salon vocal
│   ├── cards/
│   │   └── cardManager.ts        # Cartes bancaires RP
│   ├── shop/
│   │   ├── shopManager.ts
│   │   ├── itemManager.ts
│   │   └── purchaseManager.ts
│   ├── notifications/
│   │   └── notificationManager.ts # DMs automatiques
│   ├── logger/
│   │   └── logger.ts
│   └── cache/
│       └── cacheManager.ts
│
├── utils/
│   ├── embeds.ts         # Builders d'embeds (Prex)
│   ├── format.ts         # formatPrex, formatPrexWithEuro...
│   ├── validators.ts     # Validation montants Prex
│   └── permissions.ts
│
├── data/                 # Stockage JSON persistant
│   ├── accounts.json
│   ├── transactions.json
│   ├── purchases.json
│   ├── cards.json        # Cartes bancaires RP
│   ├── shop.json
│   ├── logs.json
│   ├── config.json       # Inclut centralBankReserve
│   └── backups/
│
├── types.ts
├── deploy-commands.ts
└── index.ts
```

---

## 🔊 Salon vocal économie

Le salon vocal est mis à jour automatiquement après chaque transaction.

**Format du nom :** `🏦 BC : 50 000 Prex`

> ⚠️ Discord limite les renommages à 2 fois toutes les 10 minutes.
> Le bot gère cela avec un debounce de 5 secondes.

### Configurer
```
/bankadmin setvocal #vocal-économie
```

---

## 💳 Cartes bancaires RP

Chaque joueur obtient automatiquement une carte à son arrivée sur le serveur.

- **Numéro** : généré depuis l'ID Discord (ex: `4837-1938`)
- **Statuts** : `✅ Active` | `🧊 Gelée` | `❌ Annulée`
- **Commandes** : `/card create` `/card info` `/card freeze`

---

## 📲 Notifications DM

Le bot envoie des DMs automatiques lors de :
- ✅ Ajout d'argent (crédit admin)
- 💸 Retrait d'argent (débit admin)
- 📥 Virement reçu
- 📤 Virement envoyé
- 🛒 Achat boutique confirmé
- ↩️ Remboursement reçu

> Les DMs sont silencieux si l'utilisateur les a désactivés.

---

## 🔐 Sécurité

- **Anti double-transaction** : lock 5s sur transactions identiques
- **Cooldowns** : par commande et par utilisateur
- **Anti-solde négatif** : validation stricte avant chaque débit
- **Queue d'écriture JSON** : écriture atomique, zéro race condition
- **Backups automatiques** : toutes les heures, rotation 10 derniers
- **Permissions staff** : vérification rôles sur toutes les commandes admin

---

## ⚙️ Configuration `data/config.json`

```json
{
  "startingBalance": 0,
  "currency": "Prex",
  "currencyName": "Prex",
  "bankName": "KT Banque",
  "prexPerEuro": 1000,
  "maxTransactionAmount": 999999999,
  "cooldowns": {
    "balance": 3,
    "history": 5,
    "boutique": 3,
    "buy": 10,
    "topbanque": 5,
    "card": 5
  },
  "adminRoles": ["ROLE_ID_ADMIN"],
  "staffRoles": ["ROLE_ID_STAFF"],
  "voiceChannelId": "ID_SALON_VOCAL",
  "centralBankReserve": 1000000
}
```

---

## 📜 Licence

Projet privé — kitotake. Tous droits réservés.
