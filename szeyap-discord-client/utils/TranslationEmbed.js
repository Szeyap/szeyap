const { EmbedBuilder } = require('discord.js');

// The bot's avatar URL, looked up lazily at render time. This must not
// be required at module load time: TranslationEmbed is loaded by the
// command files, which are loaded by index.js, so a top-level
// require('../index.js') here is circular — it re-runs index.js (and
// client.login()) while the commands are still loading. Only use the
// already-loaded index.js module when the bot itself loaded it; when
// this file is loaded standalone (deploy-commands, tests) there is no
// logged-in client yet, so the footer simply has no icon.
function botAvatarURL() {
  const loaded = require.cache[require.resolve('../index.js')];
  if (!loaded) {
    return undefined;
  }
  const client = loaded.exports && loaded.exports.client;
  return client && client.user ? client.user.avatarURL() : undefined;
}

function wrapText(string, max, delim='\n') {
  const words = string.split(' ');
  let curr = '';
  let lines = [];
  for (let i = 0; i < words.length; i++) {
    if (curr.length + words[i].length + 1 <= max) {
      curr += words[i] + ' ';
    } else {
      lines.push(curr);
      curr = words[i] + ' ';
    }
  }
  lines.push(curr);
  return lines.join(delim);
}

class NoResultsEmbed {

  constructor({ phrase, metadata }) {
    this.title = `No results for '**${phrase}**'`;
    this.desc = `We couldn't find anything in [${metadata.dictionary_name}'s dictionary](${metadata.dictionary_url}) for the query '**${phrase}**'`;
    this.gifs = [
      'https://gifdb.com/images/high/cartoon-cat-chasing-a-mouse-3n44wd968nqn6am0.gif',
      'https://i.pinimg.com/originals/b3/ae/92/b3ae9223e62976d363ca91999688d7b9.gif',
      'https://media3.giphy.com/media/xKUD3rSTA6haw/giphy.gif?cid=6c09b95260nptpujhru8u4wt0g9zg18zo4i6ylh487eenoh7&ep=v1_internal_gif_by_id&rid=giphy.gif&ct=g'
    ]
  }

  _pick_random_gif() {
    return this.gifs[Math.floor(Math.random() * this.gifs.length)];
  }

  render() {
    return new EmbedBuilder()
      .setColor([205,215,175])
      .setTitle(this.title)
      .setDescription(this.desc)
      .setImage(this._pick_random_gif())
      .setTimestamp()
      // .setFooter({ text: "", iconURL: botAvatarURL() });
  }
}

class TranslationEmbed {

    /**
     * @param {String} title The title of the embed
     * @param {Array<Object>} fields An array of objects each with keys 'field_title' and 'field_value'
     */
    constructor({ title, desc, footer, fields }) {
      this.title = title;
      this.desc = desc;
      this.footer = footer
      this.fields = fields;
      this.selFld = 0;
      this.nFields = fields.length;
    }

    selectDown() {
      this.selFld = this.selFld + 1 % this.nFields;
      return this.render();
    }
    
    selectUp() {
      this.selFld = (this.selFld - 1 + this.nFields) % this.nFields;
      return this.render();
    }

    render() {
      // const field_desc = "__**不知好歹 būt jï hāo āi**__\n> not know good from bad; can't tell chalk from cheese; not know kindness from malice.⁶"
      const footer = { text: this.footer };
      const avatarURL = botAvatarURL();
      if (avatarURL) {
        footer.iconURL = avatarURL;
      }
      return new EmbedBuilder()
        .setColor([205,215,175])
        .setTitle(this.title)
        .setDescription(this.desc + "\n\u200B")
        .addFields(this.fields.map(({ fieldTitle, description }, i) => {
          fieldTitle = fieldTitle.replaceAll('`', '\u00a0\u0300 ');
          if (i == this.selFld) {
            return { name: `__**${fieldTitle}**__`, value: `>>> \`\`\`fix\n${description}\`\`\`` };
          } else {
            return { name: fieldTitle, value: `\`\`\`${description}\`\`\``};
          }
        }))
        .setTimestamp()
        .setFooter(footer);
    }

    renderAsText() {
      return `## ${this.title}
${this.desc}

${this.fields.map(({ fieldTitle, description }, i) => {
  if (i == this.selFld) {
    return `__**${fieldTitle}**__\n> ${description}`;
  } else {
    return `**${fieldTitle}**\n> ${description}`;
  }
}).join('\n\n')}
`
    }
}

module.exports = { TranslationEmbed, NoResultsEmbed };