const { SlashCommandBuilder, CommandInteraction, ActionRowBuilder, createMessageComponentCollector, ComponentType } = require('discord.js');
const axios = require('axios').default;
const { API_ENDPOINT, RESULTS_PER_PAGE } = require('../config');
const logger = require('../logging/logger');

const { Pagination } = require('../utils/Pagination');
const { TranslationEmbed } = require('../utils/TranslationEmbed');
const { wasd, reportErr, reportModal, toggleTxt } = require('../utils/ComponentHelpers');

function combineDisplayChinese(prefRomanization, { traditional, simplified, penyim, jyutping }) {
  const zipped = traditional.map((_, i) => [traditional[i], simplified[i], penyim[i], jyutping[i]]);

  return zipped.map(([trad, simp, pen, jyut]) => {
    let display = simp;
    display += trad ? `[${trad}]` : ''; 
    display += jyut ? ` ${jyut[prefRomanization]}` : '';
    return display;
  }).join(' or ');
}

function groupByN(arr, n) {
  return arr.reduce((r, e, i) =>
    (i % n ? r[r.length - 1].push(e) : r.push([e])) && r
  , []);
}

function calcNPages(arr) {
  return Math.ceil(arr.length / RESULTS_PER_PAGE);
}

function getNthGrp(arr, n) {
  return arr.slice(n * RESULTS_PER_PAGE, Math.min((n + 1) * RESULTS_PER_PAGE, arr.length));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('translate')
    .setDescription('Translate a message to a specified language.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('The message to translate.')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('dictionary')
        .setDescription('Select dictionary to search in.')
        .addChoices([
          { name: 'Stephen Li', value: 'SL_DICT' },
          { name: 'Gene Chin', value: 'GC_DICT' }
        ])
        .setRequired(false)),
  /**
   * @param {CommandInteraction} interaction
   */
  async execute(interaction) {
    const message = interaction.options.getString('message');
    const dictionary = interaction.options.getString('dictionary');
    await interaction.deferReply();

    // ask api
    const response = await axios.get(`${API_ENDPOINT}/translation`, {
      params: {
        phrase: message,
        src_lang: 'UNK',
        dictionary: dictionary ?? 'SL_DICT'
      }
    });

    const state = {
      isEmbed: true,
      prefRomanization: 'GC'
    };

    if (response.status !== 200) {
      logger.error(`Error while fetching translation data: ${response.status}`);
      await interaction.editReply('There was an error while fetching the translation data.');
      return;
    }

    const { data } = response;

    const nPages = calcNPages(data.translations);

    const pagination = new Pagination(interaction, data, nPages, (data, i) => {
      const embFields = getNthGrp(data.translations, i).map((trnsln) => ({
          fieldTitle: combineDisplayChinese(state.prefRomanization, trnsln.chinese),
          description: trnsln.english
      }));

      return new TranslationEmbed({
        title: `Query: *${data.original_phrase}*`, 
        desc: `searching [${data.metadata.dictionary_name}](${data.metadata.dictionary_url}) dictionary`, 
        footer: `Page ${i+1} of ${nPages}`, 
        fields: embFields
      });
    });

    
    // function to call to create components
    // we make it callable so that it can dynamically change
    // when the state updates
    const components = () => [
      new ActionRowBuilder().addComponents(...wasd()),
      new ActionRowBuilder().addComponents(reportErr(), toggleTxt(state.isEmbed))
    ];

    const answer = await interaction.editReply({ 
      embeds: [pagination.render()],
      components: components()
    });

    const btnCollect = answer.createMessageComponentCollector({ componentType: ComponentType.Button, time: 120000 });

    btnCollect.on('collect', async (i) => {
      const [group, action] = i.customId.split('.');
      if (group === 'wasd') {
        await i.update({
          content: '',
          embeds: [pagination.update(action)],
          components: components()
        });
      } else if (group === 'toggle_txt') {
        state.isEmbed = action === 'to_embed';
        if (state.isEmbed) {
          await i.update({
            content: '',
            embeds: [pagination.keep()],
            components: components()
          });
        } else {
          await i.update({
            content: pagination.keepAsText(),
            components: components(),
            embeds: [],
          })
        }
      } else if (group === 'report_error') {
        if (action === 'open') {
          await i.showModal(reportModal());
          i.awaitModalSubmit({ time: 60_000 }).then(i => {
            i.reply({ content: `<@${i.user.id}> thanks for reporting!`, ephemeral: true });
            // api make post req to report error
          }).catch(err => logger.warn(`Error while waiting for modal submit: ${err}`));
        } else {
          logger.warn(`Unknown group.action: ${group}.${action}`);
        }
      }
    });
  }
}