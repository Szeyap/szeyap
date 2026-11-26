# Szeyap Discord bot — port notes (`bot-port-live-backend`)

Branch prepared 26 Nov 2026 on `Szeyap/szeyap`, off `main` (`26dcae8`).
Read-only review first, then these changes. Nothing here is merged;
Evan reviews this branch and moves it into `schan27/szeyap` manually.

## What this branch does

Points the Discord bot (which only ever lived in this org repo, in
`szeyap-discord-client/`) at the **live** backend from the
`schan27/szeyap` fork, `https://szeyap-backend-production.up.railway.app`,
and fixes the bugs that stopped the bot from loading, deploying, or
running under Compose. The original prod backend
(`szeyap-api-production.up.railway.app`) is dead — it returns 404.

## Changes, commit by commit

1. `bot: point API at live fork backend via API_BASE_URL` (`config.js`)
   - Prod endpoint is now `https://szeyap-backend-production.up.railway.app/api`,
     overridable with an `API_BASE_URL` env var; dev still uses
     `http://szeyap-api:8000`. The URL is defined in one place only.
   - Also declares the previously implicit globals with `const`.
2. `bot: add .env.example documenting required secrets`
   - `DISCORD_TOKEN`, `APPLICATION_ID`, `DEV_GUILD_ID`, `API_BASE_URL`,
     `NODE_ENV`, `DEPLOY_GLOBAL`, `LOG_LEVEL`. No real secrets anywhere;
     `.env` was already gitignored.
3. `bot: fix deploy-commands crash and add global deploy option`
   (`deploy-commands.js`)
   - It referenced `logger` without importing it, so a malformed command
     file crashed with a `ReferenceError`. The logger is now imported,
     each command load is guarded, non-`.js` files are skipped, and the
     debug dump of every loaded command is gone.
   - Fails fast with a clear message when `DISCORD_TOKEN` /
     `APPLICATION_ID` / `DEV_GUILD_ID` are missing, and supports
     `DEPLOY_GLOBAL=true` for global registration (guild-only is still
     the default).
4. `bot: search both dictionaries by default, use live API params`
   (`commands/translate.js`)
   - `/translate` now offers "Both dictionaries" (`ALL_DICT`) and defaults
     to it, and sends `language=unk` instead of the old `src_lang=UNK`
     (the fork API ignores `src_lang`). Verified against the live
     backend — both the old- and new-style calls return 200.
   - Also fixes a real precedence bug: the old default-romanization
     expression always resolved to `'GC'` whenever the user picked any
     romanization system.
5. `bot: move Docker base image to Node 22 LTS` (`Dockerfile`)
   - `node:21.1-alpine` is end-of-life; Node 22 is the LTS.
6. `bot: break circular import that crashed command loading`
   (`utils/TranslationEmbed.js`, `index.js`)
   - `TranslationEmbed.js` required `../index.js` at load time for the bot
     avatar URL, but `index.js` loads the command files, which load
     `TranslationEmbed` — so requiring any command re-ran `index.js` and
     `client.login()`. Without a valid token that died as an unhandled
     `TokenInvalid` rejection (and, mid-load, `translate.js` looked as if
     it had no `data`/`execute`). The avatar is now read only from the
     already-loaded `index.js` module at render time; standalone loads
     simply omit the footer icon.
   - `index.js` now fails fast with a clear message instead of an
     unhandled rejection when `DISCORD_TOKEN` is missing or login fails.
7. `bot: update dependencies to latest compatible versions`
   - discord.js 14.15.3 → 14.28.1, axios 1.7.4 → 1.21.1,
     dotenv 16.4.5 → 16.6.1, winston 3.14.2 → 3.19.0. Same majors
     throughout; dotenv was deliberately kept on v16 (v17/v18 are major
     upgrades and were not needed).
8. `compose: fix prod API command and wire up the bot service`
   (`docker-compose.yml`, `docker-compose.dev.yml`)
   - Prod API command used module `api:app`, which does not exist; the
     API Dockerfile itself uses `szeyapapi.api:app`.
   - Adds the bot as a prod Compose service (`npm start`, restart
     `unless-stopped`) with `DISCORD_TOKEN` / `APPLICATION_ID` /
     `DEV_GUILD_ID` / `API_BASE_URL` passed through, and passes the same
     variables to the bot in the dev file (it previously set only
     `NODE_ENV`, so the bot could never log in under Compose).

