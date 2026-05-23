// ============================================================
// KT Banque - /bankadmin (MariaDB)
// Sous-commandes : init, addmoney, removemoney, transfer, logs, setvocal, deposit, withdraw
// ============================================================

import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';
import { Command } from '../../types';
import { requireStaff } from '../../systems/bank/security';
import { addMoney, removeMoney, transferMoney } from '../../systems/bank/transactionManager';
import { getAllAccounts } from '../../systems/bank/bankManager';
import { initCentralBankReserve, setVoiceChannelId, getCentralReserve, adjustCentralReserve } from '../../systems/economy/centralBank';
import { notifyAddMoney, notifyRemoveMoney, notifyTransferSent, notifyTransferReceived } from '../../systems/notifications/notificationManager';
import { logAddMoney, logRemoveMoney, logTransfer, logAdminAction, getRecentLogs } from '../../systems/logger/logger';
import { successEmbed, errorEmbed, infoEmbed, Colors } from '../../utils/embeds';
import { validateAndParseAmount, validateReason } from '../../utils/validators';
import { formatPrex, formatPrexWithEuro } from '../../utils/format';

export const command: Command = {
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('bankadmin')
    .setDescription('🔧 [ADMIN] Gestion de la banque KT')
    .addSubcommand(sub => sub.setName('init')
      .setDescription('Initialise la banque centrale avec une réserve')
      .addIntegerOption(opt => opt.setName('montant').setDescription('Réserve en Prex').setRequired(true).setMinValue(0))
    )
    .addSubcommand(sub => sub.setName('addmoney')
      .setDescription('Ajouter des Prex au compte d\'un joueur')
      .addUserOption(opt => opt.setName('utilisateur').setDescription('Joueur bénéficiaire').setRequired(true))
      .addIntegerOption(opt => opt.setName('montant').setDescription('Montant en Prex').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('raison').setDescription('Motif').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('removemoney')
      .setDescription('Retirer des Prex du compte d\'un joueur')
      .addUserOption(opt => opt.setName('utilisateur').setDescription('Joueur concerné').setRequired(true))
      .addIntegerOption(opt => opt.setName('montant').setDescription('Montant en Prex').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('raison').setDescription('Motif').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('transfer')
      .setDescription('Virement entre deux joueurs')
      .addUserOption(opt => opt.setName('source').setDescription('Compte à débiter').setRequired(true))
      .addUserOption(opt => opt.setName('destination').setDescription('Compte à créditer').setRequired(true))
      .addIntegerOption(opt => opt.setName('montant').setDescription('Montant en Prex').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('motif').setDescription('Motif du virement').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('logs')
      .setDescription('Afficher les derniers logs système')
      .addIntegerOption(opt => opt.setName('limite').setDescription('Nombre de logs (défaut: 10)').setMinValue(1).setMaxValue(25))
    )
    .addSubcommand(sub => sub.setName('setvocal')
      .setDescription('Définir le salon vocal pour l\'affichage de la banque centrale')
      .addChannelOption(opt => opt.setName('salon').setDescription('Salon vocal économie').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('deposit')
      .setDescription('Retirer des Prex d\'un joueur → Banque Centrale')
      .addUserOption(opt => opt.setName('utilisateur').setDescription('Joueur à débiter').setRequired(true))
      .addIntegerOption(opt => opt.setName('montant').setDescription('Montant en Prex').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('raison').setDescription('Motif').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('withdraw')
      .setDescription('Retirer des Prex de la Banque Centrale → joueur')
      .addUserOption(opt => opt.setName('utilisateur').setDescription('Joueur à créditer').setRequired(true))
      .addIntegerOption(opt => opt.setName('montant').setDescription('Montant en Prex').setRequired(true).setMinValue(1))
      .addStringOption(opt => opt.setName('raison').setDescription('Motif').setRequired(true))
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    if (!(await requireStaff(interaction))) return;
    const sub = interaction.options.getSubcommand();
    switch (sub) {
      case 'init':        await handleInit(interaction);        break;
      case 'addmoney':    await handleAddMoney(interaction);    break;
      case 'removemoney': await handleRemoveMoney(interaction); break;
      case 'transfer':    await handleTransfer(interaction);    break;
      case 'logs':        await handleLogs(interaction);        break;
      case 'setvocal':    await handleSetVocal(interaction);    break;
      case 'deposit':     await handleDeposit(interaction);     break;
      case 'withdraw':    await handleWithdraw(interaction);    break;
    }
  },
};

// ─── Handlers ────────────────────────────────────────────────

async function handleInit(interaction: ChatInputCommandInteraction): Promise<void> {
  const amount = interaction.options.getInteger('montant', true);
  await interaction.deferReply({ ephemeral: true });
  try {
    await initCentralBankReserve(amount);
    const accounts = await getAllAccounts();
    await interaction.editReply({ embeds: [successEmbed('Banque initialisée',
      `**🏦 Banque Centrale**\n${formatPrexWithEuro(amount)}\n\n**👥 Joueurs**\n${accounts.length} compte(s) existant(s) — solde inchangé.\n\n*Le salon vocal sera mis à jour automatiquement.*`
    )] });
    await logAdminAction('BANK_INIT', `Banque centrale initialisée à ${formatPrex(amount)}`, interaction.user.username, interaction.user.id, { amount }).catch(console.error);
  } catch (err) {
    console.error('[bankadmin init]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Initialisation échouée.')] });
  }
}

async function handleAddMoney(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('utilisateur', true);
  const amount = interaction.options.getInteger('montant', true);
  const reason = interaction.options.getString('raison', true);
  const check  = validateAndParseAmount(amount);
  if (!check.ok) { await interaction.reply({ embeds: [errorEmbed('Montant invalide', check.error)], ephemeral: true }); return; }
  const rErr = validateReason(reason);
  if (rErr)      { await interaction.reply({ embeds: [errorEmbed('Motif invalide', rErr)], ephemeral: true }); return; }
  if (target.bot){ await interaction.reply({ embeds: [errorEmbed('Erreur', 'Impossible d\'ajouter des fonds à un bot.')], ephemeral: true }); return; }
  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await addMoney(target.id, target.username, check.prex, reason, interaction.user.id);
    if (!result.success || !result.data) { await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur interne.')] }); return; }
    await interaction.editReply({ embeds: [successEmbed('Prex ajoutés', `**+${formatPrex(check.prex)}** ajoutés à <@${target.id}>.\n\n💰 Nouveau solde: **${formatPrex(result.data.balanceAfter)}**\n📝 Motif: ${reason}`)] });
    await notifyAddMoney(target.id, check.prex, result.data.balanceAfter, reason).catch(() => {});
    await logAddMoney(result.data, target.username, interaction.user.username).catch(console.error);
  } catch (err) {
    console.error('[bankadmin addmoney]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Opération échouée.')] });
  }
}

