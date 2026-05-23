// ============================================================
// KT Banque - /help (complet)
// ============================================================

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { Colors } from '../../utils/embeds';

type HelpCategory = 'home' | 'bank' | 'card' | 'shop' | 'admin' | 'central';

function helpMainEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(Colors.PRIMARY)
    .setTitle('🏦 KT Banque — Aide')
    .setDescription(
      `Bienvenue sur **KT Banque**, le système bancaire RP du serveur.\n\n` +
      `La monnaie du serveur est le **Prex** *(1 000 Prex = 1 €)*.\n\n` +
      `Sélectionnez une catégorie ci-dessous pour voir les commandes disponibles.`
    )
    .addFields(
      { name: '💰 Banque',         value: 'Solde, historique, classement, tableau de bord', inline: true },
      { name: '💳 Carte',          value: 'Créer, consulter, geler votre carte',             inline: true },
      { name: '🛒 Boutique',       value: 'Parcourir les articles et acheter',               inline: true },
      { name: '🔧 Admin — Comptes',value: 'Gérer les Prex des joueurs (staff)',              inline: true },
      { name: '🏦 Admin — Banque', value: 'Banque centrale, logs, salon vocal (staff)',      inline: true },
    )
    .setFooter({ text: 'KT Banque • Système Bancaire RP' })
    .setTimestamp();
}

