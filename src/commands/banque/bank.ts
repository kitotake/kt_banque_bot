// ============================================================
// KT Banque - /bank
// Tableau de bord complet : solde, carte, historique rapide
// ============================================================

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
} from 'discord.js';
import { Command } from '../../types';
import { getOrCreateAccount } from '../../systems/bank/bankManager';
import { getUserHistory } from '../../systems/bank/transactionManager';
import { getCard } from '../../systems/cards/cardManager';
import { getCentralReserve } from '../../systems/economy/centralBank';
import { checkCooldown } from '../../systems/bank/security';
import { errorEmbed, Colors } from '../../utils/embeds';
import { formatPrex, formatPrexWithEuro, transactionEmoji, transactionLabel } from '../../utils/format';
import { cardStatusLabel } from '../../systems/cards/cardManager';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('bank')
    .setDescription('🏦 Tableau de bord de votre compte KT Banque'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const cooldown = checkCooldown(interaction.user.id, 'balance', 3);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const [account, histResult, card, centralReserve] = await Promise.all([
        getOrCreateAccount(interaction.user.id, interaction.user.username),
        getUserHistory(interaction.user.id, 1, 3),
        getCard(interaction.user.id),
        getCentralReserve(),
      ]);

      // ── Embed principal ──────────────────────────────────────
      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle('🏦 KT Banque — Mon compte')
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          {
            name: '👤 Titulaire',
            value: interaction.user.displayName ?? interaction.user.username,
            inline: true,
          },
          {
            name: '💰 Solde',
            value: `**${formatPrexWithEuro(account.bank)}**`,
            inline: true,
          },
          {
            name: '💳 Carte',
            value: card ? `\`${card.id}\` — ${cardStatusLabel(card.status)}` : '❌ Aucune carte\n`/card create`',
            inline: true,
          },
          {
            name: '🏦 Banque Centrale',
            value: formatPrex(centralReserve),
            inline: true,
          },
          {
            name: '📅 Compte ouvert',
            value: `<t:${Math.floor(account.createdAt / 1000)}:D>`,
            inline: true,
          },
          {
            name: '📊 Transactions',
            value: `${histResult.total}`,
            inline: true,
          },
        )
        .setFooter({ text: 'KT Banque • Système Bancaire RP' })
        .setTimestamp();

      // ── 3 dernières transactions ─────────────────────────────
      if (histResult.transactions.length > 0) {
        const positiveTypes = ['ADD', 'TRANSFER_IN', 'REFUND', 'ACCOUNT_CREATED'];
        const lines = histResult.transactions.map(tx => {
          const positive = positiveTypes.includes(tx.type);
          const sign = positive ? '+' : '-';
          const time = `<t:${Math.floor(tx.timestamp / 1000)}:R>`;
          return `${transactionEmoji(tx.type)} ${transactionLabel(tx.type)} • ${sign}${Math.abs(tx.amount).toLocaleString('fr-FR')} Prex • ${time}`;
        }).join('\n');

        embed.addFields({ name: '🕐 Dernières transactions', value: lines, inline: false });
      }

      // ── Boutons rapides ──────────────────────────────────────
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('bank_history').setLabel('📋 Historique').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('bank_card').setLabel('💳 Ma carte').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('bank_top').setLabel('🏆 Classement').setStyle(ButtonStyle.Secondary),
      );

      const response = await interaction.editReply({ embeds: [embed], components: [row] });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60_000,
        filter: i => i.user.id === interaction.user.id,
      });

      collector.on('collect', async i => {
        if (i.customId === 'bank_history') {
          await i.reply({ content: '> Utilisez `/history` pour votre historique complet.', ephemeral: true });
        } else if (i.customId === 'bank_card') {
          await i.reply({ content: '> Utilisez `/card info` pour voir votre carte.', ephemeral: true });
        } else if (i.customId === 'bank_top') {
          await i.reply({ content: '> Utilisez `/topbanque` pour voir le classement.', ephemeral: true });
        }
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error('[/bank]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Impossible de charger votre compte.')] });
    }
  },
};