async function handleRemoveMoney(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('utilisateur', true);
  const amount = interaction.options.getInteger('montant', true);
  const reason = interaction.options.getString('raison', true);
  const check  = validateAndParseAmount(amount);
  if (!check.ok) { await interaction.reply({ embeds: [errorEmbed('Montant invalide', check.error)], ephemeral: true }); return; }
  const rErr = validateReason(reason);
  if (rErr)      { await interaction.reply({ embeds: [errorEmbed('Motif invalide', rErr)], ephemeral: true }); return; }
  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await removeMoney(target.id, target.username, check.prex, reason, interaction.user.id);
    if (!result.success || !result.data) { await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur interne.')] }); return; }
    await interaction.editReply({ embeds: [successEmbed('Prex retirés', `**-${formatPrex(check.prex)}** retirés de <@${target.id}>.\n\n💰 Nouveau solde: **${formatPrex(result.data.balanceAfter)}**\n📝 Motif: ${reason}`)] });
    await notifyRemoveMoney(target.id, check.prex, result.data.balanceAfter, reason).catch(() => {});
    await logRemoveMoney(result.data, target.username, interaction.user.username).catch(console.error);
  } catch (err) {
    console.error('[bankadmin removemoney]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Opération échouée.')] });
  }
}

async function handleTransfer(interaction: ChatInputCommandInteraction): Promise<void> {
  const fromUser = interaction.options.getUser('source', true);
  const toUser   = interaction.options.getUser('destination', true);
  const amount   = interaction.options.getInteger('montant', true);
  const reason   = interaction.options.getString('motif', true);
  if (fromUser.id === toUser.id) { await interaction.reply({ embeds: [errorEmbed('Erreur', 'Source et destination identiques.')], ephemeral: true }); return; }
  if (fromUser.bot || toUser.bot){ await interaction.reply({ embeds: [errorEmbed('Erreur', 'Impossible de transférer vers/depuis un bot.')], ephemeral: true }); return; }
  const check = validateAndParseAmount(amount);
  if (!check.ok) { await interaction.reply({ embeds: [errorEmbed('Montant invalide', check.error)], ephemeral: true }); return; }
  const rErr = validateReason(reason);
  if (rErr)      { await interaction.reply({ embeds: [errorEmbed('Motif invalide', rErr)], ephemeral: true }); return; }
  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await transferMoney(fromUser.id, fromUser.username, toUser.id, toUser.username, check.prex, reason, interaction.user.id);
    if (!result.success || !result.data) { await interaction.editReply({ embeds: [errorEmbed('Virement échoué', result.error ?? 'Erreur interne.')] }); return; }
    const { txOut, txIn } = result.data;
    await interaction.editReply({ embeds: [successEmbed('Virement effectué', `**${formatPrex(check.prex)}** virés de <@${fromUser.id}> vers <@${toUser.id}>.\n\n📋 Motif: ${reason}\n📊 Solde source: **${formatPrex(txOut.balanceAfter)}**`)] });
    await notifyTransferSent(fromUser.id, check.prex, txOut.balanceAfter, toUser.username, reason).catch(() => {});
    await notifyTransferReceived(toUser.id, check.prex, txIn.balanceAfter, fromUser.username, reason).catch(() => {});
    await logTransfer(txOut, fromUser.username, toUser.username, interaction.user.username, reason).catch(console.error);
  } catch (err) {
    console.error('[bankadmin transfer]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Virement échoué.')] });
  }
}