## Deliberately left out

- **Prod web build is still broken, and untouched.** `docker-compose.yml`
  references `szeyap-web-client/Dockerfile.prod`, which does not exist in
  this repo — the org web client has no Dockerfile at all. That is a
  web-client fix, not a bot fix; in the fork the web client has a real
  `Dockerfile`, so this resolves itself on the move.
- **No new features.** `/help` is still a stub, the report button still
  goes nowhere (there is no report endpoint), and there are still no user
  accounts, server stats, practice game, or stroke-order command. Those
  are follow-up work, not port work.
- **No refactoring for style.** Only what was broken or directly in the
  way was changed. (One thing noticed and left alone: the dev Compose API
  command runs `python src/szeyapapi/api.py` while the API is a Connexion
  app — out of scope here.)
- **No `Dockerfile` `COPY` fix was needed.** An early read suggested
  `COPY . ./node_modules`; that was the `.gitignore` contents bleeding
  into the output — the Dockerfile correctly does `COPY . ./`.

## Test results (26 Nov 2026)

- `node --check` passes on every bot JS file.
- Fresh `npm install` works; installed versions confirmed:
  discord.js 14.28.1, axios 1.21.1, dotenv 16.6.1, winston 3.19.0.
- Live backend (curl, verified 26 Nov): new-style
  `/api/translation?phrase=cats&language=unk&dictionary=ALL_DICT`
  returns 200 with results; old-style (`src_lang=UNK`,
  `SL_DICT`) also returns 200; `GC_DICT` returns 200; the old prod
  backend returns 404.
  - Note: one axios run from this sandbox failed with a TLS
    `ECONNRESET` before connecting; the same request via curl worked
    immediately before and after, so that was sandbox egress flakiness,
    not the API or the code.
- `require('./commands/translate.js')` standalone (no token): loads,
  `/translate` offers `ALL_DICT, SL_DICT, GC_DICT`; both embed types
  render without a token.
- `node index.js` with no token: clean exit 1 with
  "DISCORD_TOKEN must be set (see .env.example)."
- `node deploy-commands.js` with no env: loads both commands, then
  clean exit 1 with the missing-secrets message. With a dummy token
  and no guild: clean exit 1 asking for `DEV_GUILD_ID` or
  `DEPLOY_GLOBAL=true`.
- Compose files parse as valid YAML. No Docker binary exists in this
  sandbox, so `docker compose config` / a container build could **not**
  be run here — run `docker compose config` before deploying.
- **Not tested:** a live Discord login or a real `/translate`
  interaction (no Discord token was available, and none was created).
  `deploy-commands` against Discord's API with a dummy token hung
  past 20 s in this sandbox (Discord's API is not reliably reachable
  from here), so the actual command registration still needs to be
  run once with a real token: `npm run deploy_commands`.

## How to review and move this to the fork

1. Review the branch: `git fetch origin && git checkout bot-port-live-backend`
   (or open the compare view against `main`).
2. The bot changes are all under `szeyap-discord-client/` plus the two
   Compose files. The fork's `szeyap-discord-client/` does not exist, so
   the bot directory can be copied over as-is; the Compose changes need
   care — the fork's Compose files differ (the fork's web client has a
   real `Dockerfile`, and its API service may already be fixed), so
   cherry-pick or hand-apply the API-command fix and the bot service
   rather than copying the whole file.
3. In the fork, create `.env` from `szeyap-discord-client/.env.example`
   with the real Discord token/app ID/guild ID. Never commit `.env`.
4. `cd szeyap-discord-client && npm install && npm run deploy_commands`
   (or `DEPLOY_GLOBAL=true npm run deploy_commands` for a global
   registration), then `npm start` and try `/translate cats` in Discord.
5. If the bot will run on Railway rather than Compose, the bot needs its
   own Railway service with the same env vars; this branch does not add
   any Railway config.
