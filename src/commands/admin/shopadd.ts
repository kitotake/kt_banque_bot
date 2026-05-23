// ============================================================
// KT Banque - Commande Admin /shopadd
// Ajouter un article à la boutique RP
// ============================================================

import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { createItem } from '../../systems/shop/shopManager';
import { logAdminAction } from '../../systems/logger/logger';
import { successEmbed, errorEmbed, shopItemEmbed } from '../../utils/embeds';
import { validateAndParseAmount, validateItemName, validateItemDescription, validateCategory, validateStock } from '../../utils/validators';
import { validateItemId } from '../../systems/bank/security';
import { formatMoney } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('shopadd')
    .setDescription('🏪 [ADMIN] Ajouter un article à la boutique')
    .addStringOption(opt => opt.setName('id').setDescription('Identifiant unique (ex: netflix_premium)').setRequired(true))
    .addStringOption(opt => opt.setName('nom').setDescription('Nom affiché de l\'article').setRequired(true))
    .addIntegerOption(opt => opt.setName('prix').setDescription('Prix en euros').setRequired(true).setMinValue(1))
    .addStringOption(opt => opt.setName('categorie').setDescription('Catégorie (ex: Abonnements, VIP...)').setRequired(true))
    .addStringOption(opt => opt.setName('description').setDescription('Description complète de l\'article').setRequired(true))
    .addIntegerOption(opt => opt.setName('stock').setDescription('Stock (-1 = illimité, 0+ = limité)').setRequired(false).setMinValue(-1)) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;

    const id = interaction.options.getString('id', true).toLowerCase().trim().replace(/\s+/g, '_');
    const name = interaction.options.getString('nom', true).trim();
    const price = interaction.options.getInteger('prix', true);
    const category = interaction.options.getString('categorie', true).trim();
    const description = interaction.options.getString('description', true).trim();
    const stock = interaction.options.getInteger('stock') ?? -1;

    // Validations
    const idErr = validateItemId(id);
    if (idErr) { await interaction.reply({ embeds: [errorEmbed('ID invalide', idErr)], ephemeral: true }); return; }

    const nameErr = validateItemName(name);
    if (nameErr) { await interaction.reply({ embeds: [errorEmbed('Nom invalide', nameErr)], ephemeral: true }); return; }

    const priceCheck = validateAndParseAmount(price);
    if (!priceCheck.ok) { await interaction.reply({ embeds: [errorEmbed('Prix invalide', priceCheck.error)], ephemeral: true }); return; }

    const catErr = validateCategory(category);
    if (catErr) { await interaction.reply({ embeds: [errorEmbed('Catégorie invalide', catErr)], ephemeral: true }); return; }

    const descErr = validateItemDescription(description);
    if (descErr) { await interaction.reply({ embeds: [errorEmbed('Description invalide', descErr)], ephemeral: true }); return; }

    const stockErr = validateStock(stock);
    if (stockErr) { await interaction.reply({ embeds: [errorEmbed('Stock invalide', stockErr)], ephemeral: true }); return; }

    await interaction.deferReply({ ephemeral: true });

    try {
      const result = await createItem(id, name, priceCheck.cents, category, description, stock, interaction.user.id);

      if (!result.success || !result.data) {
        await interaction.editReply({ embeds: [errorEmbed('Création échouée', result.error ?? 'Erreur.')] });
        return;
      }

      const previewEmbed = shopItemEmbed(result.data);
      previewEmbed.setTitle(`✅ Article créé — ${result.data.name}`);

      await interaction.editReply({ embeds: [previewEmbed] });
      await logAdminAction('SHOP_ADD', `Nouvel article boutique: ${name} (${formatMoney(priceCheck.cents)})`, interaction.user.username, interaction.user.id, { itemId: id, price: priceCheck.cents, category }).catch(console.error);
    } catch (err) {
      console.error('[/shopadd]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Création échouée.')] });
    }
  },
};
