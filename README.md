# 🏦 KT Banque — Bot Discord RP Bancaire

Bot Discord complet de gestion bancaire RP, développé en **TypeScript** avec **Discord.js v14**.

---

## ✨ Fonctionnalités

### 👤 Commandes Utilisateurs
| Commande | Description |
|----------|-------------|
| `/balance` | Affiche votre solde bancaire et statistiques |
| `/history` | Historique paginé de vos transactions |
| `/boutique` | Parcourir la boutique RP par catégorie |
| `/buy <item_id>` | Acheter un article (avec confirmation) |

### 🔧 Commandes Admin (Staff uniquement)
| Commande | Description |
|----------|-------------|
| `/addmoney` | Ajouter de l'argent à un compte |
| `/removemoney` | Retirer de l'argent d'un compte |
| `/transfer` | Virement entre deux comptes |
| `/reset` | Remettre un compte à 0€ |
| `/shopadd` | Créer un article boutique |
| `/shopedit` | Modifier un article existant |
| `/shopremove` | Supprimer définitivement un article |
| `/shoptoggle` | Activer / désactiver un article |
| `/shopsales` | Statistiques des ventes |
| `/refund` | Rembourser un achat |

---

## 🚀 Installation

### Prérequis
- Node.js **≥ 18.0.0**
- npm ou yarn
- Un bot Discord créé sur le [Portail Développeur Discord](https://discord.com/developers/applications)

### 1. Cloner et installer
```bash
cd kt_banque_bot
npm install
```

### 2. Configurer le `.env`
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
# Développement (ts-node)
npm run dev

# Production (compiler puis lancer)
npm run build
npm start
```

---

## 🏗️ Architecture

```
src/
├── commands/
│   ├── banque/          # Commandes utilisateurs
│   │   ├── balance.ts
│   │   ├── history.ts
│   │   ├── boutique.ts
│   │   └── buy.ts
│   └── admin/           # Commandes staff uniquement
│       ├── addmoney.ts
│       ├── removemoney.ts
│       ├── transfer.ts
│       ├── reset.ts
│       ├── shopadd.ts
│       ├── shopedit.ts
│       ├── shopremove.ts
│       ├── shoptoggle.ts
│       ├── shopsales.ts
│       └── refund.ts
│
├── events/
│   ├── ready.ts
│   ├── interactionCreate.ts
│   └── guildMemberAdd.ts
│
├── systems/
│   ├── bank/
│   │   ├── bankManager.ts       # Gestion des comptes
│   │   ├── transactionManager.ts # Transactions
│   │   ├── saveSystem.ts        # Persistence JSON robuste
│   │   └── security.ts          # Anti-fraude, cooldowns
│   ├── shop/
│   │   ├── shopManager.ts       # CRUD articles
│   │   ├── itemManager.ts       # Façade
│   │   └── purchaseManager.ts   # Achats & remboursements
│   ├── logger/
│   │   └── logger.ts            # Logs Discord & fichier
│   └── cache/
│       └── cacheManager.ts      # Cache LRU mémoire
│
├── utils/
│   ├── embeds.ts        # Builders d'embeds Discord
│   ├── format.ts        # Formatage monnaie/dates
│   ├── validators.ts    # Validation des entrées
│   └── permissions.ts   # Helpers permissions
│
├── data/                # Stockage JSON persistant
│   ├── accounts.json
│   ├── transactions.json
│   ├── purchases.json
│   ├── shop.json
│   ├── logs.json
│   ├── config.json
│   └── backups/         # Backups automatiques
│
├── types.ts             # Types & interfaces TypeScript
├── deploy-commands.ts   # Script déploiement slash
└── index.ts             # Point d'entrée
```

---

## ⚙️ Configuration `data/config.json`

```json
{
  "startingBalance": 0,
  "currency": "€",
  "currencyName": "Euro RP",
  "bankName": "KT Banque",
  "maxTransactionAmount": 10000000,
  "cooldowns": {
    "balance": 3,
    "history": 5,
    "boutique": 3,
    "buy": 10
  },
  "adminRoles": ["ROLE_ID_1", "ROLE_ID_2"],
  "staffRoles": ["ROLE_ID_3"]
}
```

> **Note** : Les administrateurs Discord (permission `Administrator`) ont toujours accès aux commandes admin, même sans rôle configuré.

---

## 🔐 Sécurité

- **Anti double-transaction** : lock de 5s sur les transactions identiques
- **Cooldowns** : limitation par commande et par utilisateur
- **Anti-solde négatif** : validation stricte avant chaque débit
- **Queue d'écriture JSON** : écriture atomique, pas de race condition
- **Backups automatiques** : sauvegarde horaire, restauration en cas de corruption
- **Validation des entrées** : tous les inputs sont validés côté serveur
- **Permissions staff** : toutes les commandes admin vérifient les rôles

---

## 💾 Système de données

Les montants sont stockés en **centimes** (entiers) pour éviter les problèmes de virgule flottante.

- `1500` en base = `15,00€` affiché
- `11990` en base = `119,90€` affiché

### Exemple d'article boutique
```json
{
  "id": "netflix_premium",
  "name": "Abonnement Netflix Premium",
  "price": 1199,
  "category": "Abonnements",
  "description": "Netflix Premium 30 jours",
  "enabled": true,
  "stock": -1,
  "createdBy": "DISCORD_ID",
  "createdAt": 1700000000000,
  "salesCount": 0,
  "totalRevenue": 0
}
```

---

## 📋 Logs Discord

Deux salons de logs distincts :

**LOG_CHANNEL** (transactions économiques) :
- 💰 Ajouts d'argent
- 💸 Retraits d'argent
- 🔄 Virements
- 🛒 Achats boutique
- ↩️ Remboursements

**LOG2_CHANNEL** (système & admin) :
- 🔧 Actions admin (reset, shop...)
- ⚠️ Erreurs système
- 🚨 Tentatives de fraude

---

## 🛡️ Intents Discord requis

Dans le Portail Développeur, activer :
- ✅ **Server Members Intent** (pour `guildMemberAdd`)
- ✅ **Message Content Intent** (optionnel, non utilisé actuellement)

---

## 📜 Licence

Projet privé — kitotake. Tous droits réservés.
