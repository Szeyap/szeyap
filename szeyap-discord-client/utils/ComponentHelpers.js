const { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

// =====================================================================
// All custom Ids have the format group.action for easy identification
// =====================================================================

function wasd() {
  const next = new ButtonBuilder()
    .setCustomId('wasd.next')
    .setLabel('前 \u25b6')
    .setStyle(ButtonStyle.Primary);
  const prev = new ButtonBuilder()
    .setCustomId('wasd.prev')
    .setLabel('\u25c0 後')
    .setStyle(ButtonStyle.Primary);
  const up = new ButtonBuilder()
    .setCustomId('wasd.up')
    .setLabel('\u25b2 上')
    .setStyle(ButtonStyle.Primary);
  const down = new ButtonBuilder()
    .setCustomId('wasd.down')
    .setLabel('下 \u25bc')
    .setStyle(ButtonStyle.Primary);

  return [prev, up, down, next];
}

function toggleTxt(isEmbed) {
  const toggleEmbedText = new ButtonBuilder()
    .setCustomId(isEmbed ? 'toggle_txt.to_text' : 'toggle_txt.to_embed')
    .setLabel(isEmbed ? '\u21c6 to copyable text' : '\u21c6 to embed')
    .setStyle(ButtonStyle.Secondary);
  return toggleEmbedText;
}

function reportErr() {
  const reportError = new ButtonBuilder()
    .setCustomId('report_error.open')
    .setLabel('Report Error in translation')
    .setStyle(ButtonStyle.Danger);
  return reportError;
}

function reportModal() {
  const description = new TextInputBuilder()
    .setCustomId('report_error.description')
    .setPlaceholder('Enter a description of the error')
    .setLabel('Description')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1_000)
    .setMinLength(10);
  const reportModal = new ModalBuilder()
    .setTitle('Report Translation Error')
    .setCustomId('report_error.modal')
    .addComponents(new ActionRowBuilder().addComponents(description))
  return reportModal;
}

module.exports = {
  wasd,
  reportErr,
  reportModal,
  toggleTxt
}