async function handleLogs(interaction: ChatInputCommandInteraction): Promise<void> {
  const limit = interaction.options.getInteger('limite') ?? 10;
  await interaction.deferReply({ ephemeral: true });
  try {
    const logs   = await getRecentLogs(limit);
    if (logs.length === 0) { await interaction.editReply({ embeds: [infoEmbed('Logs', 'Aucun log enregistré.')] }); return; }
    const levelEmoji: Record<string, string> = { INFO: '🟢', WARN: '🟡', ERROR: '🔴', CRITICAL: '🚨' };
    const lines = logs.map(log => {
      const emoji = levelEmoji[log.level] ?? '⚪';
      const time  = `<t:${Math.floor(log.timestamp / 1000)}:R>`;
      return `${emoji} **${log.action}** ${time}\n┗ ${log.description.slice(0, 80)}`;
    }).join('\n\n');
    await interaction.editReply({ embeds: [new EmbedBuilder().setColor(Colors.DARK).setTitle(`📜 Logs système — ${logs.length} derniers`).setDescription(lines).setFooter({ text: 'KT Banque' }).setTimestamp()] });
  } catch (err) {
    console.error('[bankadmin logs]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Impossible de charger les logs.')] });
  }
}

async function handleSetVocal(interaction: ChatInputCommandInteraction): Promise<void> {
  const channel = interaction.options.getChannel('salon', true);
  await interaction.deferReply({ ephemeral: true });
  try {
    await setVoiceChannelId(channel.id);
    const reserve = await getCentralReserve();
    await interaction.editReply({ embeds: [successEmbed('Salon vocal configuré', `Le salon <#${channel.id}> affichera la réserve centrale.\n\n🏦 Réserve actuelle: **${formatPrex(reserve)}**`)] });
    await logAdminAction('SET_VOCAL', `Salon vocal économie configuré: ${channel.id}`, interaction.user.username, interaction.user.id).catch(console.error);
  } catch (err) {
    console.error('[bankadmin setvocal]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur', 'Configuration échouée.')] });
  }
}

