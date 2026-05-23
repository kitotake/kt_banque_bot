// ============================================================
// KT Banque - /boutique (Prex)
// ============================================================

import {
  ChatInputCommandInteraction, SlashCommandBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ComponentType,
} from 'discord.js';
import { Command } from '../../types';
import { getCategories, getItemsByCategory, getEnabledItems } from '../../systems/shop/shopManager';
import { checkCooldown } from '../../systems/bank/security';
import { shopListEmbed, errorEmbed, infoEmbed } from '../../utils/embeds';
import { paginate } from '../../utils/format';

const PAGE_SIZE = 4;

export const command: Command = {
  data: new SlashCommandBuilder()
    .setName('boutique')
    .setDescription('🏪 Parcourir la boutique RP KT Banque'),

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const cooldown = checkCooldown(interaction.user.id, 'boutique', 3);
    if (cooldown) {
      await interaction.reply({ embeds: [errorEmbed('Cooldown', cooldown)], ephemeral: true });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      const categories = await getCategories();

      if (categories.length === 0) {
        await interaction.editReply({ embeds: [infoEmbed('Boutique vide', 'Aucun article disponible.')] });
        return;
      }

      let selectedCategory = categories[0];
      let page = 1;

      const buildReply = async () => {
        const items = await getItemsByCategory(selectedCategory);
        const allItems = await getEnabledItems();
        const paged = paginate(items, page, PAGE_SIZE);

        const embed = shopListEmbed({
          category: selectedCategory,
          items: paged.items,
          page: paged.page,
          pages: paged.pages,
          totalItems: paged.total,
        });

        const categorySelect = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('shop_category')
            .setPlaceholder('📂 Choisir une catégorie')
            .addOptions(categories.map(cat => {
              const count = allItems.filter(i => i.category === cat).length;
              return { label: cat, description: `${count} article${count > 1 ? 's' : ''}`, value: cat, default: cat === selectedCategory };
            }))
        );

        const navRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId('shop_prev').setLabel('◀').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
          new ButtonBuilder().setCustomId('shop_next').setLabel('▶').setStyle(ButtonStyle.Secondary).setDisabled(page >= paged.pages)
        );

        return { embed, components: paged.pages > 1 ? [categorySelect, navRow] : [categorySelect] };
      };

      const { embed, components } = await buildReply();
      const response = await interaction.editReply({ embeds: [embed], components });

      const collector = response.createMessageComponentCollector({
        time: 120_000,
        filter: i => i.user.id === interaction.user.id,
      });

      collector.on('collect', async i => {
        if (i.componentType === ComponentType.StringSelect && i.customId === 'shop_category') {
          selectedCategory = i.values[0];
          page = 1;
        } else if (i.componentType === ComponentType.Button) {
          if (i.customId === 'shop_prev') page = Math.max(1, page - 1);
          if (i.customId === 'shop_next') page++;
        }
        const { embed: newEmbed, components: newComponents } = await buildReply();
        await i.update({ embeds: [newEmbed], components: newComponents });
      });

      collector.on('end', async () => {
        await interaction.editReply({ components: [] }).catch(() => {});
      });
    } catch (err) {
      console.error('[/boutique]', err);
      await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Impossible de charger la boutique.')] });
    }
  },
};
