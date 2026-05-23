// ============================================================
// KT Banque - Commande Admin /shopedit
// Modifier un article de la boutique
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
    .addStringOption(opt => opt.setName('id').setDescription('ID de l\'article à modifier').setRequired(true))
    .addStringOption(opt => opt.setName('nom').setDescription('Nouveau nom').setRequired(false))
    .addIntegerOption(opt => opt.setName('prix').setDescription('Nouveau prix en euros').setRequired(false).setMinValue(1))
    .addStringOption(opt => opt.setName('categorie').setDescription('Nouvelle catégorie').setRequired(false))
    .addStringOption(opt => opt.setName('description').setDescription('Nouvelle description').setRequired(false))
    .addIntegerOption(opt => opt.setName('stock').setDescription('Nouveau stock (-1 = illimité)').setRequired(false).setMinValue(-1)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const id = interaction.options.getString('id', true).trim();
    const newName = interaction.options.getString('nom');
    const newPrice = interaction.options.getInteger('prix');
    const newCategory = interaction.options.getString('categorie');
    const newDescription = interaction.options.getString('description');
    const newStock = interaction.options.getInteger('stock');

    // Au moins un champ à modifier
    if (!newName && !newPrice && !newCategory && !newDescription && newStock === null) {
      await interaction.reply({ embeds: [errorEmbed('Erreur', 'Spécifiez au moins un champ à modifier.')], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const existing = await getItemById(id);
      if (!existing) {
        await interaction.editReply({ embeds: [errorEmbed('Introuvable', `Aucun article avec l'ID \`${id}\`.`)] });
        return;
      }

      // Construire les mises à jour
      const updates: Record<string, unknown> = {};
      if (newName) {
        const err = validateItemName(newName);
        if (err) { await interaction.editReply({ embeds: [errorEmbed('Nom invalide', err)] }); return; }
        updates.name = newName.trim();
      }
      if (newPrice) {
        const check = validateAndParseAmount(newPrice);
        if (!check.ok) { await interaction.editReply({ embeds: [errorEmbed('Prix invalide', check.error)] }); return; }
        updates.price = check.cents;
      }
      if (newCategory) {
        const err = validateCategory(newCategory);
        if (err) { await interaction.editReply({ embeds: [errorEmbed('Catégorie invalide', err)] }); return; }
        updates.category = newCategory.trim();
      }
      if (newDescription) {
        const err = validateItemDescription(newDescription);
        if (err) { await interaction.editReply({ embeds: [errorEmbed('Description invalide', err)] }); return; }
        updates.description = newDescription.trim();
      }
      if (newStock !== null) {
        const err = validateStock(newStock);
        if (err) { await interaction.editReply({ embeds: [errorEmbed('Stock invalide', err)] }); return; }
        updates.stock = newStock;
      }

      const result = await editItem(id, updates as Parameters<typeof editItem>[1]);
      if (!result.success || !result.data) {
        await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur.')] });
        return;
      }

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
