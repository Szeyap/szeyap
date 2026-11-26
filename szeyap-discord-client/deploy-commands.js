const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');

require('dotenv').config();

const logger = require('./logging/logger');

const commands = [];

const folderOfCommands = path.join(__dirname, 'commands');

fs.readdirSync(folderOfCommands, { recursive: true }).forEach(file => {
  const fullFilePath = path.join(folderOfCommands, file);
  if (!fullFilePath.endsWith('.js')) {
    return;
  }

  let command;
  try {
    command = require(fullFilePath);
  } catch (error) {
    logger.error(`Skipping command at ${fullFilePath}: failed to load (${error.message}).`);
    return;
  }

  if ('data' in command && 'execute' in command) {
    commands.push(command.data.toJSON());
  } else {
    logger.error(`[WARNING] The command at ${fullFilePath} is missing a required "data" or "execute" property.`);
  }
});

// Construct and prepare an instance of the REST module
if (!process.env.DISCORD_TOKEN || !process.env.APPLICATION_ID) {
  logger.error('DISCORD_TOKEN and APPLICATION_ID must be set (see .env.example).');
  process.exit(1);
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Deploy commands: guild-only by default for fast iteration in development.
// Set DEPLOY_GLOBAL=true to register globally instead (can take up to an
// hour to propagate); DEV_GUILD_ID is not needed in that case.
const deployGlobal = process.env.DEPLOY_GLOBAL === 'true';
if (!deployGlobal && !process.env.DEV_GUILD_ID) {
  logger.error('DEV_GUILD_ID must be set for guild command registration (see .env.example), or set DEPLOY_GLOBAL=true.');
  process.exit(1);
}

// and deploy your commands!
(async () => {
  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);

    // The put method is used to fully refresh all commands in the guild with the current set
    const route = deployGlobal
      ? Routes.applicationCommands(process.env.APPLICATION_ID)
      : Routes.applicationGuildCommands(process.env.APPLICATION_ID, process.env.DEV_GUILD_ID);
    const data = await rest.put(route, { body: commands });

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
    process.exit(1);
  }
})();
