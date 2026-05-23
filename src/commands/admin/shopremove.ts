// ============================================================
// KT Banque - Commande Admin /shopremove
// Supprimer définitivement un article de la boutique
// ============================================================

import {
  ChatInputCommandInteraction, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType,
} from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { getItemById, removeItem } from '../../systems/shop/shopManager';
import { logAdminAction } from '../../systems/logger/logger';
import { successEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('shopremove')
    .setDescription('🗑️ [ADMIN] Supprimer définitivement un article de la boutique')
    .addStringOption(opt =>
      opt.setName('id').setDescription('ID de l\'article à supprimer').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const id = interaction.options.getString('id', true).trim();
    await interaction.deferReply({ ephemeral: true });

    try {
      const item = await getItemById(id);
      if (!item) {
        await interaction.editReply({ embeds: [errorEmbed('Introuvable', `Aucun article \`${id}\`.`)] });
        return;
      }

      const confirmEmbed = infoEmbed(
        'Confirmation requise',
        `Vous allez **supprimer définitivement** l'article **${item.name}**.\n\n🔖 ID: \`${item.id}\`\n🛒 Ventes: ${item.salesCount}\n\n⚠️ Cette action est **irréversible**.`
      );

      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setCustomId('del_confirm').setLabel('🗑️ Supprimer').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('del_cancel').setLabel('❌ Annuler').setStyle(ButtonStyle.Secondary)
      );

      const response = await interaction.editReply({ embeds: [confirmEmbed], components: [row] });
      const btn = await response.awaitMessageComponent({ componentType: ComponentType.Button, time: 20_000, filter: i => i.user.id === interaction.user.id }).catch(() => null);

      if (!btn || btn.customId === 'del_cancel') {
        await interaction.editReply({ embeds: [infoEmbed('Annulé', 'Suppression annulée.')], components: [] });
        return;
      }
      await btn.deferUpdate();

      const result = await removeItem(id);
      if (!result.success) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur.')], components: [] });
        return;
      }

      await interaction.editReply({ embeds: [successEmbed('Article supprimé', `L'article **${item.name}** a été supprimé définitivement.`)], components: [] });
      await logAdminAction('SHOP_REMOVE', `Article supprimé: ${item.name} (${id})`, interaction.user.username, interaction.user.id, { itemId: id }).catch(console.error);
    } catch (err) {
      console.error('[/shopremove]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Suppression échouée.')], components: [] });
    }
  },
};
