// ============================================================
// KT Banque - /shopedit (admin) - Prex
// ============================================================
import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { editItem, getItemById } from '../../systems/shop/shopManager';
import { logAdminAction } from '../../systems/logger/logger';
import { successEmbed, errorEmbed, shopItemEmbed } from '../../utils/embeds';
import { validateAndParseAmount, validateItemName, validateItemDescription, validateCategory, validateStock } from '../../utils/validators';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('shopedit')
    .setDescription('✏️ [ADMIN] Modifier un article de la boutique')
    .addStringOption(opt => opt.setName('id').setDescription('ID de l\'article').setRequired(true))
    .addStringOption(opt => opt.setName('nom').setDescription('Nouveau nom'))
    .addIntegerOption(opt => opt.setName('prix').setDescription('Nouveau prix en Prex').setMinValue(1))
    .addStringOption(opt => opt.setName('categorie').setDescription('Nouvelle catégorie'))
    .addStringOption(opt => opt.setName('description').setDescription('Nouvelle description'))
    .addIntegerOption(opt => opt.setName('stock').setDescription('Nouveau stock (-1 = illimité)').setMinValue(-1)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;
    const id = interaction.options.getString('id', true).trim();
    const newName = interaction.options.getString('nom');
    const newPrice = interaction.options.getInteger('prix');
    const newCategory = interaction.options.getString('categorie');
    const newDescription = interaction.options.getString('description');
    const newStock = interaction.options.getInteger('stock');

    if (!newName && !newPrice && !newCategory && !newDescription && newStock === null) {
      await interaction.reply({ embeds: [errorEmbed('Erreur', 'Spécifiez au moins un champ à modifier.')], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const existing = await getItemById(id);
      if (!existing) { await interaction.editReply({ embeds: [errorEmbed('Introuvable', `Aucun article \`${id}\`.`)] }); return; }

      const updates: Record<string, unknown> = {};
      if (newName) { const e = validateItemName(newName); if (e) { await interaction.editReply({ embeds: [errorEmbed('Nom invalide', e)] }); return; } updates.name = newName.trim(); }
      if (newPrice) { const c = validateAndParseAmount(newPrice); if (!c.ok) { await interaction.editReply({ embeds: [errorEmbed('Prix invalide', c.error)] }); return; } updates.price = c.prex; }
      if (newCategory) { const e = validateCategory(newCategory); if (e) { await interaction.editReply({ embeds: [errorEmbed('Catégorie invalide', e)] }); return; } updates.category = newCategory.trim(); }
      if (newDescription) { const e = validateItemDescription(newDescription); if (e) { await interaction.editReply({ embeds: [errorEmbed('Description invalide', e)] }); return; } updates.description = newDescription.trim(); }
      if (newStock !== null) { const e = validateStock(newStock); if (e) { await interaction.editReply({ embeds: [errorEmbed('Stock invalide', e)] }); return; } updates.stock = newStock; }

      const result = await editItem(id, updates as Parameters<typeof editItem>[1]);
      if (!result.success || !result.data) { await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur.')] }); return; }

      const previewEmbed = shopItemEmbed(result.data);
      previewEmbed.setTitle(`✅ Article modifié — ${result.data.name}`);
      await interaction.editReply({ embeds: [previewEmbed] });
      await logAdminAction('SHOP_EDIT', `Article modifié: ${result.data.name} (${id})`, interaction.user.username, interaction.user.id, { itemId: id, updates }).catch(console.error);
    } catch (err) {
      console.error('[/shopedit]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Modification échouée.')] });
    }
  },
};
