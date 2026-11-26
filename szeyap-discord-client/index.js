
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, Events, GatewayIntentBits } = require('discord.js');
require('dotenv').config();
const logger = require('./logging/logger.js');

const client = new Client({ intents: [] });
client.commands = new Collection();

client.once(Events.ClientReady, readyClient => {
	logger.info(`Ready! Logged in as ${readyClient.user.tag}`);
});

const folderOfCommands = path.join(__dirname, 'commands');

fs.readdirSync(folderOfCommands, { recursive: true }).forEach(file => {
  const fullFilePath = path.join(folderOfCommands, file);
  const command = require(fullFilePath);

  if (['data', 'execute'].every(prop => command.hasOwnProperty(prop))) {
    client.commands.set(command.data.name, command);
  } else {
    logger.error(`[WARNING] The command at ${fullFilePath} is missing a required "data" or "execute" property.`);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    logger.warn(`Received command ${interaction.commandName} not found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    logger.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
    }
  }
});

if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN must be set (see .env.example).');
  process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
  logger.error(`Failed to log in to Discord: ${error.message}`);
  process.exit(1);
});

module.exports.client = client;