function helpCategoryEmbed(category: HelpCategory): EmbedBuilder {
  const configs: Record<HelpCategory, { color: number; title: string; fields: { name: string; value: string; inline: boolean }[] }> = {
    home: { color: Colors.PRIMARY, title: '', fields: [] }, // unused

    bank: {
      color: Colors.PRIMARY,
      title: '💰 Commandes Banque',
      fields: [
        { name: '/bank',      value: 'Tableau de bord complet : solde, carte, dernières transactions, boutons rapides', inline: false },
        { name: '/balance',   value: 'Affiche votre solde actuel en Prex et son équivalent en euros',                   inline: false },
        { name: '/history',   value: 'Historique paginé de toutes vos transactions (8 par page)',                       inline: false },
        { name: '/topbanque', value: 'Classement des 10 joueurs les plus riches + réserve de la banque centrale',       inline: false },
      ],
    },

    card: {
      color: Colors.TEAL,
      title: '💳 Commandes Carte',
      fields: [
        { name: '/card create', value: 'Crée votre carte bancaire KT Banque (numéro unique généré depuis votre ID Discord)', inline: false },
        { name: '/card info',   value: 'Affiche votre carte virtuelle avec statut et solde',                               inline: false },
        { name: '/card freeze', value: 'Gèle ou dégèle votre carte (carte gelée = aucune transaction possible)',            inline: false },
      ],
    },

    shop: {
      color: Colors.PURPLE,
      title: '🛒 Commandes Boutique',
      fields: [
        { name: '/boutique',       value: 'Parcourir la boutique par catégorie avec pagination. Utilisez le menu déroulant pour changer de catégorie.', inline: false },
        { name: '/buy <item_id>',  value: 'Acheter un article via son ID (visible dans `/boutique`). Un message de confirmation s\'affiche avant le débit.', inline: false },
      ],
    },

    admin: {
      color: Colors.GOLD,
      title: '🔧 Admin — Gestion des comptes',
      fields: [
        { name: '/addmoney <utilisateur> <montant> <raison>',                                value: 'Ajouter des Prex au compte d\'un joueur. La banque centrale n\'est pas affectée.',           inline: false },
        { name: '/removemoney <utilisateur> <montant> <raison>',                             value: 'Retirer des Prex du compte d\'un joueur. Échoue si le solde est insuffisant.',              inline: false },
        { name: '/transfer <source> <destination> <montant> <motif>',                        value: 'Virement direct entre deux joueurs sans passer par la banque centrale.',                     inline: false },
        { name: '/reset <utilisateur>',                                                       value: 'Remettre le compte d\'un joueur à 0 Prex (confirmation requise).',                          inline: false },
        { name: '/refund <utilisateur> <achat_id>',                                          value: 'Rembourser un achat boutique. L\'ID de l\'achat est visible dans `/history` du joueur.',   inline: false },
        { name: '/shopadd <id> <nom> <prix> <catégorie> <description> [stock]',             value: 'Créer un nouvel article dans la boutique. Stock -1 = illimité.',                           inline: false },
        { name: '/shopedit <id> [nom] [prix] [catégorie] [description] [stock]',            value: 'Modifier un article existant (un seul champ suffit).',                                      inline: false },
        { name: '/shopremove <id>',                                                          value: 'Supprimer définitivement un article (confirmation requise).',                              inline: false },
        { name: '/shoptoggle <id>',                                                          value: 'Activer ou désactiver la visibilité d\'un article dans la boutique.',                      inline: false },
        { name: '/shopsales',                                                                value: 'Statistiques globales des ventes : revenus totaux, nombre de ventes, top 5 articles.',     inline: false },
      ],
    },

    central: {
      color: Colors.INFO,
      title: '🏦 Admin — Banque Centrale',
      fields: [
        { name: '/bankadmin init <montant>',                       value: 'Initialise la réserve de la banque centrale à un montant précis (en Prex). Les soldes joueurs ne changent pas.',      inline: false },
        { name: '/bankadmin addmoney <utilisateur> <montant> <raison>',    value: 'Identique à `/addmoney` — ajouter des Prex à un joueur.',                                                    inline: false },
        { name: '/bankadmin removemoney <utilisateur> <montant> <raison>', value: 'Identique à `/removemoney` — retirer des Prex à un joueur.',                                                 inline: false },
        { name: '/bankadmin transfer <source> <destination> <montant> <motif>', value: 'Identique à `/transfer` — virement entre joueurs.',                                                     inline: false },
        { name: '/bankadmin deposit <utilisateur> <montant> <raison>',    value: 'Débite un joueur ET crédite la banque centrale du même montant. Utile pour les taxes, amendes, etc.',        inline: false },
        { name: '/bankadmin withdraw <utilisateur> <montant> <raison>',   value: 'Débite la banque centrale ET crédite un joueur. Vérifie que la réserve est suffisante avant le paiement.',   inline: false },
        { name: '/bankadmin logs [limite]',                                value: 'Affiche les N derniers logs système (défaut: 10, max: 25). Tous les logs sont stockés en base de données.',  inline: false },
        { name: '/bankadmin setvocal <salon>',                             value: 'Définit le salon vocal qui affichera automatiquement la réserve de la BC (format : 🏦 BC : X Prex).',       inline: false },
      ],
    },
  };

  const cfg = configs[category];
  return new EmbedBuilder()
    .setColor(cfg.color)
    .setTitle(cfg.title)
    .addFields(cfg.fields)
    .setFooter({ text: 'KT Banque • Système Bancaire RP' })
    .setTimestamp();
}

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('❓ Afficher l\'aide et les commandes KT Banque'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const buildButtons = (active: HelpCategory) =>
      [
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('help_home').setLabel('🏠 Accueil').setStyle(active === 'home' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('help_bank').setLabel('💰 Banque').setStyle(active === 'bank' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('help_card').setLabel('💳 Carte').setStyle(active === 'card' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('help_shop').setLabel('🛒 Boutique').setStyle(active === 'shop' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        ),
        new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('help_admin').setLabel('🔧 Admin Comptes').setStyle(active === 'admin' ? ButtonStyle.Primary : ButtonStyle.Secondary),
          new ButtonBuilder().setCustomId('help_central').setLabel('🏦 Admin Banque').setStyle(active === 'central' ? ButtonStyle.Primary : ButtonStyle.Secondary),
        ),
      ];

    const response = await interaction.reply({
      embeds: [helpMainEmbed()],
      components: buildButtons('home'),
      ephemeral: true,
      fetchReply: true,
    });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120_000,
      filter: i => i.user.id === interaction.user.id,
    });

    collector.on('collect', async i => {
      const cat = i.customId.replace('help_', '') as HelpCategory;
      if (cat === 'home') {
        await i.update({ embeds: [helpMainEmbed()], components: buildButtons('home') });
      } else {
        await i.update({ embeds: [helpCategoryEmbed(cat)], components: buildButtons(cat) });
      }
    });

    collector.on('end', async () => {
      await interaction.editReply({ components: [] }).catch(() => {});
    });
  },
};
