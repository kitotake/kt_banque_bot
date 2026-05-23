// ============================================================
// KT Banque - Commande Admin /shoptoggle
// Activer ou désactiver un article de la boutique
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { toggleItem } from '../../systems/shop/shopManager';
import { logAdminAction } from '../../systems/logger/logger';
import { successEmbed, errorEmbed } from '../../utils/embeds';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('shoptoggle')
    .setDescription('🔘 [ADMIN] Activer ou désactiver un article de la boutique')
    .addStringOption(opt =>
      opt.setName('id').setDescription('ID de l\'article').setRequired(true)
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const id = interaction.options.getString('id', true).trim();
    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await toggleItem(id);

      if (!result.success || !result.data) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Article introuvable.')] });
        return;
      }

      const item = result.data;
      const status = item.enabled ? '✅ Activé' : '❌ Désactivé';

      await interaction.editReply({
        embeds: [successEmbed(
          `Article ${item.enabled ? 'activé' : 'désactivé'}`,
          `**${item.name}** est maintenant **${status}**.\n\n🔖 ID: \`${item.id}\``
        )],
      });

      await logAdminAction('SHOP_TOGGLE', `Article ${item.enabled ? 'activé' : 'désactivé'}: ${item.name}`, interaction.user.username, interaction.user.id, { itemId: id, enabled: item.enabled }).catch(console.error);
    } catch (err) {
      console.error('[/shoptoggle]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Opération échouée.')] });
    }
  },
};
