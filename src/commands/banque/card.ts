// ============================================================
// KT Banque - /card
// Sous-commandes : create, info, freeze
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { createCard, getCard, getOrCreateCard, toggleFreezeCard } from '../../systems/cards/cardManager';
import { getOrCreateAccount } from '../../systems/bank/bankManager';
import { checkCooldown } from '../../systems/bank/security';
import { cardEmbed, successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('💳 Gérer votre carte bancaire KT Banque')
    .addSubcommand(sub =>
      sub.setName('create').setDescription('Créer votre carte KT Banque')
    )
    .addSubcommand(sub =>
      sub.setName('info').setDescription('Afficher votre carte et votre solde')
    )
    .addSubcommand(sub =>
      sub.setName('freeze').setDescription('Geler ou dégeler votre carte')
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const cooldown = checkCooldown(interaction.user.id, 'card', 5);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'create': await handleCreate(interaction); break;
      case 'info': await handleInfo(interaction); break;
      case 'freeze': await handleFreeze(interaction); break;
    }
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await createCard(interaction.user.id, interaction.user.username);

    if (!result.success || !result.data) {
      await interaction.editReply({ embeds: [errorEmbed('Carte existante', result.error ?? 'Erreur.')] });
      return;
    }

    const account = await getOrCreateAccount(interaction.user.id, interaction.user.username);
    const embed = cardEmbed(result.data, account.bank);
    embed.setTitle('✅ Carte créée avec succès');

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[/card create]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Création échouée.')] });
  }
}

async function handleInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const card = await getCard(interaction.user.id);

    if (!card) {
      await interaction.editReply({
        embeds: [infoEmbed('Aucune carte', 'Vous n\'avez pas encore de carte KT Banque.\nUtilisez `/card create` pour en obtenir une.')],
      });
      return;
    }

    const account = await getOrCreateAccount(interaction.user.id, interaction.user.username);
    await interaction.editReply({ embeds: [cardEmbed(card, account.bank)] });
  } catch (err) {
    console.error('[/card info]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Impossible d\'afficher la carte.')] });
  }
}

async function handleFreeze(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply({ ephemeral: true });

  try {
    const result = await toggleFreezeCard(interaction.user.id);

    if (!result.success || !result.data) {
      await interaction.editReply({ embeds: [errorEmbed('Erreur', result.error ?? 'Erreur interne.')] });
      return;
    }

    const card = result.data;
    const frozen = card.status === 'FROZEN';
    const account = await getOrCreateAccount(interaction.user.id, interaction.user.username);

    const embed = cardEmbed(card, account.bank);
    embed.setTitle(frozen ? '🧊 Carte gelée' : '✅ Carte dégelée');
    embed.setDescription(
      frozen
        ? 'Votre carte a été **gelée**. Aucune transaction ne sera possible jusqu\'au dégel.'
        : 'Votre carte a été **réactivée**. Vous pouvez de nouveau effectuer des transactions.'
    );

    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[/card freeze]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Opération échouée.')] });
  }
}