async function handleDeposit(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('utilisateur', true);
  const amount = interaction.options.getInteger('montant', true);
  const reason = interaction.options.getString('raison', true);
  const check  = validateAndParseAmount(amount);
  if (!check.ok) { await interaction.reply({ embeds: [errorEmbed('Montant invalide', check.error)], ephemeral: true }); return; }
  const rErr = validateReason(reason);
  if (rErr)      { await interaction.reply({ embeds: [errorEmbed('Motif invalide', rErr)], ephemeral: true }); return; }
  if (target.bot){ await interaction.reply({ embeds: [errorEmbed('Erreur', 'Impossible de débiter un bot.')], ephemeral: true }); return; }
  await interaction.deferReply({ ephemeral: true });
  try {
    const result = await removeMoney(target.id, target.username, check.prex, `Dépôt banque centrale — ${reason}`, interaction.user.id);
    if (!result.success || !result.data) { await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur interne.')] }); return; }
    const newReserve = await adjustCentralReserve(check.prex);
    await interaction.editReply({ embeds: [successEmbed('🏦 Dépôt Banque Centrale',
      `**-${formatPrex(check.prex)}** retirés de <@${target.id}> et versés à la Banque Centrale.\n\n` +
      `👤 Nouveau solde joueur: **${formatPrex(result.data.balanceAfter)}**\n` +
      `🏦 Nouvelle réserve centrale: **${formatPrex(newReserve)}**\n📝 Motif: ${reason}`
    )] });
    await notifyRemoveMoney(target.id, check.prex, result.data.balanceAfter, `Dépôt banque centrale — ${reason}`).catch(() => {});
    await logAdminAction('CENTRAL_DEPOSIT', `${interaction.user.username} a déposé ${formatPrex(check.prex)} de ${target.username} vers la BC (réserve: ${formatPrex(newReserve)})`, interaction.user.username, interaction.user.id, { targetId: target.id, amount: check.prex, newReserve, reason }).catch(console.error);
  } catch (err) {
    console.error('[bankadmin deposit]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Dépôt échoué.')] });
  }
}

async function handleWithdraw(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser('utilisateur', true);
  const amount = interaction.options.getInteger('montant', true);
  const reason = interaction.options.getString('raison', true);
  const check  = validateAndParseAmount(amount);
  if (!check.ok) { await interaction.reply({ embeds: [errorEmbed('Montant invalide', check.error)], ephemeral: true }); return; }
  const rErr = validateReason(reason);
  if (rErr)      { await interaction.reply({ embeds: [errorEmbed('Motif invalide', rErr)], ephemeral: true }); return; }
  if (target.bot){ await interaction.reply({ embeds: [errorEmbed('Erreur', 'Impossible de créditer un bot.')], ephemeral: true }); return; }
  await interaction.deferReply({ ephemeral: true });
  try {
    const currentReserve = await getCentralReserve();
    if (currentReserve < check.prex) {
      await interaction.editReply({ embeds: [errorEmbed('Réserve insuffisante', `La Banque Centrale ne dispose que de **${formatPrex(currentReserve)}**.\nDemandé: **${formatPrex(check.prex)}**`)] });
      return;
    }
    const newReserve = await adjustCentralReserve(-check.prex);
    const result = await addMoney(target.id, target.username, check.prex, `Retrait banque centrale — ${reason}`, interaction.user.id);
    if (!result.success || !result.data) {
      await adjustCentralReserve(check.prex); // rollback
      await interaction.editReply({ embeds: [errorEmbed('Échec', result.error ?? 'Erreur interne. Réserve restaurée.')] });
      return;
    }
    await interaction.editReply({ embeds: [successEmbed('🏦 Retrait Banque Centrale',
      `**+${formatPrex(check.prex)}** retirés de la Banque Centrale et versés à <@${target.id}>.\n\n` +
      `👤 Nouveau solde joueur: **${formatPrex(result.data.balanceAfter)}**\n` +
      `🏦 Nouvelle réserve centrale: **${formatPrex(newReserve)}**\n📝 Motif: ${reason}`
    )] });
    await notifyAddMoney(target.id, check.prex, result.data.balanceAfter, `Retrait banque centrale — ${reason}`).catch(() => {});
    await logAdminAction('CENTRAL_WITHDRAW', `${interaction.user.username} a retiré ${formatPrex(check.prex)} de la BC vers ${target.username} (réserve: ${formatPrex(newReserve)})`, interaction.user.username, interaction.user.id, { targetId: target.id, amount: check.prex, newReserve, reason }).catch(console.error);
  } catch (err) {
    console.error('[bankadmin withdraw]', err);
    await interaction.editReply({ embeds: [errorEmbed('Erreur critique', 'Retrait échoué.')] });
  }
}
